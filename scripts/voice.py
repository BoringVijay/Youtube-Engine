#!/usr/bin/env python3
"""Voice v2: performance pass (acting tags, his words kept), whole-section takes, word-level timing."""
import base64, difflib, json, os, re, subprocess, wave

import gai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "voice.json")))
TAGS = ["cheerfully", "warmly", "thoughtfully", "excitedly", "seriously", "whispering", "softly", "sarcastically", "deadpan",
        "laughing", "soft laugh", "sighs", "uhm", "short pause", "long pause", "gasps", "slowly", "fast"]

PROFILE = """# AUDIO PROFILE: Curious Penguin narrator
### DIRECTOR'S NOTES
Style: {STYLE}
{ACCENT}
This part: {MOOD}
#### TRANSCRIPT
{TRANSCRIPT}"""


def norm(w):
    return re.sub(r"[^a-z0-9%]+", "", w.lower())


def strip_tags(t):
    return re.sub(r"\s+", " ", re.sub(r"\[[a-z ]+\]", " ", t)).strip()


def performance(st, short=False, delivery=None):
    """Split into sections by mood (one take for a Short) and add acting tags without changing the words."""
    beats = [re.sub(r"\[[a-z ]+\]", "", b.get("vo", "")).strip() for b in st["brew"]["script"].get("beats", [])]
    prompt = f"""You are a voice director preparing a script for an expressive TTS actor that understands inline audio tags.
{"Keep all beats in ONE section: it is a 55-second Short recorded in a single take." if short else "Group these consecutive beats into 2 to 5 sections where the mood changes (each section at most 550 words)."}
For each section write the performance transcript: the SAME words as the beats, in order, adding only:
- inline audio tags from this list where they genuinely help: {TAGS} (written like [sighs]); {("at most 3 or 4 tags in total, mostly [short pause] before reveals; " + (f"the delivery follows this direction: {delivery}" if delivery else "the delivery is cool and nonchalant, not theatrical")) if short else "about one tag every 20 to 30 words, never stacked, never on every sentence"};
- punctuation that guides delivery (commas between tagged clauses, question marks, ellipses for a real pause);
- at most one tiny filler ("okay", "like", "honestly") per 60 words if it makes it sound spoken.
Do NOT add, remove or reword anything else. Spell numbers the way they are spoken.
Also give each section a one-line mood direction for the actor (energy, pace, emotion).
Beats: {json.dumps([{"i": i, "vo": v} for i, v in enumerate(beats)], ensure_ascii=False)}
Return JSON: {{"sections": [{{"beats": [0, 1], "mood": "", "transcript": ""}}]}}"""
    try:
        d = gai.ask_json(prompt, kind="text", temperature=0.5)
        secs = []
        seen = set()
        for s in d.get("sections", []):
            ids = [int(x) for x in s.get("beats", []) if str(x).isdigit() and int(x) < len(beats) and int(x) not in seen]
            if not ids:
                continue
            orig = " ".join(beats[i] for i in ids)
            got = strip_tags(s.get("transcript", ""))
            ratio = difflib.SequenceMatcher(None, [norm(w) for w in orig.split()], [norm(w) for w in got.split()]).ratio()
            if ratio < 0.88:
                print(f"[voice] section {ids} drifted from the script (match {ratio:.2f}); using the script text", flush=True)
                s["transcript"] = orig
            seen.update(ids)
            secs.append({"beats": ids, "mood": s.get("mood", ""), "transcript": s["transcript"]})
        missing = [i for i in range(len(beats)) if i not in seen]
        for i in missing:
            secs.append({"beats": [i], "mood": "", "transcript": beats[i]})
        secs.sort(key=lambda s: s["beats"][0])
        return secs
    except Exception as e:
        print("[voice] performance pass failed, using plain script:", str(e)[:200], flush=True)
        out, cur = [], []
        for i, b in enumerate(beats):
            cur.append(i)
            if sum(len(beats[j].split()) for j in cur) > 400:
                out.append({"beats": cur, "mood": "", "transcript": " ".join(beats[j] for j in cur)}); cur = []
        if cur:
            out.append({"beats": cur, "mood": "", "transcript": " ".join(beats[j] for j in cur)})
        return out


def tts_take(text, mood, voice):
    accent = CFG.get("accent", "")
    prompt = (PROFILE.replace("{STYLE}", CFG.get("style", "Warm, conversational, engaging.")).replace("{ACCENT}", f"Accent: {accent}" if accent else "")
              .replace("{MOOD}", mood or "follow the transcript").replace("{TRANSCRIPT}", text))
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    out, model = gai.generate_any("tts", body, timeout=300)
    part = gai.first_inline(out)
    raw = base64.b64decode(part["data"])
    mime = part.get("mimeType", "")
    if "wav" in mime or raw[:4] == b"RIFF":
        import io
        with wave.open(io.BytesIO(raw)) as w:
            return w.readframes(w.getnframes()), w.getframerate(), model
    m = re.search(r"rate=(\d+)", mime)
    return raw, int(m.group(1)) if m else 24000, model


def record(st, vdir, sections, voice):
    """One take per section, joined with short air. Returns (mp3 path, total seconds, section offsets)."""
    os.makedirs(vdir, exist_ok=True)
    pcm_all, rate, offsets, models = b"", 24000, [], []
    for k, s in enumerate(sections):
        cache = os.path.join(vdir, f"take{k:02d}.wav")
        if os.path.exists(cache):
            with wave.open(cache) as w:
                pcm, rate = w.readframes(w.getnframes()), w.getframerate()
        else:
            pcm, rate, model = tts_take(s["transcript"], s.get("mood", ""), voice)
            models.append(model)
            with wave.open(cache, "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
            print(f"[voice] take {k + 1}/{len(sections)} recorded: {len(pcm) / 2 / rate:.1f}s", flush=True)
        offsets.append(len(pcm_all) / 2 / rate)
        pcm_all += pcm + b"\x00\x00" * int(rate * 0.45)
    full = os.path.join(vdir, "full.wav")
    with wave.open(full, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm_all)
    mp3 = os.path.join(vdir, "voice.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", full, "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", "44100", "-b:a", "128k", mp3], check=True)
    return mp3, len(pcm_all) / 2 / rate, offsets, models


def align(audio_path, sections):
    """Word timings for the script's own words using faster-whisper, mapped by sequence alignment."""
    import numpy as np
    from faster_whisper import WhisperModel
    # decode ourselves (16 kHz mono float32) so PyAV version quirks can't break timing
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio_path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    model = WhisperModel(os.environ.get("WHISPER_MODEL", "base.en"), device="cpu", compute_type="int8")
    segs, _ = model.transcribe(audio, word_timestamps=True, vad_filter=False, beam_size=1)
    heard = [(w.word.strip(), w.start, w.end) for seg in segs for w in (seg.words or [])]
    script_words = [w for s in sections for w in strip_tags(s["transcript"]).split()]
    a = [norm(w) for w in script_words]
    b = [norm(w[0]) for w in heard]
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    times = [None] * len(a)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            times[blk.a + k] = (heard[blk.b + k][1], heard[blk.b + k][2])
    # fill gaps by interpolation
    known = [i for i, t in enumerate(times) if t]
    if not known:
        raise RuntimeError("alignment failed: no words matched")
    for i in range(len(times)):
        if times[i]:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        if prev is None:
            t = times[nxt][0]; times[i] = (max(0, t - 0.3 * (nxt - i)), max(0.05, t - 0.3 * (nxt - i) + 0.25))
        elif nxt is None:
            t = times[prev][1]; times[i] = (t + 0.25 * (i - prev - 1), t + 0.25 * (i - prev))
        else:
            t0, t1 = times[prev][1], times[nxt][0]
            step = (t1 - t0) / (nxt - prev)
            times[i] = (t0 + step * (i - prev - 1), t0 + step * (i - prev))
    matched = len(known) / max(1, len(a))
    print(f"[voice] alignment matched {matched:.0%} of words", flush=True)
    return [{"w": w, "t0": round(t[0], 3), "t1": round(t[1], 3)} for w, t in zip(script_words, times)], matched


def cue_time(words, cue, after=0.0):
    """Time of the first occurrence of the cue words at or after `after` seconds."""
    c = [norm(x) for x in (cue or "").split() if norm(x)][:5]
    if not c:
        return None
    seq = [norm(w["w"]) for w in words]
    best = None
    for i in range(len(seq) - len(c) + 1):
        if words[i]["t0"] + 0.01 < after:
            continue
        score = sum(1 for k in range(len(c)) if seq[i + k] == c[k])
        if score == len(c):
            return words[i]["t0"]
        if score >= max(2, len(c) - 1) and best is None:
            best = words[i]["t0"]
    return best
