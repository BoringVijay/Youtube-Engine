#!/usr/bin/env python3
"""Production engine: Drive inbox -> voice -> scene plan -> test cut -> (approval) -> final + Shorts + thumbnail.

Every step writes outbox/status.json so Penguin Studio can show a live progress bar.
Job state lives in jobs/<id>/state.json (committed by the workflow), voice files in jobs/<id>/voice/*.mp3.

Inbox messages (JSON files written by the panel):
  {"type":"brew", "id", "script":{...}, ...}            new or updated video
  {"type":"approve", "id", "stage":"test"|"final", "notes"}
  {"type":"redo", "id", "stage":"voice"|"plan"|"render", "notes"}
  {"type":"audition", "line"}                           voice samples for the panel
Env: GEMINI_API_KEY, YT_CLIENT_ID, YT_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN
"""
import base64, datetime as dt, glob, json, math, os, random, re, shutil, struct, subprocess, sys, time, urllib.error, urllib.request, wave
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive  # noqa: E402
import scout  # noqa: E402  (Gemini text helpers)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS = os.path.join(ROOT, "jobs")
PUB = os.path.join(ROOT, "public", "job")
OUT = os.path.join(ROOT, "out")
VOICE_CFG = json.load(open(os.path.join(ROOT, "config", "voice.json")))
FPS = 30
GAP = 0.3  # seconds of air between beats
BUDGET = float(os.environ.get("PRODUCE_BUDGET_MIN", "40")) * 60
T0 = time.time()
CHROME = shutil.which("google-chrome") or shutil.which("chromium") or ""

STAGES = ["queued", "voicing", "planning", "test_render", "test_ready", "final_render", "metadata", "final_ready",
          "approved", "uploading", "scheduled", "live", "failed"]
PCT = {"queued": 2, "voicing": 10, "planning": 30, "test_render": 45, "test_ready": 55, "final_render": 65,
       "metadata": 85, "final_ready": 90, "approved": 92, "uploading": 95, "scheduled": 97, "live": 100}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


# ---------------- state ----------------
def jdir(jid):
    return os.path.join(JOBS, jid)


def load_state(jid):
    p = os.path.join(jdir(jid), "state.json")
    return json.load(open(p)) if os.path.exists(p) else None


def save_state(st):
    os.makedirs(jdir(st["id"]), exist_ok=True)
    st["updated"] = now()
    json.dump(st, open(os.path.join(jdir(st["id"]), "state.json"), "w"), indent=1, ensure_ascii=False)


def all_states():
    out = []
    for p in sorted(glob.glob(os.path.join(JOBS, "*", "state.json"))):
        try:
            out.append(json.load(open(p)))
        except Exception:
            pass
    return out


def publish_status(extra=None):
    """Compact view of every job for the panel."""
    jobs = []
    for st in sorted(all_states(), key=lambda s: s.get("updated", ""), reverse=True)[:40]:
        jobs.append({k: st.get(k) for k in ("id", "q", "series", "stage", "pct", "step", "steps", "preview", "final", "shorts",
                                             "thumb", "meta", "error", "updated", "created", "duration", "notes_in")})
    body = {"at": now(), "engine": "github-actions", "jobs": jobs}
    if extra:
        body.update(extra)
    try:
        drive.put_json("outbox", "status.json", body)
    except Exception as e:
        log("status publish failed:", str(e)[:200])


def set_stage(st, stage, step=None, pct=None):
    st["stage"] = stage
    st["pct"] = pct if pct is not None else PCT.get(stage, st.get("pct", 0))
    if step:
        st["step"] = step
    st.setdefault("steps", [])
    st["steps"] = [s for s in st["steps"] if s["stage"] != stage] + [{"stage": stage, "at": now()}]
    save_state(st)
    publish_status()
    log(f"[{st['id'][:40]}] {stage} {st['pct']}% {step or ''}")


# ---------------- inbox ----------------
def read_inbox():
    files = drive.list_inbox()
    msgs = []
    for f in files:
        if not f["name"].endswith(".json"):
            continue
        try:
            m = json.loads(drive.read_text(f["id"], f.get("mimeType", "")))
            m["_file"] = f["id"]
            m["_created"] = f.get("createdTime", "")
            msgs.append(m)
        except Exception as e:
            log("bad inbox file", f["name"], str(e)[:120])
    return msgs


def handle_inbox():
    msgs = read_inbox()
    log(f"inbox: {len(msgs)} messages")
    auditions = []
    # newest brew per id wins
    brews = {}
    for m in sorted(msgs, key=lambda m: (m.get("at") or m["_created"])):
        if m.get("type") == "brew" and m.get("id"):
            brews[m["id"]] = m
    for jid, m in brews.items():
        st = load_state(jid)
        if st and st.get("brew_at") == m.get("at"):
            continue
        if st and st["stage"] in ("approved", "uploading", "scheduled", "live"):
            log(f"skip brew for {jid}: already {st['stage']}")
            continue
        old_script = (st or {}).get("brew", {}).get("script")
        st = st or {"id": jid, "created": now(), "pct": 0}
        st.update({"q": m.get("q"), "series": m.get("series"), "brew": {k: v for k, v in m.items() if not k.startswith("_")},
                   "brew_at": m.get("at"), "error": None})
        # A changed script means new voice; same script keeps cached audio.
        if old_script and old_script != m.get("script"):
            shutil.rmtree(os.path.join(jdir(jid), "voice"), ignore_errors=True)
            for f in ("plan.json",):
                p = os.path.join(jdir(jid), f)
                os.path.exists(p) and os.remove(p)
        set_stage(st, "queued", "Waiting for a render slot")
    for m in msgs:
        t, jid = m.get("type"), m.get("id")
        if t == "approve" and jid:
            st = load_state(jid)
            if not st:
                continue
            st.setdefault("notes_in", []).append({"at": m.get("at") or now(), "stage": m.get("stage"), "notes": m.get("notes", "")})
            if m.get("stage") == "test" and st["stage"] == "test_ready":
                set_stage(st, "final_render", "Approved. Queued for the full render")
            elif m.get("stage") == "final" and st["stage"] == "final_ready":
                set_stage(st, "approved", "Approved. Waiting for the publisher")
            else:
                save_state(st)
        elif t == "redo" and jid:
            st = load_state(jid)
            if not st:
                continue
            what = m.get("stage", "plan")
            st.setdefault("notes_in", []).append({"at": m.get("at") or now(), "stage": "redo:" + what, "notes": m.get("notes", "")})
            if what == "voice":
                shutil.rmtree(os.path.join(jdir(jid), "voice"), ignore_errors=True)
            if what in ("voice", "plan"):
                p = os.path.join(jdir(jid), "plan.json")
                os.path.exists(p) and os.remove(p)
            st["redo_notes"] = m.get("notes", "")
            set_stage(st, "queued", f"Redo requested ({what})")
        elif t == "audition":
            auditions.append(m)
    for m in msgs:
        try:
            drive.mark_done(m["_file"])
        except Exception as e:
            log("mark_done failed", str(e)[:120])
    if auditions:
        try:
            run_audition(auditions[-1])
        except Exception as e:
            log("audition failed:", str(e)[:200])


# ---------------- voice (Gemini TTS) ----------------
_TTS = []


def tts_models():
    if _TTS:
        return _TTS
    if VOICE_CFG.get("model"):
        _TTS.append(VOICE_CFG["model"])
    data = scout.get_json("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
    names = [m["name"].split("/")[1] for m in data.get("models", []) if "tts" in m["name"]]

    def rank(n):
        v = re.search(r"gemini-(\d+(?:\.\d+)?)", n)
        return ("lite" in n, "pro" in n, -(float(v.group(1)) if v else 0))
    _TTS.extend([n for n in sorted(names, key=rank) if n not in _TTS])
    log("tts models:", _TTS[:4])
    return _TTS


STYLE = {"dry": "deadpan, dry", "smile": "with a smile in the voice", "warm": "warm", "soft": "softly, gently", "whisper": "in a near whisper",
         "faster": "a little faster", "slower": "slower, weighty", "laugh": "with a small laugh"}


def tts_text(raw):
    """Turn delivery tags into a short direction plus pause punctuation."""
    tags = re.findall(r"\[([a-z ]+)\]", raw)
    text = re.sub(r"\[long beat\]", " ... ... ", raw)
    text = re.sub(r"\[beat\]", " ... ", text)
    text = re.sub(r"\[[a-z ]+\]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    moods = [STYLE[t] for t in dict.fromkeys(tags) if t in STYLE]
    direction = VOICE_CFG.get("direction", "")
    if moods:
        direction += " In this part, deliver it " + ", ".join(moods) + "."
    return direction.strip(), text


def tts(text, voice, direction=""):
    prompt = f"{direction}\n\n{text}" if direction else text
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    last = None
    for model in tts_models()[:3]:
        for attempt in range(4):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            r = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                       headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
            try:
                with urllib.request.urlopen(r, timeout=180) as resp:
                    data = json.load(resp)
                part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
                pcm = base64.b64decode(part["data"])
                m = re.search(r"rate=(\d+)", part.get("mimeType", "")); rate = int(m.group(1)) if m else 24000
                return pcm, rate, model
            except urllib.error.HTTPError as e:
                last = f"HTTP {e.code} {model}: {e.read()[:200]}"
                if e.code == 402:
                    raise RuntimeError("Gemini prepay wallet is empty: add credits at aistudio.google.com/billing")
                if e.code in (429, 500, 503):
                    time.sleep(20 * (attempt + 1))
                    continue
                break
            except Exception as e:
                last = f"{model}: {e}"
                time.sleep(10)
        log("tts fallback:", str(last)[:200])
    raise RuntimeError(f"TTS failed: {last}")


def write_wav(path, pcm, rate):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def trim_silence(pcm, rate, keep=0.12):
    """Cut leading/trailing silence so beats sit tight; keep a little air."""
    n = len(pcm) // 2
    if not n:
        return pcm
    samples = struct.unpack(f"<{n}h", pcm[:n * 2])
    thr = 500
    win = int(rate * 0.02)
    first = next((i for i in range(0, n, win) if max(abs(x) for x in samples[i:i + win]) > thr), 0)
    last = next((i for i in range(n - win, 0, -win) if max(abs(x) for x in samples[i:i + win]) > thr), n)
    a = max(0, first - int(keep * rate))
    b = min(n, last + win + int(keep * rate))
    return pcm[a * 2:b * 2]


def beat_texts(script):
    """Beat VO with delivery tags recovered from the tagged full VO when possible."""
    beats = script.get("beats", [])
    full = script.get("vo", "")
    plain = lambda s: re.sub(r"[^a-z0-9]+", " ", re.sub(r"\[[a-z ]+\]", " ", s.lower())).strip()
    out = []
    for b in beats:
        txt = b.get("vo", "")
        words = plain(txt).split()
        if full and len(words) >= 6:
            # find the tagged span covering this beat: start at its first words, end at its last words
            pat_start = r"\W+(?:\[[a-z ]+\]\W*)?".join(map(re.escape, words[:5]))
            pat_end = r"\W+(?:\[[a-z ]+\]\W*)?".join(map(re.escape, words[-4:]))
            ms = re.search(r"(?:\[[a-z ]+\]\s*)*" + pat_start, full, re.I)
            if ms:
                me = re.search(pat_end + r"\W*(?:\[[a-z ]+\])?", full[ms.start():], re.I)
                if me:
                    txt = full[ms.start(): ms.start() + me.end()].strip()
        out.append(txt)
    return out


def voice_job(st):
    script = st["brew"]["script"]
    vdir = os.path.join(jdir(st["id"]), "voice")
    os.makedirs(vdir, exist_ok=True)
    texts = beat_texts(script)
    voice = st["brew"].get("voice") or VOICE_CFG["narrator"]
    meta_p = os.path.join(vdir, "voice.json")
    meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {"voice": voice, "beats": {}}
    todo = [i for i in range(len(texts)) if not os.path.exists(os.path.join(vdir, f"b{i:02d}.mp3"))]
    done = len(texts) - len(todo)

    def one(i):
        direction, text = tts_text(texts[i])
        pcm, rate, model = tts(text, voice, direction)
        pcm = trim_silence(pcm, rate)
        wav = os.path.join(vdir, f"b{i:02d}.wav")
        write_wav(wav, pcm, rate)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "44100", "-b:a", "96k",
                        os.path.join(vdir, f"b{i:02d}.mp3")], check=True)
        os.remove(wav)
        return i, len(pcm) / 2 / rate, model

    with ThreadPoolExecutor(max_workers=int(VOICE_CFG.get("parallel", 2))) as ex:
        for i, secs, model in ex.map(one, todo):
            done += 1
            meta["beats"][str(i)] = {"sec": round(secs, 2), "model": model}
            json.dump(meta, open(meta_p, "w"), indent=1)
            st["pct"] = PCT["voicing"] + int(18 * done / max(1, len(texts)))
            st["step"] = f"Voicing beat {done}/{len(texts)}"
            save_state(st)
            if done % 3 == 0 or done == len(texts):
                publish_status()
    durs = [probe(os.path.join(vdir, f"b{i:02d}.mp3")) for i in range(len(texts))]
    meta["durations"] = durs
    json.dump(meta, open(meta_p, "w"), indent=1)
    return durs


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(out.stdout.strip() or 0)


def run_audition(m):
    line = m.get("line") or "Okay so. You probably think this video reached you through a satellite. Nope. It came through a garden hose at the bottom of the ocean."
    voices = m.get("voices") or VOICE_CFG.get("audition", ["Puck", "Charon", "Fenrir", "Orus", "Achird", "Sadachbia"])
    os.makedirs(os.path.join(OUT, "aud"), exist_ok=True)
    res = []
    for v in voices[:8]:
        direction, text = tts_text(line)
        pcm, rate, model = tts(text, v, direction)
        wav = os.path.join(OUT, "aud", f"{v}.wav")
        write_wav(wav, trim_silence(pcm, rate), rate)
        mp3 = wav[:-4] + ".mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "64k", mp3], check=True)
        fid = drive.put_file("outbox", f"audition-{v}.mp3", mp3, "audio/mpeg")
        res.append({"voice": v, "file": fid, "model": model})
        log("audition", v)
    drive.put_json("outbox", "auditions.json", {"at": now(), "line": line, "voices": res, "current": VOICE_CFG["narrator"]})


# ---------------- scene planner ----------------
TEMPLATE_DOC = """Templates (pick what makes the idea land, vary them, never the same template 3 times in a row):
- title: {title, sub}                       big kinetic headline. Use *stars* around 1-2 accent words.
- stat: {value(number), prefix, suffix, label, sub, icon}   a counting number. Only real numbers from the VO.
- stick: {pose, pose2, icon, say, doubt, title}   stickman scene. poses: stand, lookUp, shock, shrug, point. pose2 = pose it moves into.
     say = short line in a speech bubble (max 8 words). doubt = optional skeptic sidekick's dry reply (max 7 words). Use doubt sparingly for jokes.
- icons: {title, icons:[{icon,label}] (2-4)}  a row of things.
- bars: {title, bars:[{label,value}] (2-5), suffix, sub}   comparisons. Values must come from the VO or verify notes.
- line: {title, points:[numbers 5-20], label}   a trend.
- versus: {title, left:{title,value,icon}, right:{title,value,icon}}
- list: {title, items:[2-5 short strings]}
- flow: {title, icon, from, to, items:[second_icon]}   A leads to B (cause and effect, signal path).
- quote: {title, sub}                        a punchline, a quote or a cold fact on its own.
- timeline: {title, items:["2006|Taiwan quake", ...] (2-5)}
- end: {title, sub}                          last scene only.
Icons available: """


def plan_job(st, durs):
    from_icons = "globe cable ship satellite phone money coin vault chart cloud shark clock bulb question server building rocket house warning fire lock brain people film crown bomb moon sun heart eye"
    script = st["brew"]["script"]
    beats = script.get("beats", [])
    texts = beat_texts(script)
    fmt = st["brew"].get("format", {})
    nshorts = int(fmt.get("shorts", 1) or 0) + (1 if fmt.get("standaloneShort") else 0)
    redo = st.get("redo_notes", "")
    payload = [{"i": i, "sec": round(durs[i], 1), "vo": re.sub(r"\[[a-z ]+\]", "", texts[i]).strip(), "visual_idea": b.get("visual", "")}
               for i, b in enumerate(beats)]
    prompt = f"""You are the motion designer for an animated YouTube explainer series. Series look: {st.get('series')}.
Turn each beat into 1-3 shots. Each shot gets a template and its fields. Shots in a beat split its time with "share" (fractions that sum to 1).
Split the beat's VO text across its shots in order ("vo" field) so captions sync. Keep the visual idea's spirit but use only the templates below.
Rules: be visual and specific, every shot must add information or a joke, no filler title cards back to back, numbers only from the VO.
A shot under 2.5 seconds is too short. Start with a strong hook visual. The last shot of the last beat uses template end.
{TEMPLATE_DOC}{from_icons}
{('Reviewer notes to apply: ' + redo) if redo else ''}

Also pick {nshorts} Shorts cut from this video: each a run of consecutive beats totalling 25-55 seconds that works alone (hook first, payoff last).
Give each a punchy title (max 60 chars) and a 2-4 word thumbnail text.
Also give "thumb": {{"title": "2-4 HUGE words with one *accent*", "icon": icon}} for the long video.

Beats: {json.dumps(payload, ensure_ascii=False)}

Return JSON: {{"beats":[{{"i":0,"shots":[{{"share":0.5,"template":"...","vo":"...", ...fields}}]}}], "shorts":[{{"title":"...","beats":[3,4,5],"thumb":"..."}}], "thumb":{{...}}}}"""
    plan = scout.gemini(prompt, temperature=0.7)
    return validate_plan(plan, len(beats), texts)


VALID = {"title", "stat", "stick", "icons", "bars", "line", "versus", "list", "flow", "quote", "timeline", "end"}


def validate_plan(plan, n, texts):
    by_i = {b.get("i"): b for b in plan.get("beats", []) if isinstance(b, dict)}
    beats = []
    for i in range(n):
        shots = [s for s in (by_i.get(i, {}).get("shots") or []) if isinstance(s, dict)][:3]
        clean = []
        for s in shots:
            if s.get("template") not in VALID:
                s["template"] = "title" if s.get("title") else "quote"
            if s["template"] == "stat" and not isinstance(s.get("value"), (int, float)):
                s["template"] = "title"
            if s["template"] == "bars":
                s["bars"] = [b for b in s.get("bars", []) if isinstance(b, dict) and isinstance(b.get("value"), (int, float))]
                if len(s["bars"]) < 2:
                    s["template"] = "title"
            clean.append(s)
        if not clean:
            vo = re.sub(r"\[[a-z ]+\]", "", texts[i]).strip()
            clean = [{"share": 1, "template": "quote", "title": " ".join(vo.split()[:9]), "vo": vo}]
        tot = sum(max(0.05, float(s.get("share") or 0)) for s in clean)
        for s in clean:
            s["share"] = max(0.05, float(s.get("share") or 0)) / tot
        beats.append({"i": i, "shots": clean})
    shorts = []
    for sh in plan.get("shorts", [])[:3]:
        ids = sorted({int(x) for x in sh.get("beats", []) if str(x).isdigit() and int(x) < n})
        if ids:
            shorts.append({"title": str(sh.get("title", ""))[:90], "beats": ids, "thumb": sh.get("thumb", "")})
    return {"beats": beats, "shorts": shorts, "thumb": plan.get("thumb") or {}}


# ---------------- timeline + render ----------------
def build_props(st, plan, durs, beat_ids=None, w=1920, h=1080, captions=True, prefix=""):
    jid = st["id"]
    beat_ids = beat_ids if beat_ids is not None else list(range(len(durs)))
    pdir = os.path.join(PUB, jid)
    os.makedirs(pdir, exist_ok=True)
    scenes, audio = [], []
    t = 0.4
    for k, i in enumerate(beat_ids):
        src = os.path.join(jdir(jid), "voice", f"b{i:02d}.mp3")
        shutil.copy(src, os.path.join(pdir, f"b{i:02d}.mp3"))
        audio.append({"src": f"job/{jid}/b{i:02d}.mp3", "start": int(t * FPS)})
        if k > 0:
            audio.append({"src": "sfx/whoosh.wav", "start": max(0, int((t - 0.25) * FPS)), "volume": 0.35})
        beat_len = durs[i] + GAP
        s0 = t
        shots = plan["beats"][i]["shots"]
        for j, sh in enumerate(shots):
            d = beat_len * sh["share"]
            sc = {k2: v for k2, v in sh.items() if k2 not in ("share", "i")}
            if k == len(beat_ids) - 1 and j == len(shots) - 1 and beat_ids != list(range(len(durs))):
                sc = {"template": "end", "title": "Full story on the *channel*", "sub": "Follow for more", "vo": sh.get("vo", "")}
            sc.update({"start": int(s0 * FPS), "dur": max(1, int(round((s0 + d) * FPS)) - int(s0 * FPS))})
            if j > 0:
                audio.append({"src": "sfx/pop.wav", "start": int(s0 * FPS), "volume": 0.25})
            scenes.append(sc)
            s0 += d
        t += beat_len
    scenes[-1]["dur"] += int(1.2 * FPS)
    return {"theme": theme_for(st), "scenes": scenes, "audio": audio, "bed": "sfx/bed.wav", "captions": captions, "w": w, "h": h,
            "watermark": VOICE_CFG.get("watermark", "")}


def theme_for(st):
    s = (st.get("series") or "").lower()
    for key, name in (("happened", "happened"), ("how it works", "howitworks"), ("cutaway", "howitworks"), ("money", "money"),
                      ("weird", "weird"), ("comic", "weird"), ("versus", "versus")):
        if key in s:
            return name
    return "whatif"


def render(props, out_path, scale=1.0, crf=None, frames=None, still=False):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pfile = out_path + ".props.json"
    json.dump(props, open(pfile, "w"))
    cmd = ["npx", "remotion", "still" if still else "render", "src/index.ts", "Episode", out_path, f"--props={pfile}", "--log=error"]
    if CHROME:
        cmd.append(f"--browser-executable={CHROME}")
    if still:
        cmd += ["--frame=20", "--image-format=jpeg", "--jpeg-quality=90"]
    else:
        cmd += [f"--scale={scale}", "--concurrency=" + str(os.cpu_count() or 2), "--codec=h264", "--audio-bitrate=128k", "--x264-preset=veryfast"]
        if crf:
            cmd.append(f"--crf={crf}")
    t0 = time.time()
    subprocess.run(cmd, cwd=ROOT, check=True)
    log(f"rendered {os.path.basename(out_path)} in {time.time()-t0:.0f}s, {os.path.getsize(out_path)/1e6:.1f} MB")
    return out_path


def link(fid):
    return {"id": fid, "view": f"https://drive.google.com/file/d/{fid}/view", "download": f"https://drive.google.com/uc?id={fid}&export=download"}


def make_sfx():
    """Small synthesized sound kit: whoosh, pop and a soft ambient bed. No licensing questions."""
    d = os.path.join(ROOT, "public", "sfx")
    os.makedirs(d, exist_ok=True)
    rate = 44100

    def save(name, samples):
        with wave.open(os.path.join(d, name), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples))
    if not os.path.exists(os.path.join(d, "whoosh.wav")):
        rnd = random.Random(7); n = int(rate * 0.45); y = 0.0; out = []
        for i in range(n):
            p = i / n; env = math.sin(math.pi * p) ** 2
            a = 0.02 + 0.25 * p  # opening low-pass sweep
            y += a * (rnd.uniform(-1, 1) - y); out.append(y * env * 0.9)
        save("whoosh.wav", out)
    if not os.path.exists(os.path.join(d, "pop.wav")):
        n = int(rate * 0.12)
        save("pop.wav", [math.sin(2 * math.pi * (900 - 500 * i / n) * i / rate) * math.exp(-i / (rate * 0.025)) * 0.6 for i in range(n)])
    if not os.path.exists(os.path.join(d, "bed.wav")):
        chords = [[220.0, 277.18, 329.63], [196.0, 246.94, 293.66], [174.61, 220.0, 261.63], [196.0, 246.94, 329.63]]
        seg = rate * 4; out = []
        for c in chords:
            for i in range(seg):
                tt = i / rate; env = min(1, i / (rate * 1.2), (seg - i) / (rate * 1.2))
                out.append(env * 0.18 * sum(math.sin(2 * math.pi * f * tt) * (0.6 + 0.4 * math.sin(2 * math.pi * 0.2 * tt)) for f in c) / 3)
        save("bed.wav", out)


# ---------------- pipeline ----------------
def advance(st):
    jid = st["id"]
    vdir = os.path.join(jdir(jid), "voice")
    if st["stage"] in ("queued", "voicing", "planning", "test_render"):
        set_stage(st, "voicing", "Recording the narrator")
        durs = voice_job(st)
        st["duration"] = round(sum(durs) + GAP * len(durs), 1)
        plan_p = os.path.join(jdir(jid), "plan.json")
        if not os.path.exists(plan_p):
            set_stage(st, "planning", "Designing scenes")
            json.dump(plan_job(st, durs), open(plan_p, "w"), indent=1, ensure_ascii=False)
        plan = json.load(open(plan_p))
        set_stage(st, "test_render", "Rendering the test cut")
        props = build_props(st, plan, durs)
        mp4 = render(props, os.path.join(OUT, jid, "test.mp4"), scale=1 / 3, crf=30)
        fid = drive.put_file("videos", f"{jid}__test.mp4", mp4, "video/mp4")
        st["preview"] = {**link(fid), "size_mb": round(os.path.getsize(mp4) / 1e6, 1), "at": now()}
        st.pop("redo_notes", None)
        set_stage(st, "test_ready", "Test cut ready. Watch it and approve or ask for changes")
        return True
    if st["stage"] == "final_render":
        meta = json.load(open(os.path.join(vdir, "voice.json")))
        durs = meta["durations"]
        plan = json.load(open(os.path.join(jdir(jid), "plan.json")))
        set_stage(st, "final_render", "Rendering 1080p", 66)
        mp4 = render(build_props(st, plan, durs), os.path.join(OUT, jid, "final.mp4"), crf=20)
        st["final"] = {**link(drive.put_file("videos", f"{jid}__final.mp4", mp4, "video/mp4")), "size_mb": round(os.path.getsize(mp4) / 1e6, 1)}
        save_state(st)
        thumb = plan.get("thumb") or {}
        tprops = {"theme": theme_for(st), "audio": [], "captions": False, "w": 1280, "h": 720,
                  "scenes": [{"start": 0, "dur": 60, "template": "thumb", "title": thumb.get("title") or (st.get("q") or "")[:30], "icon": thumb.get("icon", "question")}]}
        jpg = render(tprops, os.path.join(OUT, jid, "thumb.jpg"), still=True)
        st["thumb"] = link(drive.put_file("videos", f"{jid}__thumb.jpg", jpg, "image/jpeg"))
        st["shorts"] = []
        for k, sh in enumerate(plan.get("shorts", [])):
            set_stage(st, "final_render", f"Rendering Short {k+1}/{len(plan['shorts'])}", 72 + k * 5)
            props = build_props(st, plan, durs, beat_ids=sh["beats"], w=1080, h=1920)
            smp4 = render(props, os.path.join(OUT, jid, f"short{k+1}.mp4"), crf=21)
            st["shorts"].append({"title": sh["title"], "beats": sh["beats"], **link(drive.put_file("videos", f"{jid}__short{k+1}.mp4", smp4, "video/mp4")),
                                 "duration": round(probe(smp4), 1)})
            save_state(st)
        set_stage(st, "metadata", "Writing title, description and chapters")
        st["meta"] = write_metadata(st, plan, durs)
        set_stage(st, "final_ready", "Final video, Shorts and thumbnail ready for review")
        return True
    return False


def write_metadata(st, plan, durs):
    script = st["brew"]["script"]
    chapters, t = [], 0.4
    for i, b in enumerate(script.get("beats", [])):
        chapters.append({"t": int(t), "vo": b.get("vo", "")[:140]})
        t += durs[i] + GAP
    prompt = f"""Write YouTube metadata for this animated explainer. Voice: curious, warm, a bit cheeky, never clickbait lies.
Topic: {st.get('q')}
Candidate titles: {script.get('titles')}
Beats with start seconds: {json.dumps(chapters, ensure_ascii=False)}
Facts to keep honest: {script.get('verify', [])[:8]}
Return JSON: {{"title": "max 70 chars, curiosity first", "alt_titles": [2 more], "description": "2 short paragraphs, then a blank line, then 5-8 chapters as 'm:ss Label' starting at 0:00 (group beats, labels max 5 words), then 3 hashtags",
"tags": [12-18 search tags], "pinned_comment": "a question that invites replies", "shorts": [{{"title": "...", "description": "1 line + 2 hashtags"}} for each of {len(plan.get('shorts', []))} shorts]}}"""
    try:
        return scout.gemini(prompt, temperature=0.6)
    except Exception as e:
        log("metadata failed:", str(e)[:200])
        return {"title": (script.get("titles") or [st.get("q")])[0], "description": st.get("q", ""), "tags": []}


def main():
    os.makedirs(JOBS, exist_ok=True)
    scout.log = log
    make_sfx()
    handle_inbox()
    order = {"final_render": 0, "queued": 1, "voicing": 1, "planning": 1, "test_render": 1}
    work = sorted([s for s in all_states() if s.get("stage") in order], key=lambda s: (order[s["stage"]], s.get("updated", "")))
    publish_status()
    for st in work:
        if time.time() - T0 > BUDGET:
            log("time budget used; the rest waits for the next run")
            break
        try:
            advance(st)
        except Exception as e:
            log(f"job {st['id']} failed: {e}")
            st["error"] = str(e)[:400]
            st["fails"] = st.get("fails", 0) + 1
            st["step"] = "Error. Will retry next run" if st["fails"] < 3 else "Stopped after 3 failures. Send a redo to retry"
            if st["fails"] >= 3:
                st["stage"] = "failed"
            save_state(st)
            publish_status()
            if "prepay wallet" in str(e):
                break
    publish_status()


if __name__ == "__main__":
    main()
