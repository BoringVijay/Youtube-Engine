#!/usr/bin/env python3
"""Creative lab: try visual styles, voices and AI motion on one script before committing the engine to them.

Reads lab/request.json, writes small outputs to lab/out/ (committed so they can be reviewed) and logs to logs/lab-last.log.
Env: GEMINI_API_KEY
"""
import base64, json, os, re, subprocess, sys, time, urllib.error, urllib.request, wave
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gai  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "lab", "out")
REQ = json.load(open(os.path.join(ROOT, "lab", "request.json")))
API = "https://generativelanguage.googleapis.com/v1beta"
KEY = os.environ["GEMINI_API_KEY"]


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def call(path, body=None, method="POST", timeout=300):
    r = urllib.request.Request(f"{API}/{path}", data=json.dumps(body).encode() if body is not None else None, method=method,
                               headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {path}: {e.read()[:500].decode('utf-8', 'replace')}")


def models():
    data = call("models?pageSize=300", method="GET")
    return [m["name"].split("/")[1] for m in data.get("models", [])]


# ---------- images ----------
def gen_image(model, prompt, path, ref=None, aspect="16:9"):
    parts = [{"text": prompt}]
    if ref:
        parts.insert(0, {"inlineData": {"mimeType": "image/png", "data": base64.b64encode(open(ref, "rb").read()).decode()}})
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect}}}
    for attempt in range(3):
        try:
            d = gai.generate(model, body)
            for p in d["candidates"][0]["content"]["parts"]:
                if "inlineData" in p:
                    raw = base64.b64decode(p["inlineData"]["data"])
                    tmp = path + ".src"
                    open(tmp, "wb").write(raw)
                    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-vf", "scale='min(1600,iw)':-2", "-q:v", "3", path], check=True)
                    keep = path.replace(".jpg", ".png")
                    os.replace(tmp, keep)  # full-res source kept for video input (not committed)
                    return path
            raise RuntimeError("no image in response: " + json.dumps(d)[:300])
        except Exception as e:
            log("image retry", attempt + 1, str(e)[:200])
            time.sleep(8 * (attempt + 1))
    raise RuntimeError("image failed")


# ---------- voice ----------
def tts(model, voice, prompt, path):
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    for attempt in range(4):
        try:
            d = gai.generate(model, body, timeout=240)
            part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
            pcm = base64.b64decode(part["data"])
            log("tts mime", model, part.get("mimeType"))
            m = re.search(r"rate=(\d+)", part.get("mimeType", "")); rate = int(m.group(1)) if m else 24000
            wav = path[:-4] + ".wav"
            with wave.open(wav, "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-af", "loudnorm=I=-15:TP=-1.5", "-b:a", "96k", path], check=True)
            os.remove(wav)
            return round(len(pcm) / 2 / rate, 1)
        except Exception as e:
            log("tts retry", model, voice, attempt + 1, str(e)[:200])
            time.sleep(15 * (attempt + 1))
    raise RuntimeError("tts failed")


# ---------- motion (Gemini Omni via Interactions API) ----------
def find_media(obj):
    """Walk a response and return (b64_data, uri) for the first video it holds."""
    if isinstance(obj, dict):
        mime = str(obj.get("mime_type") or obj.get("mimeType") or "")
        if obj.get("data") and ("video" in mime or not mime) and len(str(obj["data"])) > 1000:
            return obj["data"], None
        if obj.get("uri") and ("video" in mime or "files/" in str(obj["uri"]) or str(obj["uri"]).startswith("http")):
            return None, obj["uri"]
        for v in obj.values():
            r = find_media(v)
            if r != (None, None):
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = find_media(v)
            if r != (None, None):
                return r
    return None, None


def gen_video(model, prompt, image, path, aspect="16:9"):
    inp = [{"type": "image", "data": base64.b64encode(open(image, "rb").read()).decode(), "mime_type": "image/png"}, {"type": "text", "text": prompt}]
    body = {"model": model, "input": inp, "response_format": {"type": "video", "aspect_ratio": aspect, "resolution": "720p"}}
    d = call("interactions", body, timeout=600)
    log("omni first response keys:", list(d.keys()), str({k: d[k] for k in d if k in ("status", "id", "state")})[:200])
    t0 = time.time()
    while d.get("status") in ("in_progress", "queued", "running", "pending") and time.time() - t0 < 600:
        time.sleep(10)
        d = call(f"interactions/{d['id']}", method="GET")
    data, uri = find_media(d)
    if data:
        open(path, "wb").write(base64.b64decode(data))
    elif uri:
        url = uri if uri.startswith("http") else f"{API}/{uri}"
        sep = "&" if "?" in url else "?"
        if "alt=media" not in url:
            url += sep + "alt=media"
        r = urllib.request.Request(url, headers={"x-goog-api-key": KEY})
        open(path, "wb").write(urllib.request.urlopen(r, timeout=300).read())
    else:
        raise RuntimeError("no video in response: " + json.dumps(d)[:600])
    small = path.replace(".mp4", "-small.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-vf", "scale=960:-2", "-crf", "28", "-preset", "veryfast", small], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-vf", "fps=1,scale=480:-2,tile=4x2", "-frames:v", "1", path.replace(".mp4", "-frames.jpg")], check=True)
    return small


def main():
    os.makedirs(OUT, exist_ok=True)
    names = models()
    log("models:", [n for n in names if re.search(r"image|banana|omni|veo|tts|lyria", n)])
    report = {"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "images": [], "voices": [], "videos": [], "errors": []}

    img_model = next((n for n in REQ.get("image_models", []) if n in names), None) or next(
        (n for n in names if re.search(r"banana-2\.1|flash-image|banana", n) and "lite" not in n), None)
    log("image model:", img_model)

    log("backend:", gai.backend())
    char_png = None
    ch = REQ.get("character")
    if ch and img_model:
        path = os.path.join(OUT, f"img-{ch['id']}.jpg")
        try:
            gen_image(img_model, ch["prompt"], path, aspect=ch.get("aspect", "16:9"))
            char_png = path.replace(".jpg", ".png")
            report["images"].append({"character": ch["id"], "file": os.path.relpath(path, ROOT)})
            log("character sheet ok")
        except Exception as e:
            report["errors"].append({"character": ch["id"], "error": str(e)[:300]})

    def do_scene(sc):
        path = os.path.join(OUT, f"img-{sc['id']}.jpg")
        try:
            ref = os.path.join(ROOT, sc["ref_path"]) if sc.get("ref_path") else (char_png if sc.get("ref") else None)
            gen_image(img_model, sc["prompt"] + "\n\n" + REQ.get("image_rules", ""), path, ref=ref, aspect=sc.get("aspect", "16:9"))
            return {"scene": sc["id"], "file": os.path.relpath(path, ROOT)}
        except Exception as e:
            return {"scene": sc["id"], "error": str(e)[:300]}
    if img_model and REQ.get("scenes"):
        with ThreadPoolExecutor(max_workers=3) as ex:
            for r in ex.map(do_scene, REQ["scenes"]):
                (report["images"] if "file" in r else report["errors"]).append(r)
                log("scene", r.get("scene"), r.get("error", "ok")[:160])

    # images
    jobs = []
    for beat in REQ.get("beats", []):
        for st in REQ.get("styles", []):
            jobs.append((beat, st))

    def do_img(job):
        beat, st = job
        path = os.path.join(OUT, f"img-{beat['id']}-{st['id']}.jpg")
        try:
            gen_image(img_model, f"{beat['frame']}\n\nVisual style: {st['look']}\n\n{REQ.get('image_rules', '')}", path)
            return {"beat": beat["id"], "style": st["id"], "file": os.path.relpath(path, ROOT)}
        except Exception as e:
            return {"beat": beat["id"], "style": st["id"], "error": str(e)[:300]}
    if img_model:
        with ThreadPoolExecutor(max_workers=3) as ex:
            for r in ex.map(do_img, jobs):
                (report["images"] if "file" in r else report["errors"]).append(r)
                log("image", r.get("beat"), r.get("style"), r.get("error", "ok")[:120])

    # voices
    def do_voice(v):
        model = next((m for m in [v["model"]] + v.get("fallback", []) if m in names), None)
        if not model:
            return {"id": v["id"], "error": f"model {v['model']} not on this key"}
        path = os.path.join(OUT, f"voice-{v['id']}.mp3")
        prompt = v.get("prompt") or REQ["voice_prompt"].replace("{NOTES}", v.get("notes", "")).replace("{TRANSCRIPT}", v.get("transcript", REQ["transcript_tagged"]))
        try:
            secs = tts(model, v["voice"], prompt, path)
            return {"id": v["id"], "label": v["label"], "model": model, "voice": v["voice"], "sec": secs, "file": os.path.relpath(path, ROOT)}
        except Exception as e:
            return {"id": v["id"], "error": str(e)[:300]}
    with ThreadPoolExecutor(max_workers=2) as ex:
        for r in ex.map(do_voice, REQ.get("voices", [])):
            (report["voices"] if "file" in r else report["errors"]).append(r)
            log("voice", r.get("id"), r.get("error", "ok")[:160])

    # motion
    vid_model = next((n for n in names if "omni" in n and "flash" in n), None) or next((n for n in names if "omni" in n), None)
    log("video model:", vid_model)
    for v in REQ.get("videos", []):
        src = os.path.join(OUT, f"img-{v['src']}.png" if v.get("src") else f"img-{v['beat']}-{v['style']}.png")
        if not (vid_model and os.path.exists(src)):
            report["errors"].append({"video": v["id"], "error": "no model or no source frame"})
            continue
        try:
            small = gen_video(vid_model, v["prompt"], src, os.path.join(OUT, f"vid-{v['id']}.mp4"))
            report["videos"].append({"id": v["id"], "file": os.path.relpath(small, ROOT), "model": vid_model})
            log("video ok", v["id"])
        except Exception as e:
            report["errors"].append({"video": v["id"], "error": str(e)[:600]})
            log("video failed", v["id"], str(e)[:400])
    # chained-keyframe motion tests on Vertex Veo (first + last frame), comparing tiers
    for t in REQ.get("motion_tests", []):
        first = os.path.join(OUT, f"img-{t['first']}.png")
        last = os.path.join(OUT, f"img-{t['last']}.png") if t.get("last") else None
        if not os.path.exists(first):
            report["errors"].append({"motion": t["id"], "error": "missing first frame"}); continue
        b64f = base64.b64encode(open(first, "rb").read()).decode()
        b64l = base64.b64encode(open(last, "rb").read()).decode() if last and os.path.exists(last) else None
        err = None
        for model in gai.CANDIDATES[t.get("tier", "veo")]:
            try:
                t0 = time.time()
                data = gai.veo(model, t["prompt"], b64f, t.get("aspect", "9:16"), t.get("seconds", 8), t.get("resolution", "720p"), t.get("audio", False), last_b64=b64l)
                path = os.path.join(OUT, f"vid-{t['id']}.mp4")
                open(path, "wb").write(data)
                small = path.replace(".mp4", "-small.mp4")
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-vf", "scale=-2:960", "-crf", "26", "-preset", "veryfast", "-an", small], check=True)
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-vf", "fps=1,scale=-2:360,tile=8x1", "-frames:v", "1", path.replace(".mp4", "-frames.jpg")], check=True)
                report["videos"].append({"id": t["id"], "model": model, "secs": round(time.time() - t0), "file": os.path.relpath(small, ROOT)})
                log("motion ok", t["id"], model, f"{time.time() - t0:.0f}s")
                err = None
                break
            except Exception as e:
                err = str(e)[:400]
                log("motion", t["id"], model, "failed:", err[:200])
                if not re.search(r"404|not found|NOT_FOUND|not supported", err):
                    break
        if err:
            report["errors"].append({"motion": t["id"], "error": err})
    json.dump(report, open(os.path.join(OUT, "report.json"), "w"), indent=1)
    log("done:", len(report["images"]), "images,", len(report["voices"]), "voices,", len(report["videos"]), "videos,", len(report["errors"]), "errors")


if __name__ == "__main__":
    main()
