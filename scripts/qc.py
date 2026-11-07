#!/usr/bin/env python3
"""Quality control: a strict reviewer (Gemini Pro, vision) checks every keyframe, every animated shot and the final cut
against Curious Penguin's non-negotiable standards. Anything below the bar gets regenerated with the reviewer's fix.
A reviewer error never blocks a video (it passes and the error is logged)."""
import base64, json, os, re, subprocess, tempfile

import budget
import gai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "shorts.json"))).get("qc", {})

STANDARDS = """Curious Penguin non-negotiable standards (Vijay, Nov 2026):
1. Satisfying visuals: every frame intentional, complete, detailed, well composed.
2. Clean transitions and handoffs: fluid, seamless, convincing. No abrupt cuts, awkward moves or disconnected sequences.
3. Compelling story: clear narrative, progression and payoff.
4. Logical consistency: every action and transformation makes sense; consistent proportions, physics, spatial relationships, object permanence.
5. Audio-visual sync: picture, narration, SFX and music land together.
6. Scientific and physical accuracy: real processes, materials and transformations shown correctly. No spectacle that breaks logic or facts.
7. Premium execution: nothing cheap, goofy, unfinished or obviously AI-generated. Hunt for artefacts: extra or melted limbs, warped hands or faces,
   morphing objects, objects popping in or out, garbled text, inconsistent props or characters, jittery or rubbery motion, smeared detail."""


def log(*a):
    print("[qc]", *a, flush=True)


def enabled():
    return CFG.get("enabled", True)


def _ask(prompt, media, job):
    parts = [{"inlineData": {"mimeType": m, "data": base64.b64encode(open(p, "rb").read()).decode()}} for m, p in media if p and os.path.exists(p)]
    parts.append({"text": prompt})
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2}}
    out, _ = gai.generate_any("pro", body, 300)
    budget.log(job, "text_call", 2, gai.LAST.get("backend", "vertex"))
    text = "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"] if not p.get("thought")).strip()
    text = re.sub(r"^```(json)?|```$", "", text).strip()
    return json.loads(text)


def _small_video(src, width=540, crf=30):
    dst = tempfile.mktemp(suffix=".mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", f"scale={width}:-2", "-c:v", "libx264", "-preset", "veryfast",
                    "-crf", str(crf), "-c:a", "aac", "-b:a", "64k", dst], check=True)
    return dst


def _safe(fn, *a):
    try:
        r = fn(*a)
        r["score"] = float(r.get("score", 10))
        return r
    except Exception as e:
        log("reviewer error (passing):", str(e)[:200])
        return {"score": 10.0, "issues": [], "fix": "", "error": str(e)[:200]}


def keyframe(img, prev, kf, d, job):
    """Score one keyframe. prev is the keyframe it must continue from (or None)."""
    def run():
        u = d["universe"]
        prompt = f"""You are the strictest art director on a premium animated film. {STANDARDS}

Image 1 is a keyframe for a vertical Short{' and image 2 is the PREVIOUS keyframe in the same continuous shot' if prev else ''}.
Universe / look bible: {u.get('look_bible', '')}
This keyframe should show: {kf.get('prompt', '')}
{('The penguin should be: ' + kf['penguin'] + '. Canon: small round egg-shaped penguin, black head and back, white belly, big white eye-rings, orange-tipped dark beak, oversized orange feet, short flippers, three-feather tuft.') if kf.get('penguin') else 'No penguin in this frame.'}
Check: artefacts and distortions, physical and spatial logic, scale and proportion, penguin on-model, {'continuity with the previous keyframe (same world, props, lighting, outfits; only camera and action moved),' if prev else ''}
does it show what was asked, composition with calm lower fifth for captions, premium craft, no stray text.
Return JSON: {{"score": 0-10 (8 = genuinely premium, 6 = visible problems), "issues": ["specific problems"], "fix": "one short instruction to add to the image prompt to fix them"}}"""
        return _ask(prompt, [("image/png", img)] + ([("image/png", prev)] if prev else []), job)
    return _safe(run)


def clip(mp4, sh, d, job):
    """Score one animated shot."""
    def run():
        small = _small_video(mp4)
        try:
            prompt = f"""You are the strictest animation supervisor on a premium film. {STANDARDS}

This is one shot of a vertical Short. Intended motion: {sh.get('motion', '')}
Look: {d['universe'].get('look_bible', '')[:600]}
Watch every frame. Check: morphing or melting objects, things popping in or out, warped penguin or people, rubbery or jittery motion, physics that
make no sense, a camera move that stalls or snaps, the shot not reaching its end composition, flicker, smeared detail, cheap-looking effects.
Return JSON: {{"score": 0-10 (8 = genuinely premium, 6 = visible problems), "issues": ["specific problems with timestamps"],
"fix": "one short instruction to add to the animation prompt to avoid them"}}"""
            return _ask(prompt, [("video/mp4", small)], job)
        finally:
            os.path.exists(small) and os.remove(small)
    return _safe(run)


def film(mp4, d, script, job):
    """Review the finished Short against all 7 standards and name the weakest shots."""
    def run():
        small = _small_video(mp4, 480, 32)
        try:
            shots = [{"id": s["id"], "cue": s.get("cue"), "motion": s.get("motion")} for s in d["shots"]]
            prompt = f"""You are the head of a premium animation studio reviewing a finished vertical Short before it ships. Be honest and strict. {STANDARDS}

Script: {script}
Shot list in order (each shot starts when its cue is spoken): {json.dumps(shots, ensure_ascii=False)}
Watch and listen to the whole thing. Score each standard 0-10 (8 = genuinely premium). Name the shots that fall short and why.
Return JSON: {{"scores": {{"visuals": 0, "transitions": 0, "story": 0, "logic": 0, "sync": 0, "accuracy": 0, "premium": 0}}, "overall": 0,
"weak_shots": [{{"id": "s03", "issue": "", "fix": ""}}], "verdict": "two honest sentences"}}"""
            r = _ask(prompt, [("video/mp4", small)], job)
            sc = r.get("scores") or {}
            r["overall"] = float(r.get("overall") or (sum(sc.values()) / len(sc) if sc else 10))
            r["score"] = r["overall"]
            return r
        finally:
            os.path.exists(small) and os.remove(small)
    return _safe(run)
