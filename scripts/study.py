#!/usr/bin/env python3
"""Reference study: Gemini watches a YouTube Short the creator likes and writes down HOW it works (format, not content).

    python3 scripts/study.py URL [URL ...]      study these now
    (or send {"type": "study", "urls": [...]} to the Drive inbox; the produce run studies them)

Each analysis lands in creative/references/<video id>.json. After new ones, creative/references/playbook.md is rewritten:
general lessons plus one section per story format, which the director reads when planning a Short of that format.
We learn structure, pacing, camera language, sound design and voice energy. We never copy a creator's scenes, characters,
lines, voice or branding.
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gai  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.environ.get("STUDY_DIR") or os.path.join(ROOT, "creative", "references")  # a sub-folder keeps a separate study set (e.g. rick/)
CAT = json.load(open(os.path.join(ROOT, "config", "creative.json")))
QUEUE = os.path.join(REFS, "queue.json")


def log(*a):
    print(time.strftime("%H:%M:%S"), "[study]", *a, flush=True)


def yt_id(url):
    m = re.search(r"(?:shorts/|v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})", url or "")
    return m.group(1) if m else None


PROMPT = """You are a senior film editor and YouTube Shorts strategist. Watch this Short frame by frame and listen closely.
Break down HOW it is made so another original channel can learn the craft. Describe technique, never transcribe the full script.

Return JSON:
{
 "title_guess": "", "channel_guess": "", "duration_s": 0,
 "format": "one of: FORMATS",
 "premise": "one sentence, what it is about",
 "hook": {"first_2s_visual": "", "first_line_technique": "why the opening stops the scroll", "text_on_screen": ""},
 "structure": [{"t": "0:00-0:03", "beat": "setup | escalation | twist | payoff | loop", "what_happens": "", "why_it_works": ""}],
 "shots": [{"t": "0:00", "framing": "wide | medium | close | macro | POV | aerial", "camera": "push-in | orbit | whip | crane | handheld | static | speed ramp ...", "transition": "cut | match cut | whip | flash | morph | none", "subject": ""}],
 "pacing": {"avg_shot_s": 0, "cuts_in_first_5s": 0, "where_it_slows_down": "", "where_it_speeds_up": ""},
 "look": {"style": "anime / 3D / claymation / live action / ...", "palette": "", "lighting": "", "texture": "", "character_design": ""},
 "voice": {"present": true, "gender_age_impression": "", "tone": "", "pace_wpm": 0, "energy_curve": "how energy moves through the video", "delivery_tricks": ""},
 "music": {"present": true, "genre": "", "bpm_estimate": 0, "where_it_drops": "", "how_it_supports_the_story": ""},
 "sfx": "the sound design moves that matter",
 "hero_moments": "how the video builds its biggest moment, shot by shot",
 "captions": "caption style and behaviour",
 "why_it_works": ["3 to 6 specific reasons"],
 "rules_to_borrow": ["6 to 10 generalised, reusable rules another channel could apply to completely different topics"],
 "do_not_copy": ["things specific to this creator that an original channel must not imitate (characters, catchphrases, logo, exact scenes)"]
}"""


def _studio(body, timeout=600):
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("no GEMINI_API_KEY for the fallback")
    last = None
    for model in ("gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            return gai._req(url, body, {"Content-Type": "application/json", "x-goog-api-key": key}, timeout)
        except RuntimeError as e:
            last = e
            if not re.search(r"HTTP 404|not found", str(e), re.I):
                raise
    raise last


def _text(out):
    parts = out["candidates"][0]["content"]["parts"]
    t = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
    return re.sub(r"^```(json)?|```$", "", t).strip()


def analyse(url):
    vid = yt_id(url)
    watch = f"https://www.youtube.com/watch?v={vid}"
    prompt = PROMPT.replace("FORMATS", ", ".join(CAT["formats"].keys()))
    extra = os.path.join(REFS, "prompt_extra.md")  # optional per-set questions, added to the base prompt
    if os.path.exists(extra):
        prompt += "\n\nAlso add these keys to the JSON:\n" + open(extra).read()
    body = {"contents": [{"role": "user", "parts": [{"fileData": {"fileUri": watch, "mimeType": "video/mp4"}}, {"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3}}
    try:
        out, model = gai.generate_any("pro", body, timeout=600)
    except Exception as e:
        log(f"{vid}: Vertex couldn't watch it ({str(e)[:160]}), trying the Gemini API")
        out, model = _studio(body), "studio"
    d = json.loads(_text(out))
    d.update({"url": url, "id": vid, "studied_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "model": model})
    return d


def synthesize():
    items = []
    for f in sorted(os.listdir(REFS)):
        if f.endswith(".json") and f not in ("queue.json", "views.json"):
            try:
                items.append(json.load(open(os.path.join(REFS, f))))
            except Exception:
                pass
    if not items:
        return
    slim = [{k: x.get(k) for k in ("format", "premise", "hook", "structure", "pacing", "look", "voice", "music", "sfx", "hero_moments", "captions",
                                    "why_it_works", "rules_to_borrow")} for x in items]
    meta_f = os.path.join(REFS, "views.json")  # optional {video id: {"title", "views"}} so the playbook can weigh hits against misses
    if os.path.exists(meta_f):
        meta = json.load(open(meta_f))
        for x, sl in zip(items, slim):
            sl.update(meta.get(x.get("id"), {}))
            for k in ("script_shape", "topic_type", "title_formula", "hook_line", "world", "cast", "lighting_flip", "inserts", "loop_device", "why_this_topic"):
                if k in x:
                    sl[k] = x[k]
    synth_f = os.path.join(REFS, "synth_extra.md")  # optional per-set instructions for the playbook
    extra_synth = (open(synth_f).read().strip() + "\n") if os.path.exists(synth_f) else ""
    fmts = "\n".join(f"- {k}: {v['name']}" for k, v in CAT["formats"].items())
    prompt = f"""You are the creative director of an original animated Shorts channel. Below are breakdowns of {len(items)} reference Shorts the creator loves.
Write a practical playbook in Markdown that our script writer and shot director will follow. Learn the craft; never copy any creator's scenes,
characters, lines, catchphrases or branding.

Sections, in this order, each 6 to 12 tight bullet points of concrete, testable rules (numbers where possible: seconds, shot lengths, wpm):
## General  (hooks, pacing, camera, sound, captions, endings that make people rewatch)
then one section per story format below that the references inform, titled exactly with the format name:
{fmts}
Skip a format only if nothing in the references applies to it.
{extra_synth}Breakdowns: {json.dumps(slim, ensure_ascii=False)[:90000]}
Return only the Markdown."""
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.4}}
    out, _ = gai.generate_any("pro", body, timeout=400)
    md = _text(out)
    head = (f"# Reference playbook\n\nLearned from {len(items)} reference Shorts ({', '.join(x['id'] for x in items if x.get('id'))}). "
            "Rewritten after every new study. Formats, not copies.\n\n")
    open(os.path.join(REFS, "playbook.md"), "w").write(head + md.split("\n", 1)[1] if md.startswith("# ") else head + md)
    log("playbook rewritten")


def queue_add(urls):
    os.makedirs(REFS, exist_ok=True)
    q = json.load(open(QUEUE)) if os.path.exists(QUEUE) else []
    for u in urls:
        if yt_id(u) and u not in q:
            q.append(u)
    json.dump(q, open(QUEUE, "w"), indent=1)


def run(urls=None, budget_log=None):
    os.makedirs(REFS, exist_ok=True)
    if urls:
        queue_add(urls)
    q = json.load(open(QUEUE)) if os.path.exists(QUEUE) else []
    new, left = 0, []
    for u in q:
        vid = yt_id(u)
        if not vid or os.path.exists(os.path.join(REFS, f"{vid}.json")):
            continue
        try:
            d = analyse(u)
            json.dump(d, open(os.path.join(REFS, f"{vid}.json"), "w"), indent=1, ensure_ascii=False)
            log(f"studied {vid}: {d.get('format')} / {d.get('premise', '')[:90]}")
            new += 1
            if budget_log:
                budget_log()
        except Exception as e:
            log(f"{vid} failed: {str(e)[:240]}")
            left.append(u)
    json.dump(left, open(QUEUE, "w"), indent=1)
    if new:
        synthesize()
    return new


if __name__ == "__main__":
    urls = [u for a in sys.argv[1:] for u in re.split(r"[\s,]+", a) if u]
    urls += [u for u in re.split(r"[\s,]+", os.environ.get("STUDY_URLS", "")) if u]
    n = run(urls)
    print(f"studied {n} new reference(s)")
