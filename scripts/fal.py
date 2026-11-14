#!/usr/bin/env python3
"""One door to fal.ai (images now; video, audio and 3D later). Standard library only, like gai.py.

Needs FAL_KEY (GitHub secret). Calls go through fal's queue:
    submit -> keep request_id -> poll status_url -> fetch response_url
A submitted request id is saved to ledger/fal_pending.json until its result is in, so a crashed or timed-out run
resumes the same paid job instead of submitting a second one.

    import fal
    out = fal.run("fal-ai/nano-banana-pro", {"prompt": "...", "aspect_ratio": "9:16", "resolution": "2K"})
    fal.download(out["images"][0]["url"], "frame.png")
"""
import base64, json, os, time, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PENDING = os.path.join(ROOT, "ledger", "fal_pending.json")
QUEUE = "https://queue.fal.run"


class FalError(RuntimeError):
    pass


def has_key():
    return bool(os.environ.get("FAL_KEY", "").strip())


def _headers():
    key = os.environ.get("FAL_KEY", "").strip()
    if not key:
        raise FalError("FAL_KEY is not set. Create a key at https://fal.ai/dashboard/keys and add it as the FAL_KEY GitHub secret.")
    return {"Authorization": f"Key {key}", "Content-Type": "application/json"}


def _call(url, body=None, method="GET", timeout=60):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=_headers())
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        msg = e.read()[:600].decode("utf-8", "replace")
        if e.code == 403 and "xhausted" in msg:
            raise FalError("fal balance is empty. Top up at https://fal.ai/dashboard/usage-billing/credits")
        if e.code == 403 and "locked" in msg.lower():
            raise FalError(f"fal account locked: {msg}")
        raise FalError(f"HTTP {e.code} {url.split('?')[0]}: {msg}")


def _pending():
    return json.load(open(PENDING)) if os.path.exists(PENDING) else {}


def _save_pending(p):
    os.makedirs(os.path.dirname(PENDING), exist_ok=True)
    json.dump(p, open(PENDING, "w"), indent=1)


def data_uri(path):
    """Small local file as a data URI for image inputs."""
    head = open(path, "rb").read(4)
    mime = "image/jpeg" if head[:2] == b"\xff\xd8" else "image/png"
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def submit(endpoint, args, tag=None):
    """Queue one paid job. Returns the submit record (request_id, status_url, response_url)."""
    sub = _call(f"{QUEUE}/{endpoint}", args, "POST")
    p = _pending()
    p[sub["request_id"]] = {"endpoint": endpoint, "tag": tag, "status_url": sub["status_url"],
                            "response_url": sub["response_url"], "at": int(time.time())}
    _save_pending(p)
    return sub


def wait(request_id, timeout=600, every=3):
    """Poll a queued job and return its result. Never resubmits. On timeout the id stays pending for resume()."""
    rec = _pending().get(request_id)
    if not rec:
        raise FalError(f"unknown fal request {request_id}")
    end = time.time() + timeout
    while True:
        s = _call(rec["status_url"])
        st = s.get("status")
        if st == "COMPLETED":
            if s.get("error"):
                p = _pending(); p.pop(request_id, None); _save_pending(p)
                raise FalError(f"fal job failed ({s.get('error_type')}): {str(s.get('error'))[:300]}")
            out = _call(rec["response_url"])
            p = _pending(); p.pop(request_id, None); _save_pending(p)
            return out
        if time.time() > end:
            raise FalError(f"fal job {request_id} still {st} after {timeout}s; left pending, call resume() later")
        time.sleep(every)


def run(endpoint, args, timeout=600, tag=None):
    """Submit and wait. If a job with the same tag is already pending, wait on it instead of paying twice."""
    if tag:
        for rid, rec in _pending().items():
            if rec.get("tag") == tag and rec.get("endpoint") == endpoint:
                return wait(rid, timeout)
    sub = submit(endpoint, args, tag)
    return wait(sub["request_id"], timeout)


def resume(timeout=600):
    """Collect every job left pending by an earlier run. Returns {request_id: result or error text}."""
    out = {}
    for rid in list(_pending()):
        try:
            out[rid] = wait(rid, timeout)
        except FalError as e:
            out[rid] = str(e)
    return out


def download(url, path, timeout=120):
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        open(path, "wb").write(resp.read())
    return path


def price(endpoint):
    """Unit price for an endpoint from fal's pricing API (free to call, nothing generated)."""
    return _call(f"https://api.fal.ai/v1/models/pricing?endpoint_id={endpoint}")
