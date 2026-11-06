#!/usr/bin/env python3
"""Curious Penguin production engine v2.

Drive inbox -> director (universe, shot list, penguin cameos) -> voice (performance pass, whole takes, word timing)
-> art (key art, penguin in this universe, every frame) -> test cut (stills, real voice) -> YOUR APPROVAL
-> motion clips for the key shots -> final 1080p + Shorts + thumbnail + metadata -> YOUR APPROVAL -> publisher.

Every step updates outbox/status.json for Penguin Studio. Spend is logged in ledger/ledger.json with hard caps.
Inbox messages: brew {id, script, ...} | approve {id, stage: test|final, notes} | redo {id, stage: voice|scenes|render, notes} | audition {line}
"""
import datetime as dt, glob, json, math, os, random, re, shutil, struct, subprocess, sys, time, wave

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art as artmod  # noqa: E402
import budget  # noqa: E402
import director  # noqa: E402
import drive  # noqa: E402
import gai  # noqa: E402
import voice  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS = os.path.join(ROOT, "jobs")
PUB = os.path.join(ROOT, "public", "job")
OUT = os.path.join(ROOT, "out")
VOICE_CFG = json.load(open(os.path.join(ROOT, "config", "voice.json")))
FPS = 30
BUDGET_SEC = float(os.environ.get("PRODUCE_BUDGET_MIN", "50")) * 60
T0 = time.time()
CHROME = shutil.which("google-chrome") or shutil.which("chromium") or ""
WORKING = ["queued", "directing", "voicing", "art", "test_render", "motion", "final_render", "metadata"]
PCT = {"queued": 2, "directing": 6, "voicing": 12, "art": 22, "test_render": 46, "test_ready": 55, "motion": 60, "final_render": 72,
       "metadata": 88, "final_ready": 90, "approved": 92, "uploading": 95, "scheduled": 97, "live": 100}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


# ---------------- state ----------------
def jdir(jid):
    return os.path.join(JOBS, jid)


def jfile(jid, name):
    return os.path.join(jdir(jid), name)


def load_state(jid):
    p = jfile(jid, "state.json")
    return json.load(open(p)) if os.path.exists(p) else None


def save_state(st):
    os.makedirs(jdir(st["id"]), exist_ok=True)
    st["updated"] = now()
    json.dump(st, open(jfile(st["id"], "state.json"), "w"), indent=1, ensure_ascii=False)


def all_states():
    out = []
    for p in sorted(glob.glob(os.path.join(JOBS, "*", "state.json"))):
        try:
            out.append(json.load(open(p)))
        except Exception:
            pass
    return out


def publish_status():
    jobs = []
    for st in sorted(all_states(), key=lambda s: s.get("updated", ""), reverse=True)[:40]:
        j = {k: st.get(k) for k in ("id", "q", "series", "stage", "pct", "step", "steps", "preview", "final", "shorts", "thumb", "meta",
                                     "error", "updated", "created", "duration", "notes_in", "universe", "cameos", "cost")}
        jobs.append(j)
    body = {"at": now(), "engine": "github-actions", "version": 2, "backend": gai.backend(), "budget": budget.summary(), "jobs": jobs}
    try:
        drive.put_json("outbox", "status.json", body)
    except Exception as e:
        log("status publish failed:", str(e)[:200])


def set_stage(st, stage, step=None, pct=None):
    st["stage"] = stage
    st["pct"] = pct if pct is not None else PCT.get(stage, st.get("pct", 0))
    if step:
        st["step"] = step
    st["cost"] = budget.spent(st["id"])
    st["steps"] = [s for s in st.get("steps", []) if s["stage"] != stage] + [{"stage": stage, "at": now()}]
    save_state(st)
    publish_status()
    log(f"[{st['id'][:40]}] {stage} {st['pct']}% {step or ''}")


def progress(st, stage, lo, hi, label):
    def cb(i, n):
        st["pct"] = int(lo + (hi - lo) * i / max(1, n))
        st["step"] = f"{label} {i}/{n}"
        save_state(st)
        if i == n or i % 5 == 0:
            st["cost"] = budget.spent(st["id"])
            publish_status()
    return cb


def reset(jid, what):
    """what: voice | scenes | all"""
    if what in ("voice", "all"):
        shutil.rmtree(jfile(jid, "voice"), ignore_errors=True)
        for f in ("words.json", "sections.json"):
            p = jfile(jid, f)
            os.path.exists(p) and os.remove(p)
    if what in ("scenes", "all"):
        for f in ("direction.json", "art.json"):
            p = jfile(jid, f)
            os.path.exists(p) and os.remove(p)


# ---------------- inbox ----------------
def read_inbox():
    msgs = []
    for f in drive.list_inbox():
        if not f["name"].endswith(".json"):
            continue
        try:
            m = json.loads(drive.read_text(f["id"], f.get("mimeType", "")))
            m["_file"], m["_created"] = f["id"], f.get("createdTime", "")
            msgs.append(m)
        except Exception as e:
            log("bad inbox file", f["name"], str(e)[:120])
    return msgs


def handle_inbox():
    msgs = read_inbox()
    log(f"inbox: {len(msgs)} messages")
    brews = {}
    for m in sorted(msgs, key=lambda m: (m.get("at") or m["_created"])):
        if m.get("type") == "brew" and m.get("id"):
            brews[m["id"]] = m
    for jid, m in brews.items():
        st = load_state(jid)
        if st and st.get("brew_at") == m.get("at") and st.get("v") == 2:
            continue
        if st and st["stage"] in ("approved", "uploading", "scheduled", "live"):
            continue
        old = (st or {}).get("brew", {}).get("script")
        st = st or {"id": jid, "created": now(), "pct": 0}
        if old != m.get("script") or st.get("v") != 2:
            reset(jid, "all")
        st.update({"v": 2, "q": m.get("q"), "series": m.get("series"), "brew": {k: v for k, v in m.items() if not k.startswith("_")},
                   "brew_at": m.get("at"), "error": None, "fails": 0, "preview": None, "final": None, "shorts": None, "thumb": None, "meta": None})
        set_stage(st, "queued", "Waiting for a render slot")
    auditions = []
    for m in msgs:
        t, jid = m.get("type"), m.get("id")
        st = load_state(jid) if jid else None
        if t == "approve" and st:
            st.setdefault("notes_in", []).append({"at": m.get("at") or now(), "stage": m.get("stage"), "notes": m.get("notes", "")})
            if m.get("stage") == "test" and st["stage"] == "test_ready":
                st["approved_notes"] = m.get("notes", "")
                set_stage(st, "motion", "Approved. Animating the key shots next")
            elif m.get("stage") == "final" and st["stage"] == "final_ready":
                set_stage(st, "approved", "Approved. Waiting for the publisher")
            else:
                save_state(st)
        elif t == "redo" and st:
            what = {"plan": "scenes", "scenes": "scenes", "voice": "voice"}.get(m.get("stage"), "render")
            st.setdefault("notes_in", []).append({"at": m.get("at") or now(), "stage": "redo:" + what, "notes": m.get("notes", "")})
            if what != "render":
                reset(jid, what)
            st["redo_notes"] = m.get("notes", "")
            st["fails"] = 0
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


def run_audition(m):
    line = m.get("line") or ("[cheerfully] Okay so, you think this video flew to you from a satellite, right? [short pause] Nope. [soft laugh] Not even close. "
                             "It came through a cable about as thick as a garden hose, [whispering] at the bottom of the ocean.")
    voices = m.get("voices") or VOICE_CFG.get("audition", ["Puck", "Fenrir", "Zubenelgenubi", "Sadachbia", "Umbriel"])
    os.makedirs(os.path.join(OUT, "aud"), exist_ok=True)
    res = []
    for v in voices[:8]:
        pcm, rate, model = voice.tts_take(line, "excited, warm, conversational", v)
        wav = os.path.join(OUT, "aud", f"{v}.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
        mp3 = wav[:-4] + ".mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-b:a", "96k", mp3], check=True)
        budget.log("audition", "tts_per_min", len(pcm) / 2 / rate / 60, gai.LAST["backend"])
        res.append({"voice": v, "file": drive.put_file("outbox", f"audition-{v}.mp3", mp3, "audio/mpeg"), "model": model})
    drive.put_json("outbox", "auditions.json", {"at": now(), "line": voice.strip_tags(line), "voices": res, "current": VOICE_CFG["narrator"]})


# ---------------- sound kit ----------------
def make_sfx():
    """Original synthesized sound kit, no licensing questions: whoosh, pop, boom, riser, tick, ding."""
    d = os.path.join(ROOT, "public", "sfx")
    os.makedirs(d, exist_ok=True)
    rate = 44100

    def save(name, samples):
        p = os.path.join(d, name)
        if os.path.exists(p):
            return
        with wave.open(p, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples))
    rnd = random.Random(7)
    n = int(rate * 0.45); y = 0.0; out = []
    for i in range(n):
        p = i / n; env = math.sin(math.pi * p) ** 2; a = 0.02 + 0.25 * p
        y += a * (rnd.uniform(-1, 1) - y); out.append(y * env * 0.9)
    save("whoosh.wav", out)
    n = int(rate * 0.12)
    save("pop.wav", [math.sin(2 * math.pi * (900 - 500 * i / n) * i / rate) * math.exp(-i / (rate * 0.025)) * 0.6 for i in range(n)])
    n = int(rate * 1.4); ph = 0.0; out = []
    for i in range(n):
        t = i / rate; f = 38 + 70 * math.exp(-t * 9); ph += 2 * math.pi * f / rate
        out.append(math.tanh(2.2 * math.sin(ph)) * math.exp(-t * 2.6) * 0.8)
    save("boom.wav", out)
    n = int(rate * 1.6); y = 0.0; out = []
    for i in range(n):
        p = i / n; a = 0.01 + 0.5 * p ** 2
        y += a * (rnd.uniform(-1, 1) - y); out.append(y * (p ** 1.5) * 0.7)
    save("riser.wav", out)
    n = int(rate * 0.05)
    save("tick.wav", [rnd.uniform(-1, 1) * math.exp(-i / (rate * 0.004)) * 0.6 for i in range(n)])
    n = int(rate * 1.2)
    save("ding.wav", [sum(math.sin(2 * math.pi * f * i / rate) * g for f, g in ((1320, 0.5), (2640, 0.2), (3960, 0.1))) * math.exp(-i / (rate * 0.35)) * 0.5 for i in range(n)])


def sfx_for(text, transition):
    t = (text or "").lower()
    for keys, f, v in ((("boom", "bass", "thud", "impact", "reveal", "vine"), "boom.wav", 0.5), (("riser", "tension", "build"), "riser.wav", 0.35),
                       (("tick", "clock", "stopwatch", "click"), "tick.wav", 0.5), (("ding", "bell", "chime", "notification"), "ding.wav", 0.35),
                       (("pop", "bubble", "plop", "squish", "boing"), "pop.wav", 0.4), (("whoosh", "swoosh", "swish"), "whoosh.wav", 0.35)):
        if any(k in t for k in keys):
            return f, v
    if transition == "whip":
        return "whoosh.wav", 0.3
    return None, 0


# ---------------- timeline ----------------
def beat_times(st, words, total):
    beats = st["brew"]["script"].get("beats", [])
    out, after = [], 0.0
    for i, b in enumerate(beats):
        cue = " ".join(voice.strip_tags(b.get("vo", "")).split()[:4])
        t = voice.cue_time(words, cue, after) if i else 0.0
        if t is None:
            t = out[-1] + 3 if out else 0.0
        out.append(max(after, t))
        after = out[-1]
    return out + [total]


def build_film(st, d, words, total, media, w=1920, h=1080, window=None, test=False):
    """media: {shot_id: {"img": public path, "vid": public path or None}}. window: (t0, t1) seconds for a Short."""
    bt = beat_times(st, words, total)
    shots = d["shots"]
    starts, after = [], 0.0
    for i, s in enumerate(shots):
        b0, b1 = bt[s["beat"]], bt[s["beat"] + 1]
        t = voice.cue_time(words, s.get("cue"), max(after, b0 - 0.3)) if s.get("cue") else None
        if t is None or t > b1 + 0.5:
            same = [x for x in shots if x["beat"] == s["beat"]]
            k = same.index(s)
            t = b0 + (b1 - b0) * k / len(same)
        t = 0.0 if i == 0 else max(after + 0.6, t)
        starts.append(t)
        after = t
    # drop shots that would flash by too fast; the previous shot holds instead
    keep = [i for i in range(len(shots)) if i == 0 or (starts[i + 1] if i + 1 < len(shots) else total + 1.2) - starts[i] >= 0.9]
    shots, starts = [shots[i] for i in keep], [starts[i] for i in keep]
    t0w, t1w = window or (0.0, total + 1.2)
    film, audio = [], []
    for i, s in enumerate(shots):
        a, b = starts[i], (starts[i + 1] if i + 1 < len(shots) else total + 1.2)
        a, b = max(a, t0w), min(b, t1w)
        if b - a < 0.4:
            continue
        m = media.get(s["id"], {})
        if not m.get("img"):
            continue
        base = {"id": s["id"], "start": int(round((a - t0w) * FPS)), "dur": max(1, int(round((b - a) * FPS))), "transition": s.get("transition", "cut"),
                "camera": s.get("camera", "drift"), "focus": s.get("focus"), "overlay": s.get("overlay")}
        if base["overlay"] and base["overlay"].get("type") == "counter" and (b - a) < 2.2:
            base["overlay"] = {**base["overlay"], "at": 0.1}
        if m.get("vid") and not test:
            span = b - a
            rate = 1.0 if span <= 8 else max(0.6, 8 / span)
            vid_len = min(span, 8 / rate)
            film.append({**base, "kind": "video", "src": m["vid"], "rate": rate, "dur": max(1, int(round(vid_len * FPS))), "volume": 0.35})
            if span - vid_len > 0.5:
                film.append({**base, "id": s["id"] + "b", "kind": "image", "src": m["img"], "camera": "push_in", "transition": "cut", "overlay": None,
                             "start": base["start"] + int(round(vid_len * FPS)), "dur": int(round((span - vid_len) * FPS))})
        else:
            film.append({**base, "kind": "image", "src": m["img"], "camera": "push_in" if s.get("kind") == "motion" else base["camera"]})
        f, v = sfx_for(s.get("sfx"), s.get("transition"))
        if f and i > 0:
            audio.append({"src": f"sfx/{f}", "start": max(0, base["start"] - (6 if f in ("whoosh.wav", "riser.wav") else 0)), "volume": v})
    u = d["universe"]
    pal = u["palette"]
    look = {"paper": pal["paper"], "ink": pal["ink"], "accent": pal["accent"], "accent2": pal["accent2"], "font": u["font"], "film": u["film"],
            "grain": u["grain"], "vignette": u["vignette"], "letterbox": u["letterbox"] and w > h, "captionBg": pal["ink"], "captionInk": pal["paper"]}
    ws = [{"w": x["w"], "t0": round(x["t0"] - t0w, 3), "t1": round(x["t1"] - t0w, 3)} for x in words if t0w - 0.05 <= x["t0"] <= t1w]
    audio.insert(0, {"src": f"job/{st['id']}/voice.mp3", "start": 0, "trim": t0w, "volume": 1})
    music = {"src": f"job/{st['id']}/music.wav", "volume": 0.09} if os.path.exists(os.path.join(PUB, st["id"], "music.wav")) else None
    return {"w": w, "h": h, "look": look, "shots": film, "words": ws, "audio": audio, "music": music, "captions": True}


def render(props, out_path, scale=1.0, crf=None, still=False, frame=20):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pfile = out_path + ".props.json"
    json.dump(props, open(pfile, "w"))
    cmd = ["npx", "remotion", "still" if still else "render", "src/index.ts", "Film", out_path, f"--props={pfile}", "--log=error"]
    if CHROME:
        cmd.append(f"--browser-executable={CHROME}")
    if still:
        cmd += [f"--frame={frame}", "--image-format=jpeg", "--jpeg-quality=92"]
    else:
        cmd += [f"--scale={scale}", f"--concurrency={os.cpu_count() or 2}", "--codec=h264", "--audio-bitrate=192k", "--x264-preset=veryfast"]
        if crf:
            cmd.append(f"--crf={crf}")
    t0 = time.time()
    subprocess.run(cmd, cwd=ROOT, check=True)
    log(f"rendered {os.path.basename(out_path)} in {time.time() - t0:.0f}s, {os.path.getsize(out_path) / 1e6:.1f} MB")
    return out_path


def link(fid):
    return {"id": fid, "view": f"https://drive.google.com/file/d/{fid}/view", "download": f"https://drive.google.com/uc?id={fid}&export=download"}


def job_folder(jid):
    return drive.ensure_folder(drive.CFG["videos"], jid)


# ---------------- pipeline ----------------
def stage_direction(st):
    p = jfile(st["id"], "direction.json")
    if os.path.exists(p):
        return json.load(open(p))
    set_stage(st, "directing", "Choosing the visual universe and writing the shot list")
    words = sum(len(voice.strip_tags(b.get("vo", "")).split()) for b in st["brew"]["script"].get("beats", []))
    budget.check(st["id"], "text_call", 3)
    d = director.direct(st, words / 2.6, max_motion=int(VOICE_CFG.get("max_motion", 6)), notes=st.get("redo_notes", ""))
    budget.log(st["id"], "text_call", 3, gai.LAST["backend"])
    json.dump(d, open(p, "w"), indent=1, ensure_ascii=False)
    st["universe"] = d["universe"]["name"]
    st["cameos"] = [{"shot": s["id"], **s["penguin"]} for s in d["shots"] if s.get("penguin")]
    log(f"universe: {d['universe']['name']} ({d['universe'].get('why', '')[:120]}), {len(d['shots'])} shots, "
        f"{sum(1 for s in d['shots'] if s['kind'] == 'motion')} motion, {len(st['cameos'])} cameos")
    return d


def stage_voice(st):
    vdir = jfile(st["id"], "voice")
    wp = jfile(st["id"], "words.json")
    if os.path.exists(wp) and os.path.exists(os.path.join(vdir, "voice.mp3")):
        w = json.load(open(wp))
        return w["words"], w["total"]
    set_stage(st, "voicing", "Directing the narrator's performance")
    sp = jfile(st["id"], "sections.json")
    if os.path.exists(sp):
        sections = json.load(open(sp))
    else:
        sections = voice.performance(st)
        budget.log(st["id"], "text_call", 1, gai.LAST["backend"])
        json.dump(sections, open(sp, "w"), indent=1, ensure_ascii=False)
    v = st["brew"].get("voice") or VOICE_CFG["narrator"]
    st["step"] = f"Recording {len(sections)} takes with {v}"
    save_state(st); publish_status()
    est_min = sum(len(voice.strip_tags(s["transcript"]).split()) for s in sections) / 160
    budget.check(st["id"], "tts_per_min", est_min)
    mp3, total, offsets, models = voice.record(st, vdir, sections, v)
    budget.log(st["id"], "tts_per_min", total / 60, gai.LAST["backend"])
    st["step"] = "Timing every word"
    save_state(st); publish_status()
    words, matched = voice.align(os.path.join(vdir, "full.wav"), sections)
    json.dump({"words": words, "total": total, "matched": matched, "voice": v}, open(wp, "w"))
    for f in glob.glob(os.path.join(vdir, "*.wav")):
        if not os.path.basename(f).startswith("take"):
            os.remove(f)
    st["duration"] = round(total, 1)
    return words, total


def stage_music(st, d):
    pdir = os.path.join(PUB, st["id"])
    os.makedirs(pdir, exist_ok=True)
    dst = os.path.join(pdir, "music.wav")
    cached = jfile(st["id"], "music.json")
    a = artmod.Art(st, d, os.path.join(OUT, st["id"], "art"))
    got = a.have("music.wav")
    if got:
        shutil.copy(got, dst)
        return
    if os.path.exists(cached):
        return  # tried before, unavailable
    try:
        budget.check(st["id"], "music_clip")
        data = gai.lyria(d["universe"].get("music") or "gentle curious instrumental, light percussion, warm, 90 bpm")
    except budget.OverBudget:
        data = None
    json.dump({"ok": bool(data)}, open(cached, "w"))
    if data:
        open(a.path("music.wav"), "wb").write(data)
        budget.log(st["id"], "music_clip", 1, "vertex")
        a.keep("music.wav", "audio/wav")
        shutil.copy(a.path("music.wav"), dst)


def publish_media(st, a, d, vertical=False):
    """Copy frames/clips into public/job/<id>/ for Remotion. Returns media map."""
    pdir = os.path.join(PUB, st["id"])
    os.makedirs(pdir, exist_ok=True)
    shutil.copy(os.path.join(jdir(st["id"]), "voice", "voice.mp3"), os.path.join(pdir, "voice.mp3"))
    media = {}
    for s in d["shots"]:
        name = f"{s['id']}{'-v' if vertical else ''}.png"
        src = a.have(name) or a.have(f"{s['id']}.png")
        if not src:
            continue
        jpg = os.path.join(pdir, os.path.basename(src).replace(".png", ".jpg"))
        if not os.path.exists(jpg):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-q:v", "2", jpg], check=True)
        media[s["id"]] = {"img": f"job/{st['id']}/{os.path.basename(jpg)}"}
        v = a.have(f"{s['id']}.mp4") if s.get("kind") == "motion" else None
        if v:
            shutil.copy(v, os.path.join(pdir, f"{s['id']}.mp4"))
            media[s["id"]]["vid"] = f"job/{st['id']}/{s['id']}.mp4"
    return media


def advance(st):
    jid = st["id"]
    if st["stage"] in ("queued", "directing", "voicing", "art", "test_render"):
        d = stage_direction(st)
        words, total = stage_voice(st)
        set_stage(st, "art", f"Painting {len(d['shots'])} frames in {d['universe']['name']}")
        a = artmod.Art(st, d, os.path.join(OUT, jid, "art"))
        a.frames(progress(st, "art", 22, 44, "Painting frame"))
        stage_music(st, d)
        set_stage(st, "test_render", "Cutting the test version")
        media = publish_media(st, a, d)
        mp4 = render(build_film(st, d, words, total, media, test=True), os.path.join(OUT, jid, "test.mp4"), scale=0.5, crf=26)
        fid = drive.upload(job_folder(jid), "test-cut.mp4", mp4, "video/mp4")
        st["preview"] = {**link(fid), "size_mb": round(os.path.getsize(mp4) / 1e6, 1), "at": now()}
        st.pop("redo_notes", None)
        motion = sum(1 for s in d["shots"] if s["kind"] == "motion")
        set_stage(st, "test_ready", f"Test cut ready ({d['universe']['name']}). {motion} shots get real animation after you approve")
        return True
    if st["stage"] in ("motion", "final_render", "metadata"):
        d = json.load(open(jfile(jid, "direction.json")))
        w = json.load(open(jfile(jid, "words.json")))
        words, total = w["words"], w["total"]
        a = artmod.Art(st, d, os.path.join(OUT, jid, "art"))
        a.frames()  # re-download
        if st["stage"] == "motion":
            set_stage(st, "motion", "Animating the key shots")
            a.motion(progress(st, "motion", 60, 71, "Animating shot"))
            json.dump(d, open(jfile(jid, "direction.json"), "w"), indent=1, ensure_ascii=False)
        stage_music(st, d)
        set_stage(st, "final_render", "Rendering the full video in 1080p", 72)
        media = publish_media(st, a, d)
        mp4 = render(build_film(st, d, words, total, media), os.path.join(OUT, jid, "final.mp4"), crf=19)
        st["final"] = {**link(drive.upload(job_folder(jid), "final.mp4", mp4, "video/mp4")), "size_mb": round(os.path.getsize(mp4) / 1e6, 1)}
        save_state(st)
        # thumbnail: key art + huge words
        key = a.have("key.png")
        if key:
            pdir = os.path.join(PUB, jid)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", key, "-q:v", "2", os.path.join(pdir, "key.jpg")], check=True)
            u = d["universe"]
            tp = {"w": 1280, "h": 720, "captions": False, "words": [], "audio": [], "music": None,
                  "look": {**build_film(st, d, words, total, media)["look"], "letterbox": False, "grain": 0.15},
                  "shots": [{"id": "t", "start": 0, "dur": 60, "kind": "image", "src": f"job/{jid}/key.jpg", "camera": "static",
                             "overlay": {"type": "quote", "text": (d.get("thumbnail") or {}).get("text", "")[:40], "at": 0}}]}
            jpg = render(tp, os.path.join(OUT, jid, "thumb.jpg"), still=True, frame=30)
            st["thumb"] = link(drive.upload(job_folder(jid), "thumbnail.jpg", jpg, "image/jpeg"))
        # Shorts: vertical frames for the shots inside each Short, voice trimmed to the window
        st["shorts"] = []
        bt = beat_times(st, words, total)
        for k, sh in enumerate(d.get("shorts", [])):
            ids = sorted(int(x) for x in sh["beats"] if str(x).isdigit() and int(x) < len(bt) - 1)
            if not ids:
                continue
            t0w, t1w = bt[ids[0]], min(total, bt[ids[-1] + 1]) + 0.6
            set_stage(st, "final_render", f"Rendering Short {k + 1}/{len(d['shorts'])}", 80 + k * 3)
            sub = {**d, "shots": [s for s in d["shots"] if s["beat"] in ids]}
            try:
                a2 = artmod.Art(st, sub, os.path.join(OUT, jid, "art"))
                a2.frames(aspect="9:16", suffix="-v")
                vmedia = publish_media(st, a2, sub, vertical=True)
            except budget.OverBudget:
                vmedia = media
            props = build_film(st, sub, words, total, vmedia, w=1080, h=1920, window=(t0w, t1w))
            smp4 = render(props, os.path.join(OUT, jid, f"short{k + 1}.mp4"), crf=20)
            st["shorts"].append({"title": sh.get("title", ""), "beats": ids, "duration": round(t1w - t0w, 1),
                                 **link(drive.upload(job_folder(jid), f"short-{k + 1}.mp4", smp4, "video/mp4"))})
            save_state(st)
        set_stage(st, "metadata", "Writing the title, description and chapters")
        st["meta"] = write_metadata(st, d, words, total)
        set_stage(st, "final_ready", "Final video, Shorts and thumbnail ready for your review")
        return True
    return False


def write_metadata(st, d, words, total):
    script = st["brew"]["script"]
    bt = beat_times(st, words, total)
    chapters = [{"t": int(bt[i]), "vo": voice.strip_tags(b.get("vo", ""))[:120]} for i, b in enumerate(script.get("beats", []))]
    prompt = f"""Write YouTube metadata for a Curious Penguin video. Voice: curious, warm, a bit cheeky, never clickbait lies.
Topic: {st.get('q')}
Visual universe: {d['universe']['name']}
Candidate titles: {script.get('titles')}
Beats with start seconds: {json.dumps(chapters, ensure_ascii=False)}
Facts to keep honest: {script.get('verify', [])[:8]}
Penguin cameos (for a pinned comment game): {[s['penguin']['bit'] for s in d['shots'] if s.get('penguin')]}
Return JSON: {{"title": "max 70 chars, curiosity first", "alt_titles": [2 more], "description": "2 short paragraphs, a blank line, then 5-8 chapters as 'm:ss Label' starting at 0:00, then 3 hashtags",
"tags": [12-18 tags], "pinned_comment": "a playful 'how many times did you spot the penguin?' style question", "shorts": [{{"title": "", "description": "1 line + 2 hashtags"}}]}}"""
    try:
        out = gai.ask_json(prompt, temperature=0.6)
        budget.log(st["id"], "text_call", 1, gai.LAST["backend"])
        return out
    except Exception as e:
        log("metadata failed:", str(e)[:200])
        return {"title": (script.get("titles") or [st.get("q")])[0], "description": st.get("q", ""), "tags": []}


def main():
    os.makedirs(JOBS, exist_ok=True)
    make_sfx()
    handle_inbox()
    order = {s: i for i, s in enumerate(["motion", "final_render", "metadata", "queued", "directing", "voicing", "art", "test_render"])}
    work = sorted([s for s in all_states() if s.get("stage") in order and s.get("v") == 2], key=lambda s: (order[s["stage"]], s.get("updated", "")))
    publish_status()
    for st in work:
        if time.time() - T0 > BUDGET_SEC:
            log("time budget used; the rest waits for the next run")
            break
        try:
            advance(st)
        except budget.OverBudget as e:
            st["error"] = f"Paused: {e}"
            st["step"] = "Paused by the spending cap. Raise it in config/budget.json or approve a cheaper redo"
            save_state(st); publish_status()
        except Exception as e:
            msg = str(e)
            log(f"job {st['id']} failed: {msg}")
            st["error"] = msg[:400]
            if "wallet is empty" in msg or "GCP_SA_KEY" in msg:
                st["step"] = "Waiting for the Vertex AI key (GCP_SA_KEY) so the Google credits can pay"
                save_state(st); publish_status()
                break
            st["fails"] = st.get("fails", 0) + 1
            st["step"] = "Hit an error. Retrying next run" if st["fails"] < 3 else "Stopped after 3 errors. Send a redo to retry"
            if st["fails"] >= 3:
                st["stage"] = "failed"
            save_state(st); publish_status()
    publish_status()


if __name__ == "__main__":
    main()
