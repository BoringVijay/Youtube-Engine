#!/usr/bin/env python3
"""Rick Shots asset runner. Runs in GitHub Actions (rick.yml) when rick/projects/<slug>/request.json is pushed.

request.json:
  {"tasks": [
     {"type": "image", "out": "puppets/major/source.png", "prompt": "...", "aspect": "2:3", "size": "2K",
      "refs": ["brand/penguin-mark.png"]},          # refs are paths in this project, or repo paths starting with "/"
     {"type": "music", "out": "audio/music.mp3", "prompt": "..."},
     {"type": "voice", "out": "audio/voice.mp3", "text": "...", "voice": "Brian"}
  ]}

Rules (creative/rick/bible.md, section 7): tasks run in order, an output that already exists is never regenerated,
every paid call is checked against the budget first, nothing is retried automatically. A report goes to report.json
and a small preview of every new image to previews/, so it can be reviewed before the next step is requested.
"""
import json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art, budget, gai  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS = os.path.join(ROOT, "rick", "projects")


def path_in(proj, p):
    return os.path.join(ROOT, p.lstrip("/")) if p.startswith("/") else os.path.join(proj, p)


def preview(src, proj, out_rel):
    d = os.path.join(proj, "previews")
    os.makedirs(d, exist_ok=True)
    dst = os.path.join(d, out_rel.replace("/", "__").rsplit(".", 1)[0] + ".jpg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "scale='min(900,iw)':-2", "-q:v", "4", dst], check=False)


def run_task(t, proj, job):
    out = path_in(proj, t["out"])
    if os.path.exists(out):
        return {"status": "exists"}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    kind = t["type"]
    if kind == "image":
        refs = [path_in(proj, r) for r in t.get("refs", [])]
        missing = [r for r in refs if not os.path.exists(r)]
        if missing:
            return {"status": "skipped", "why": "missing refs: " + ", ".join(os.path.relpath(m, ROOT) for m in missing)}
        art.image(t["prompt"], out, refs=refs, aspect=t.get("aspect", "2:3"), job=job, size=t.get("size", "2K"))
        preview(out, proj, t["out"])
        return {"status": "made", "model": getattr(art.image, "last_model", None)}
    if kind == "music":
        budget.check(job, "music_clip")
        res = gai.lyria(t["prompt"])
        if not res:
            return {"status": "failed", "why": "lyria unavailable"}
        data = res if isinstance(res, (bytes, bytearray)) else open(res, "rb").read()
        tmp = out + ".wav"
        open(tmp, "wb").write(data)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, out], check=True)
        os.remove(tmp)
        budget.log(job, "music_clip", 1, "vertex")
        return {"status": "made"}
    if kind == "voice":
        import fal
        chars = len(t["text"])
        budget.check(job, "fal_tts_1k_chars", chars / 1000)
        args = {"text": t["text"], "voice": t.get("voice", "Brian")}
        args.update(t.get("args", {}))
        res = fal.run(t.get("model", "fal-ai/elevenlabs/tts/eleven-v3"), args, timeout=300, tag=f"{job}:{t['out']}")
        fal.download(res["audio"]["url"], out)
        budget.log(job, "fal_tts_1k_chars", chars / 1000, "fal")
        return {"status": "made"}
    return {"status": "skipped", "why": f"unknown task type {kind}"}


def run_project(proj):
    req_f = os.path.join(proj, "request.json")
    if not os.path.exists(req_f):
        return
    req = json.load(open(req_f))
    slug = os.path.basename(proj)
    job = f"rick-{slug}"
    rep_f = os.path.join(proj, "report.json")
    report = json.load(open(rep_f)) if os.path.exists(rep_f) else {}
    for t in req.get("tasks", []):
        key = t["out"]
        if report.get(key, {}).get("status") in ("made", "exists") and os.path.exists(path_in(proj, key)):
            continue
        t0 = time.time()
        try:
            r = run_task(t, proj, job)
        except budget.OverBudget as e:
            r = {"status": "stopped", "why": f"budget: {e}"}
            report[key] = r
            print(f"[rick] {slug} {key}: {r}", flush=True)
            break
        except Exception as e:  # report and continue; never retry a paid call here
            r = {"status": "failed", "why": str(e)[:400]}
        r["secs"] = round(time.time() - t0, 1)
        report[key] = r
        print(f"[rick] {slug} {key}: {r}", flush=True)
        json.dump(report, open(rep_f, "w"), indent=1)
    report["_spent"] = {"google_usd": budget.spent_google(job), "fal_usd": budget.spent_fal(job),
                        "google_room_usd": round(budget.CFG["total_usd"] - budget.spent_google(), 2),
                        "fal_room_usd": round(budget.CFG.get("fal_total_usd", 15) - budget.spent_fal(), 2)}
    json.dump(report, open(rep_f, "w"), indent=1)


def main():
    only = os.environ.get("RICK_PROJECT", "").strip()
    for name in sorted(os.listdir(PROJECTS)) if os.path.isdir(PROJECTS) else []:
        if only and name != only:
            continue
        p = os.path.join(PROJECTS, name)
        if os.path.isdir(p):
            run_project(p)


if __name__ == "__main__":
    main()
