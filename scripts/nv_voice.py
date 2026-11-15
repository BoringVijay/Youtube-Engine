#!/usr/bin/env python3
"""Nvidia videos: voice audition and per-line narration (ElevenLabs on fal, run in GitHub Actions where FAL_KEY lives).

  nv_voice.py audition            -> rick/projects/nvidia/audition/<Voice>_<model>.mp3 + audition.json (pace, pitch, spread)
  nv_voice.py make A|B Voice v2   -> rick/stage2/public/nva|nvb/{voice.mp3,words.json,lines.json}

make reads one TTS call per script line, trims each take's silence, joins them with set gaps (so every line has a known start and
end for the shot timeline), then faster-whisper gives per-word times for captions.
"""
import difflib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import budget, fal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.join(ROOT, "rick", "projects", "nvidia")
JOB = "nvidia"
MODELS = {"v3": "fal-ai/elevenlabs/tts/eleven-v3", "v2": "fal-ai/elevenlabs/tts/multilingual-v2"}
AUDITION = ("Imagine you're the most searched name on the planet. The boss of the world's most powerful company just quit. "
            "And everyone thinks it's because of you. Your name is Alice Huang. No relation. "
            "Months later, a quiet little Singapore company gets a new name. Megaspeed. Guess who's running it.")
CANDIDATES = ["Eric", "Chris", "Brian", "Adam", "Will", "Charlie", "Liam", "George"]
# silence (s) before a line that starts with this text; everything else gets DEFAULT_GAP
GAPS = {"Here's where it gets messy": 0.55, "Here's the question": 0.6, "Maybe the affair": 0.3, "But then your phone": 0.45,
        "\"Jensen, you just": 0.3, "\"Your affair": 0.3, "You've won": 0.3, "Or was it never": 0.25, "And he's gone": 0.25}
DEFAULT_GAP = 0.2


def tts(text, voice, model, out, **kw):
    budget.check(JOB, "fal_tts_1k_chars", len(text) / 1000)
    p = {"text": text, "voice": voice}
    if model == "v2":
        p.update({"stability": 0.4, "similarity_boost": 0.8, "style": 0.4, "speed": 1.1})
    else:
        p.update({"stability": 0.5})
    p.update(kw)
    res = fal.run(MODELS[model], p, timeout=300, tag=f"{JOB}:{voice}_{model}")
    fal.download(res["audio"]["url"], out)
    budget.log(JOB, "fal_tts_1k_chars", len(text) / 1000, "fal")


def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout)


def audition():
    import librosa, numpy as np
    out = os.path.join(PROJ, "audition"); os.makedirs(out, exist_ok=True)
    rows = []
    for v in CANDIDATES:
        for m in ("v2", "v3"):
            f = os.path.join(out, f"{v}_{m}.mp3")
            try:
                if not os.path.exists(f):
                    tts(AUDITION, v, m, f)
                y, sr = librosa.load(f, sr=16000)
                f0, ok, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr)
                f0 = f0[~np.isnan(f0)]
                d = dur(f)
                rows.append({"voice": v, "model": m, "sec": round(d, 1), "wps": round(len(AUDITION.split()) / d, 2),
                             "f0_med": round(float(np.median(f0)), 1), "f0_iqr": round(float(np.percentile(f0, 75) - np.percentile(f0, 25)), 1)})
                print(rows[-1])
            except Exception as e:
                print("skip", v, m, e)
    json.dump(rows, open(os.path.join(out, "audition.json"), "w"), indent=1)


def make(which, voice, model):
    which = which.upper()
    lines = [l.strip() for l in open(os.path.join(PROJ, f"vo_{which.lower()}.txt")) if l.strip()]
    out = os.path.join(ROOT, "rick", "stage2", "public", f"nv{which.lower()}"); os.makedirs(out, exist_ok=True)
    tmp = f"/tmp/nv{which}"; os.makedirs(tmp, exist_ok=True)
    parts, starts, ends, t = [], [], [], 0.0
    for i, text in enumerate(lines):
        raw, clean = f"{tmp}/{i:02d}.mp3", f"{tmp}/{i:02d}.wav"
        if not os.path.exists(raw):
            tts(text, voice, model, raw)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                        "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1,areverse,aresample=44100", "-ac", "1", clean], check=True)
        gap = next((g for k, g in GAPS.items() if text.startswith(k)), DEFAULT_GAP) if i else 0.0
        d = dur(clean)
        t += gap; starts.append(round(t, 3)); t += d; ends.append(round(t, 3))
        parts.append((gap, clean))
    # join: silence + clip, in order
    args, flt = [], []
    for i, (gap, clean) in enumerate(parts):
        args += ["-f", "lavfi", "-t", f"{max(gap, 0.001):.3f}", "-i", "anullsrc=r=44100:cl=mono", "-i", clean]
        flt.append(f"[{2 * i}:a][{2 * i + 1}:a]")
    raw_all = f"{tmp}/all.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args, "-filter_complex", "".join(flt) + f"concat=n={2 * len(parts)}:v=0:a=1[o]", "-map", "[o]", raw_all], check=True)
    mp3 = os.path.join(out, "voice.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw_all, "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", "44100", "-b:a", "160k", mp3], check=True)
    total = dur(mp3)
    # whisper word times mapped onto the script's own words
    import numpy as np
    from faster_whisper import WhisperModel
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
    segs, _ = WhisperModel("small.en", device="cpu", compute_type="int8").transcribe(audio, word_timestamps=True, beam_size=5)
    heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
    norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    mine = [w for l in lines for w in l.split()]
    sm = difflib.SequenceMatcher(None, [norm(w) for w in mine], [norm(h[0]) for h in heard], autojunk=False)
    times = [None] * len(mine)
    for b in sm.get_matching_blocks():
        for k in range(b.size):
            times[b.a + k] = [round(heard[b.b + k][1], 3), round(heard[b.b + k][2], 3)]
    known = [i for i, x in enumerate(times) if x]
    for i, x in enumerate(times):
        if x: continue
        p = max([k for k in known if k < i], default=None); n = min([k for k in known if k > i], default=None)
        a = times[p][1] if p is not None else 0.0
        z = times[n][0] if n is not None else a + 0.3
        times[i] = [round(a + (z - a) * 0.1, 3), round(z - (z - a) * 0.1, 3)]
    json.dump({"voice": voice, "model": model, "duration": round(total, 3), "matched": len(known), "words": [[w, *x] for w, x in zip(mine, times)]},
              open(os.path.join(out, "words.json"), "w"), indent=0)
    json.dump([{"i": i + 1, "t": l, "start": s, "end": e} for i, (l, s, e) in enumerate(zip(lines, starts, ends))], open(os.path.join(out, "lines.json"), "w"), indent=0)
    print(f"[voice {which}] {voice} {model}: {total:.1f}s, {len(mine)} words, {len(known)} matched, {len(mine) / total:.2f} w/s")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "audition": audition()
    elif a and a[0] == "make": make(a[1], a[2], a[3] if len(a) > 3 else "v2")
    else: sys.exit(__doc__)
