#!/usr/bin/env python3
"""Curious Penguin Shorts (engine v3): 50-60 s, vertical, every shot animated.

Plan: the director writes 3-5 SEQUENCES. Inside a sequence, shots are chained: each clip is animated from keyframe K(i)
to K(i+1) with Veo's first+last frame control, so the sequence plays as one continuous camera move. Between sequences
we cut (match cut, whip, dip). The penguin is cast in a role for every story.
"""
import base64, json, os, re, subprocess, time
from concurrent.futures import ThreadPoolExecutor

import art as artmod
import budget
import gai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE = open(os.path.join(ROOT, "creative", "bible.md")).read()
CFG = json.load(open(os.path.join(ROOT, "config", "shorts.json")))
FONTS = ["inter", "anton", "serif", "typewriter", "marker", "mono", "archivo"]
FILMS = ["clean", "16mm", "vhs", "print", "noir"]
ROLES = ["protagonist", "sidekick", "villain", "antagonist", "npc", "cameo"]


def log(*a):
    print(time.strftime("%H:%M:%S"), "[shorts]", *a, flush=True)


def recent_universes(exclude):
    out = []
    for d in sorted(os.listdir(os.path.join(ROOT, "jobs"))):
        p = os.path.join(ROOT, "jobs", d, "direction.json")
        if d != exclude and os.path.exists(p):
            try:
                out.append(json.load(open(p))["universe"]["name"])
            except Exception:
                pass
    return out[-6:]


def direct(st, notes=""):
    script = st["brew"]["script"]
    beats = [re.sub(r"\[[a-z ]+\]", "", b.get("vo", "")).strip() for b in script.get("beats", [])]
    words = sum(len(b.split()) for b in beats)
    secs = words / 2.75
    n_shots = max(7, min(12, round(secs / CFG["shot_seconds"])))
    prompt = f"""You are the director of Curious Penguin, an anthology YouTube Shorts channel: every episode is a new studio and a new visual universe,
and every shot is real animation (no stills, no slideshow). Read the bible, then direct this Short.

=== CREATIVE BIBLE ===
{BIBLE}
=== END BIBLE ===

Topic: {st.get('q')}
Creator notes / angle: {st['brew'].get('angle', '') or 'none'}
Penguin casting hint (optional): {st['brew'].get('penguin_role', '') or 'decide from the story'}
Universes used recently (do NOT reuse): {recent_universes(st['id']) or 'none yet'}
{('Reviewer notes from the last cut, apply them: ' + notes) if notes else ''}

VO beats (final, do not rewrite), about {secs:.0f} seconds:
{json.dumps([{"i": i, "vo": b} for i, b in enumerate(beats)], ensure_ascii=False)}

FORMAT: vertical 9:16 Short, {n_shots} animated shots of about {CFG['shot_seconds']} seconds (each 4 to 8 s), grouped into 3 to 5 SEQUENCES.
Inside a sequence the shots are CHAINED: the end frame of one shot is the start frame of the next, so the sequence plays as one continuous camera move
(like a crane down through layered paper water to a glowing cable). Between sequences we cut, ideally on a match (shape, colour, motion direction).

Plan it like a film:
1. Studio brief (anthology rule): studio name, universe and why, pacing, signature shot, optional medium-break gag.
2. Cast the penguin for THIS story: one of {ROLES}. As protagonist, sidekick, villain or antagonist it appears in most shots and drives or reacts to the action;
   as npc it does its own odd job in the background of many shots; as cameo it appears 1 to 2 times. It never talks. Never in a shot that shows real harm or loss.
   Write the penguin's arc in one line (what it wants, what goes wrong, the payoff).
3. Look bible: one dense paragraph appended to every image and motion prompt (medium, materials, palette, lighting, lens, texture, how motion feels in this medium:
   e.g. stop-motion stepping for clay, sliding parallax layers for paper, film gate weave for 16mm). Specific enough that every shot looks like one film.
4. Keyframes: a list of still frames. For each sequence give its keyframes in order (n shots in a sequence need n+1 keyframes).
   Each keyframe: a vivid vertical composition (subject, action pose, foreground/midground/background layers, one focal point, calm lower fifth for captions),
   whether the penguin is in it (and exactly what it is doing, wearing, where in frame). Consecutive keyframes in a sequence are the SAME world with the camera
   and characters moved on, so they can be animated into each other. No text or numbers in keyframes (a deliberate 1-3 word sign gag is ok, spelled exactly).
   Never name real companies, brands or logos. No stick figures.
5. Shots: each shot animates keyframe "from" to keyframe "to" (consecutive in its sequence). Give "motion": one sentence of continuous camera move + action,
   physically plausible for the medium, and "cue": the exact first 3 to 5 words of the VO where this shot starts (copied from the beats, in order, every beat covered).
   Optional "overlay" when a number or key word must stick, drawn in the universe style: {{"type": "counter", "value": number, "suffix": "", "text": "", "pos": "top"}},
   {{"type": "label", "text": "max 6 words", "pos": "top"}}, or {{"type": "quote", "text": "max 6 words"}}. Numbers only from the VO, exactly as said, one value per fact.
   "transition" into the shot: "chain" inside a sequence; "cut", "match", "whip", "dip" or "flash" at the start of a sequence. "sfx": a short medium-fitting cue or null.
   "serious": true for shots about real harm or loss.
6. Captions/overlay style: palette (paper, ink, accent, accent2 hex), font from {FONTS}, film texture from {FILMS}, grain 0-1, vignette 0-1.
7. Music: a 30-second instrumental loop in this studio's own instrumentation, no vocals.
8. Cover: the signature shot as a still prompt, plus 2 to 4 huge words.

Return JSON:
{{"universe": {{"name": "", "studio": "", "why": "", "pacing": "", "signature_shot": "", "medium_break": "", "look_bible": "", "penguin_render": "",
  "palette": {{"paper": "#", "ink": "#", "accent": "#", "accent2": "#"}}, "font": "", "film": "", "grain": 0.3, "vignette": 0.5, "music": ""}},
 "penguin": {{"role": "", "arc": ""}},
 "sequences": [{{"name": "", "keyframes": [{{"id": "k01", "prompt": "", "penguin": "what it is doing, or null"}}],
   "shots": [{{"from": "k01", "to": "k02", "cue": "", "motion": "", "overlay": null, "transition": "cut", "sfx": null, "serious": false}}]}}],
 "cover": {{"prompt": "", "text": ""}}}}"""
    d = gai.ask_json(prompt, kind="pro", temperature=0.9, timeout=300)
    return validate(d, len(beats))


def validate(d, n_beats):
    u = d.get("universe") or {}
    pal = u.get("palette") or {}
    hexok = lambda c, dflt: c if isinstance(c, str) and re.match(r"^#[0-9a-fA-F]{6}$", c) else dflt
    u["palette"] = {k: hexok(pal.get(k), v) for k, v in (("paper", "#F2EADB"), ("ink", "#151515"), ("accent", "#FF5A1F"), ("accent2", "#2F6BFF"))}
    u["font"] = u.get("font") if u.get("font") in FONTS else "inter"
    u["film"] = u.get("film") if u.get("film") in FILMS else "clean"
    u["grain"] = max(0.0, min(1.0, float(u.get("grain") or 0.25)))
    u["vignette"] = max(0.0, min(1.0, float(u.get("vignette") or 0.4)))
    u["letterbox"] = False
    keyframes, shots = {}, []
    kn = 0
    for si, seq in enumerate(d.get("sequences", [])):
        ids = {}
        for kf in seq.get("keyframes", []):
            if not isinstance(kf, dict) or not kf.get("prompt"):
                continue
            kn += 1
            nid = f"k{kn:02d}"
            ids[kf.get("id")] = nid
            pg = kf.get("penguin")
            keyframes[nid] = {"id": nid, "seq": si, "prompt": kf["prompt"], "penguin": pg if isinstance(pg, str) and pg.strip() and pg.lower() != "null" else None,
                              "prev": None}
        order = [ids[k.get("id")] for k in seq.get("keyframes", []) if isinstance(k, dict) and k.get("id") in ids]
        for a, b in zip(order, order[1:]):
            keyframes[b]["prev"] = a  # generated with the previous keyframe as reference: same world, camera moved on
        for j, sh in enumerate(seq.get("shots", [])):
            if not isinstance(sh, dict):
                continue
            fr, to = ids.get(sh.get("from")), ids.get(sh.get("to"))
            if not fr:
                fr = order[j] if j < len(order) else (order[-1] if order else None)
            if not fr:
                continue
            ov = sh.get("overlay")
            if not (isinstance(ov, dict) and ov.get("type") in ("counter", "label", "quote")) or (ov.get("type") == "counter" and not isinstance(ov.get("value"), (int, float))):
                ov = None
            serious = bool(sh.get("serious"))
            if serious:
                for k in (fr, to):
                    if k and keyframes[k]["penguin"]:
                        keyframes[k]["penguin"] = None
            tr = sh.get("transition") or ("chain" if j else "cut")
            if j == 0 and tr == "chain":
                tr = "cut"
            shots.append({"id": f"s{len(shots) + 1:02d}", "seq": si, "from": fr, "to": to if to != fr else None, "cue": sh.get("cue", ""),
                          "motion": sh.get("motion", ""), "overlay": ov, "transition": tr if tr in ("chain", "cut", "match", "whip", "dip", "flash") else "cut",
                          "sfx": sh.get("sfx"), "serious": serious})
    if not shots:
        raise RuntimeError("director returned no shots")
    pr = (d.get("penguin") or {})
    d2 = {"format": "short", "universe": u, "penguin": {"role": pr.get("role") if pr.get("role") in ROLES else "cameo", "arc": pr.get("arc", "")},
          "keyframes": keyframes, "shots": shots, "cover": d.get("cover") or {}, "n_beats": n_beats}
    log(f"universe {u.get('name')} / {u.get('studio')}; penguin {d2['penguin']['role']}; {len(keyframes)} keyframes, {len(shots)} shots in {len(d.get('sequences', []))} sequences")
    return d2


# ---------------- keyframes ----------------
def keyframe_prompt(kf, d):
    u = d["universe"]
    p = f"{kf['prompt']}\n\nVISUAL UNIVERSE: {u['look_bible']}\n"
    if kf.get("prev"):
        p = ("Continue from the reference frame: the SAME world, set, lighting, characters and style, with the camera and the action moved on to this moment: "
             + p)
    if kf.get("penguin"):
        p += (f"\nTHE PENGUIN ({d['penguin']['role']}): {kf['penguin']}. Copy the character exactly from the penguin reference, rendered as: {u.get('penguin_render', '')}. "
              f"{artmod.PENGUIN}\n")
    else:
        p += "\nNo penguin in this frame.\n"
    return p + "\nVertical 9:16 frame for a phone. " + artmod.RULES


def keyframes(a, d, progress=None):
    """Generate keyframes in sequence order. A chained keyframe uses its predecessor as the continuity reference."""
    pen = a.have("penguin.png")
    if not pen:
        u = d["universe"]
        artmod.image(f"The penguin from the reference sheet re-imagined inside this visual universe: {u['look_bible']}\nRender it as: {u.get('penguin_render', '')}. "
                     f"Full body, three-quarter view, neutral pose, plain background in the universe's palette. {artmod.PENGUIN}", a.path("penguin.png"),
                     refs=[artmod.ensure_canon()], job=a.job, aspect="1:1", size="1K")
        a.keep("penguin.png", "image/png")
        pen = a.path("penguin.png")
    gai.pin("image", a.man.get("image_model"))
    kfs = d["keyframes"]
    seqs = {}
    for k in sorted(kfs):
        seqs.setdefault(kfs[k]["seq"], []).append(k)
    done = [0]

    def run_seq(ids):
        for k in ids:
            name = f"{k}.png"
            if a.have(name):
                done[0] += 1
                continue
            kf = kfs[k]
            refs = []
            if kf.get("prev") and a.have(f"{kf['prev']}.png"):
                refs.append(a.have(f"{kf['prev']}.png"))
            if kf.get("penguin"):
                refs.append(pen)
            for attempt in range(3):
                try:
                    artmod.image(keyframe_prompt(kf, d), a.path(name), refs=refs, aspect="9:16", job=a.job)
                    a.keep(name, "image/png")
                    break
                except budget.OverBudget:
                    raise
                except Exception as e:
                    log(f"keyframe {k} attempt {attempt + 1}: {str(e)[:160]}")
                    time.sleep(10 * (attempt + 1))
            done[0] += 1
            if progress:
                progress(done[0], len(kfs))
    # sequences in parallel, keyframes within a sequence in order (continuity needs the previous frame)
    with ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(run_seq, seqs.values()))


# ---------------- motion ----------------
def veo_seconds(span):
    for s in (4, 6, 8):
        if span <= s + 0.25:
            return s
    return 8


def motion(a, d, spans, progress=None, cancelled=None):
    """Animate every shot. Chained shots use first AND last frame so the sequence flows without a seam."""
    tier = CFG.get("veo_tier", "veo")
    res = CFG.get("resolution", "720p")
    shots = d["shots"]
    done = [0]

    def one(sh):
        name = f"{sh['id']}.mp4"
        if a.have(name):
            done[0] += 1
            return
        if cancelled and cancelled():
            return
        first = a.have(f"{sh['from']}.png")
        last = a.have(f"{sh['to']}.png") if sh.get("to") else None
        if not first:
            log("no first frame for", sh["id"])
            return
        secs = veo_seconds(spans.get(sh["id"], CFG["shot_seconds"]))
        u = d["universe"]
        prompt = (f"{sh['motion']}\n\nOne continuous shot, no cuts. Keep the exact look of the frames: {u['look_bible']}\n"
                  "Smooth, physically plausible motion that suits the medium. No morphing faces, no new text, no captions, no logos.")
        if any(d["keyframes"][k].get("penguin") for k in (sh["from"], sh.get("to")) if k):
            prompt += f"\nThe penguin keeps its exact design: {artmod.PENGUIN}"
        price_kind = "video_lite_per_sec" if tier == "veo_lite" else "video_per_sec"
        budget.check(a.job, price_kind, secs)
        order = gai.CANDIDATES[tier] + ([m for m in gai.CANDIDATES["veo"]] if tier == "veo_lite" else [])
        last_err = None
        for attempt in range(3):
            for model in ([gai._chosen[tier]] if tier in gai._chosen else order):
                try:
                    data = gai.veo(model, prompt, artmod.b64(first), "9:16", secs, res, False, last_b64=artmod.b64(last) if last else None)
                    gai._chosen[tier] = model
                    open(a.path(name), "wb").write(data)
                    budget.log(a.job, price_kind, secs, "vertex")
                    a.keep(name, "video/mp4")
                    last_err = None
                    break
                except Exception as e:
                    last_err = str(e)
                    if re.search(r"HTTP 404|NOT_FOUND|not found", last_err):
                        continue
                    if re.search(r"429|RESOURCE_EXHAUSTED|503|UNAVAILABLE|timed out", last_err):
                        time.sleep(30 * (attempt + 1))
                        break
                    if last and re.search(r"lastFrame|last_frame|last frame", last_err, re.I):
                        last = None  # model can't do first+last: fall back to first frame only
                        break
                    break
            if last_err is None:
                break
        if last_err:
            log(f"motion {sh['id']} failed: {last_err[:240]}")
        done[0] += 1
        if progress:
            progress(done[0], len(shots))
    with ThreadPoolExecutor(max_workers=int(CFG.get("motion_workers", 3))) as ex:
        list(ex.map(one, shots))


# ---------------- timeline ----------------
def norm(w):
    return re.sub(r"[^a-z0-9%]+", "", w.lower())


def shot_times(d, words, total):
    """Start of each shot = time its cue word is spoken (in order); the first shot starts at 0."""
    import voice
    starts, after = [], 0.0
    shots = d["shots"]
    for i, sh in enumerate(shots):
        t = voice.cue_time(words, sh.get("cue"), after) if i else 0.0
        if t is None:
            t = after + (total - after) / max(1, len(shots) - i)
        t = 0.0 if i == 0 else max(after + 1.2, t)
        starts.append(t)
        after = t
    ends = starts[1:] + [total + 0.8]
    return starts, ends


def build_film(st, d, words, total, media, w=1080, h=1920, preview=False):
    """media: {shot_id: {"vid": public path or None, "img": public path}}."""
    starts, ends = shot_times(d, words, total)
    fps = CFG["fps"]
    film, audio = [], []
    for sh, a, b in zip(d["shots"], starts, ends):
        m = media.get(sh["id"], {})
        span = b - a
        base = {"id": sh["id"], "start": int(round(a * fps)), "dur": max(1, int(round(span * fps))), "overlay": sh.get("overlay"),
                "transition": {"chain": "cut", "match": "cut"}.get(sh["transition"], sh["transition"]), "focus": [0.5, 0.45]}
        if m.get("vid") and not preview:
            clip = m.get("vid_secs") or veo_seconds(span)
            rate = max(0.8, min(1.6, clip / max(0.5, span)))  # fit the clip to the line: gentle speed change, never a freeze
            film.append({**base, "kind": "video", "src": m["vid"], "rate": round(rate, 3)})
        elif m.get("img"):
            film.append({**base, "kind": "image", "src": m["img"], "camera": "push_in"})
        if sh.get("sfx") and sh["transition"] not in ("chain",):
            import produce
            f, v = produce.sfx_for(sh["sfx"], sh["transition"])
            if f:
                audio.append({"src": f"sfx/{f}", "start": max(0, base["start"] - 4), "volume": v})
    u = d["universe"]
    pal = u["palette"]
    look = {"paper": pal["paper"], "ink": pal["ink"], "accent": pal["accent"], "accent2": pal["accent2"], "font": u["font"], "film": u["film"],
            "grain": min(u["grain"], 0.35), "vignette": u["vignette"], "letterbox": False, "captionBg": pal["ink"], "captionInk": pal["paper"]}
    audio.insert(0, {"src": f"job/{st['id']}/voice.mp3", "start": 0, "volume": 1})
    pub = os.path.join(ROOT, "public", "job", st["id"], "music.wav")
    music = {"src": f"job/{st['id']}/music.wav", "volume": 0.08} if os.path.exists(pub) else None
    return {"w": w, "h": h, "fps": fps, "look": look, "shots": film, "words": words, "audio": audio, "music": music, "captions": True}


def spans_for(d, words, total):
    starts, ends = shot_times(d, words, total)
    return {sh["id"]: round(b - a, 2) for sh, a, b in zip(d["shots"], starts, ends)}
