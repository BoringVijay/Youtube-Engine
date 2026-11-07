#!/usr/bin/env python3
"""Director: picks the visual universe for a topic and writes the shot list, penguin cameos included."""
import json, os, re

import gai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIBLE = open(os.path.join(ROOT, "creative", "bible.md")).read()
FONTS = ["inter", "anton", "serif", "typewriter", "marker", "mono", "archivo"]
FILMS = ["clean", "16mm", "vhs", "print", "noir"]
CAMERAS = ["push_in", "pull_out", "pan_left", "pan_right", "tilt_down", "tilt_up", "crane_down", "snap_zoom", "handheld", "static", "drift"]
TRANSITIONS = ["cut", "fade", "dip", "whip", "flash"]
CAMEOS = ["hidden", "eavesdrop", "caught_in_event", "slapstick", "wrong_place", "outfit", "fly_attempt"]


def recent_universes(exclude_id):
    out = []
    for d in sorted(os.listdir(os.path.join(ROOT, "jobs"))):
        p = os.path.join(ROOT, "jobs", d, "direction.json")
        if d != exclude_id and os.path.exists(p):
            try:
                out.append(json.load(open(p))["universe"]["name"])
            except Exception:
                pass
    return out[-6:]


def direct(st, est_seconds, max_motion=6, notes="", short=False):
    script = st["brew"]["script"]
    beats = [{"i": i, "vo": re.sub(r"\[[a-z ]+\]", "", b.get("vo", "")).strip(), "idea": b.get("visual", "")} for i, b in enumerate(script.get("beats", []))]
    n_shots = max(8, round(est_seconds / (3.2 if short else 5.5)))
    angle = st["brew"].get("angle", "")
    prompt = f"""You are the director and production designer of Curious Penguin, a YouTube channel where every video is a different creative experience.
Read the creative bible, then direct this video.

=== CREATIVE BIBLE ===
{BIBLE}
=== END BIBLE ===

Topic: {st.get('q')}
Audience: {st['brew'].get('aud', 'general curious')}
Creator's angle and tone notes: {angle or 'none'}
Universes used in the last videos (do NOT reuse): {recent_universes(st['id']) or 'none yet'}
{('Reviewer notes from the last cut, apply them: ' + notes) if notes else ''}

FORMAT: {"a vertical 9:16 YouTube Short. Compose every shot for a phone screen (tall frames, subject in the middle third, big readable shapes), cut fast, hook in the first second. One penguin cameo is enough (0 to 2). Return an empty shorts list." if short else "a 16:9 long-form video."}

Script beats (VO is final, do not rewrite it):
{json.dumps(beats, ensure_ascii=False)}

Your job:
1. Follow the anthology rule: invent this episode's studio (name, point of view), choose ONE visual universe that fits the topic's emotional truth (from the bible palette or a fresh invention) and explain why in one line. Decide the pacing, the signature shot, and an optional medium-break gag (max one, never on a serious beat).
2. Write the look bible: one dense paragraph that will be appended to every image prompt (medium, materials, palette, lighting, lens, texture, camera language). Make it specific enough that 40 frames look like one film.
3. Describe how the penguin is rendered in this universe (keep all its fixed traits).
4. Write about {n_shots} shots ({n_shots - 4} to {n_shots + 6}) covering every beat in order. Each shot:
   - "beat": beat index; "cue": the exact first 3 to 5 words of the VO line where this shot starts (copied from the VO, so we can cut on the word).
   - "prompt": the scene for the image model: subject, action, composition, shot size, foreground and background, one focal point, calm lower fifth. Concrete and visual, with a small idea or joke in it. No numbers or important text inside images (a deliberate sign or label gag is fine, max 3 words, spelled exactly). Never name a real company, brand or product in a prompt and never ask for a logo: describe them generically ("four giant tech-company cable ships"). No stick figures: people are made of the universe's own material. Every shot must look different from the others (vary subject, scale, angle, location); never repeat the same hero object more than 3 times.
   - "kind": "motion" for at most {max_motion} shots that deserve real animation (the hook shot, the twist, the biggest joke, the emotional peak, a cameo payoff). Everything else "still".
   - "motion": for motion shots, what moves in 8 seconds (camera and action, physically plausible, no text).
   - "camera": one of {CAMERAS} (for stills; pick for meaning: push_in reveal, crane_down scale, static for deadpan, snap_zoom for punchlines, handheld for tension).
   - "focus": [x, y] 0-1 of the focal point.
   - "transition": one of {TRANSITIONS} into this shot (mostly cut; whip for energy, dip for time jumps, flash for shocks, fade for emotion).
   - "penguin": null, or {{"type": one of {CAMEOS}, "bit": "exactly what it is doing, its outfit, where in frame"}}. 2 to 4 cameos across the video, varied types, at least one subtle hidden one, none on tragic or serious beats, a fly_attempt near the end.
   - "overlay": null, or a designed overlay for numbers and key words, drawn in the universe's style: {{"type": "counter", "value": number, "prefix": "", "suffix": "", "text": "what it counts", "at": seconds_into_shot, "pos": "top|center|left|right"}}, or {{"type": "label", "text": "max 7 words", "pos": "top"}}, or {{"type": "bars", "text": "title with the unit", "bars": [{{"label": "", "value": real number in that unit}}], "suffix": " unit"}} (real values from the VO or verify notes, never made-up index numbers), or {{"type": "quote"|"chapter", "text": "max 6 words"}}. Numbers ONLY from the VO. Use overlays where a number or idea needs to stick, not on every shot.
   - "nerd_bonus": true when the VO says nerd bonus or gives the deep technical detail; that shot is drawn as a blueprint plate whatever the universe.
   - "sfx": a short sound cue that fits the medium and moment, or null. Meme-style cues only where they truly land.
5. Visual style for captions and overlays: palette (paper, ink, accent, accent2 as hex), font from {FONTS}, film texture from {FILMS}, grain 0-1, vignette 0-1, letterbox true/false.
6. Music: a prompt for a 30-second instrumental loop with this studio's own instrumentation (see the bible's score notes), tempo and feel, no vocals.
7. Thumbnail: one striking frame (prompt) plus 2 to 4 huge words.
8. Shorts: pick {int(st['brew'].get('format', {}).get('shorts', 1) or 1)} runs of consecutive beats (25 to 55 seconds of VO) that work alone, hook first. Give each a title.

Return JSON:
{{"universe": {{"name": "", "studio": "", "why": "", "pacing": "", "signature_shot": "", "medium_break": "", "look_bible": "", "penguin_render": "", "palette": {{"paper": "#", "ink": "#", "accent": "#", "accent2": "#"}},
  "font": "", "film": "", "grain": 0.3, "vignette": 0.5, "letterbox": false, "music": ""}},
 "shots": [{{"id": "s01", "beat": 0, "cue": "", "kind": "still", "prompt": "", "motion": "", "camera": "", "focus": [0.5, 0.5], "transition": "cut", "penguin": null, "overlay": null, "nerd_bonus": false, "sfx": null}}],
 "thumbnail": {{"prompt": "", "text": ""}},
 "shorts": [{{"title": "", "beats": [0, 1, 2]}}]}}"""
    d = gai.ask_json(prompt, kind="pro", temperature=0.9, timeout=300)
    return validate(d, len(beats), max_motion)


def validate(d, n_beats, max_motion):
    u = d.get("universe") or {}
    pal = u.get("palette") or {}
    hexok = lambda c, dflt: c if isinstance(c, str) and re.match(r"^#[0-9a-fA-F]{6}$", c) else dflt
    u["palette"] = {"paper": hexok(pal.get("paper"), "#F2EADB"), "ink": hexok(pal.get("ink"), "#151515"),
                    "accent": hexok(pal.get("accent"), "#FF5A1F"), "accent2": hexok(pal.get("accent2"), "#2F6BFF")}
    u["font"] = u.get("font") if u.get("font") in FONTS else "inter"
    u["film"] = u.get("film") if u.get("film") in FILMS else "clean"
    u["grain"] = max(0.0, min(1.0, float(u.get("grain") or 0.3)))
    u["vignette"] = max(0.0, min(1.0, float(u.get("vignette") or 0.5)))
    u["letterbox"] = bool(u.get("letterbox"))
    shots, motion = [], 0
    for k, s in enumerate(d.get("shots", [])):
        if not isinstance(s, dict) or not s.get("prompt"):
            continue
        try:
            b = int(s.get("beat", 0))
        except Exception:
            b = 0
        s["beat"] = max(0, min(n_beats - 1, b))
        s["id"] = f"s{len(shots) + 1:02d}"
        s["camera"] = s.get("camera") if s.get("camera") in CAMERAS else "drift"
        s["transition"] = s.get("transition") if s.get("transition") in TRANSITIONS else "cut"
        f = s.get("focus")
        s["focus"] = [max(0, min(1, float(f[0]))), max(0, min(1, float(f[1])))] if isinstance(f, list) and len(f) == 2 else [0.5, 0.5]
        if s.get("kind") == "motion" and motion < max_motion and s.get("motion"):
            motion += 1
        else:
            s["kind"] = "still"
        pg = s.get("penguin")
        s["penguin"] = pg if isinstance(pg, dict) and pg.get("bit") else None
        ov = s.get("overlay")
        if isinstance(ov, dict) and ov.get("type") in ("counter", "label", "bars", "quote", "chapter"):
            if ov["type"] == "counter" and not isinstance(ov.get("value"), (int, float)):
                ov = {"type": "label", "text": ov.get("text", "")} if ov.get("text") else None
            if ov and ov["type"] == "bars":
                ov["bars"] = [x for x in ov.get("bars", []) if isinstance(x, dict) and isinstance(x.get("value"), (int, float))][:5]
                if len(ov["bars"]) < 2:
                    ov = None
        else:
            ov = None
        s["overlay"] = ov
        shots.append(s)
    # keep beat order monotonic
    shots.sort(key=lambda s: (s["beat"], int(s["id"][1:])))
    for i, s in enumerate(shots):
        s["id"] = f"s{i + 1:02d}"
    covered = {s["beat"] for s in shots}
    for b in range(n_beats):
        if b not in covered:
            near = min(shots, key=lambda s: abs(s["beat"] - b)) if shots else None
            shots.append({**(near or {}), "id": f"s{len(shots) + 1:02d}", "beat": b, "cue": "", "kind": "still", "overlay": None, "penguin": None,
                          "camera": "drift", "prompt": (near or {}).get("prompt", "an establishing shot")})
    shots.sort(key=lambda s: (s["beat"], s["id"]))
    for i, s in enumerate(shots):
        s["id"] = f"s{i + 1:02d}"
    d["universe"], d["shots"] = u, shots
    d["shorts"] = [sh for sh in d.get("shorts", []) if isinstance(sh, dict) and sh.get("beats")][:3]
    return d
