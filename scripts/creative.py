#!/usr/bin/env python3
"""The creative catalog (config/creative.json): voices, delivery tones, visual looks, story formats, penguin modes, audio modes.

The board sends the picks in the brew message (look, story, penguin_role, audio, voice, voice_style). Everything here
falls back to the old behaviour when a pick is missing, so Shorts brewed before this existed render exactly as before.
"""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = json.load(open(os.path.join(ROOT, "config", "creative.json")))
REFS = os.path.join(ROOT, "creative", "references")


def brew(st):
    return st.get("brew") or {}


def look(st):
    k = brew(st).get("look") or "auto"
    return k if k in CAT["looks"] and k != "auto" else None


def story(st):
    k = brew(st).get("story") or ""
    return k if k in CAT["formats"] else None


def audio(st):
    k = brew(st).get("audio") or "narrated"
    if story(st) == "silent":
        k = "music"
    return k if k in CAT["audio"] else "narrated"


def music_only(st):
    return audio(st) == "music"


def music_volume(st, default=0.08):
    return float(CAT["audio"].get(audio(st), {}).get("music_volume", default))


def penguin(st):
    """auto | protagonist | sidekick | villain | npc | cameo | ending | none"""
    k = (brew(st).get("penguin_role") or "auto").lower()
    return k if k in CAT["penguin"] else "auto"


def tone(st, legacy=None):
    """Delivery style text for the chosen tone id (new catalog first, then config/voice_styles.json)."""
    sid = brew(st).get("voice_style") or ""
    if sid in CAT["tones"]:
        return sid, CAT["tones"][sid]["style"]
    legacy = legacy or {}
    if sid in legacy:
        return sid, legacy[sid]["style"]
    return None, None


def playbook(fmt):
    """What the reference study learned for this story format (creative/references/playbook.md), trimmed for the prompt."""
    p = os.path.join(REFS, "playbook.md")
    if not os.path.exists(p):
        return ""
    txt = open(p).read()
    if fmt:
        # keep the general section plus the section for this format
        parts = txt.split("\n## ")
        keep = [parts[0]] + ["## " + s for s in parts[1:] if s.lower().startswith(("general", fmt.lower(), CAT["formats"].get(fmt, {}).get("name", "~").lower()))]
        txt = "\n".join(keep)
    return txt[:5000]


def director_block(st):
    """Extra direction appended to the director prompt. Empty string when nothing was picked (old behaviour)."""
    out = []
    lk, fm, pg, au = look(st), story(st), penguin(st), audio(st)
    if lk:
        L = CAT["looks"][lk]
        out.append(f"VISUAL UNIVERSE IS CHOSEN BY THE CREATOR: {L['name']}. Build the whole Short in this look (it overrides the 'do not reuse' list and the "
                   f"universe palette in the bible): {L['bible']} Invent a fresh studio name and point of view inside this look. Characters and worlds are "
                   "original: never reproduce existing franchises, characters, logos or a specific studio's designs.")
    if fm:
        F = CAT["formats"][fm]
        out.append(f"STORY FORMAT: {F['name']}. Script intent: {F['script']} Direction: {F['direct']}")
    if pg == "none":
        out.append("PENGUIN: NOT IN THIS SHORT. Do not put the penguin (or any penguin) in any keyframe. This overrides the bible's penguin rules. "
                   "Set penguin.role to \"none\".")
    elif pg == "ending":
        out.append("PENGUIN: ONLY AT THE VERY END. The whole Short is its own story in the chosen look with no penguin at all, then the penguin appears only "
                   "in the last 1 or 2 keyframes of the final sequence as a signature sting (it wanders in, reacts to what just happened, tries to fly and "
                   "fails, or simply looks at camera). Rendered in the same look. Set penguin.role to \"ending\".")
    elif pg != "auto":
        out.append(f"PENGUIN ROLE CHOSEN BY THE CREATOR: {pg}.")
    if au == "music":
        out.append("AUDIO: NO NARRATION. The beats are short on-screen text cards over music. Every shot must tell the story visually on its own; "
                   "plan big, readable actions, cut on the beat, and build to one climactic image. The music brief must be a full track with a clear "
                   "build and a drop where the climax lands (no vocals).")
    elif au == "score":
        out.append("AUDIO: the score is a big part of this one. Write a cinematic music brief with a build and a drop timed to the reveal (no vocals).")
    pb = playbook(fm)
    if pb:
        out.append("WHAT WORKS IN THE CREATOR'S REFERENCE SHORTS (learned formats, never copy specific scenes, characters or lines):\n" + pb)
    return ("\n\n=== CREATOR PICKS (override the bible where they conflict) ===\n" + "\n".join(out) + "\n=== END PICKS ===\n") if out else ""


def apply_penguin_mode(st, d):
    """Enforce the penguin pick after the director answers, whatever it wrote."""
    pg = penguin(st)
    kfs = d["keyframes"]
    if pg == "none":
        for k in kfs.values():
            k["penguin"] = None
        d["penguin"] = {"role": "none", "arc": ""}
    elif pg == "ending":
        last_seq = max(k["seq"] for k in kfs.values())
        tail = sorted(k for k, v in kfs.items() if v["seq"] == last_seq)[-2:]
        for k, v in kfs.items():
            if k not in tail:
                v["penguin"] = None
        if not any(kfs[k].get("penguin") for k in tail):
            kfs[tail[-1]]["penguin"] = ("small in frame at the edge, it waddles in, looks at what just happened, then flaps its short flippers trying to fly "
                                        "and fails")
        d["penguin"] = {"role": "ending", "arc": d.get("penguin", {}).get("arc", "")}
    return d


def voices():
    return [v["id"] for v in CAT["voices"]]
