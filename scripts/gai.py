#!/usr/bin/env python3
"""One door to Google's models.

If GCP_SA_KEY (a service-account JSON) is set, calls go through Vertex AI, which bills the Google Cloud credits.
Otherwise they go through the Gemini API key (AI Studio prepay wallet).
generate(model, body) takes the same generateContent body either way.
"""
import base64, json, os, re, time, urllib.error, urllib.parse, urllib.request

_SA = os.environ.get("GCP_SA_KEY", "").strip()
_LOC = os.environ.get("GCP_LOCATION", "global")
_tok = {"v": None, "exp": 0}


def backend():
    return "vertex" if _SA else "studio"


def _b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _vertex_token():
    if _tok["v"] and time.time() < _tok["exp"] - 120:
        return _tok["v"]
    sa = json.loads(_SA)
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    now = int(time.time())
    head = _b64u(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    claims = _b64u(json.dumps({"iss": sa["client_email"], "scope": "https://www.googleapis.com/auth/cloud-platform",
                               "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600}).encode())
    key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = _b64u(key.sign(f"{head}.{claims}".encode(), padding.PKCS1v15(), hashes.SHA256()))
    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": f"{head}.{claims}.{sig}"}).encode()
    resp = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data, timeout=30))
    _tok.update(v=resp["access_token"], exp=now + int(resp.get("expires_in", 3600)))
    return _tok["v"]


def project():
    return json.loads(_SA)["project_id"] if _SA else None


def _req(url, body, headers, timeout, method="POST"):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} {url.split('?')[0].split('/')[-1]}: {e.read()[:500].decode('utf-8', 'replace')}")


LAST = {"backend": None}
SPEND = []  # (kind, model, units, backend) appended by callers for the ledger


def generate(model, body, timeout=300):
    """Vertex when configured (bills the Cloud credits). Tries the global endpoint, then us-central1. No silent fallback to the wallet."""
    if _SA:
        last = None
        for loc in ([_LOC] + [l for l in ("global", "us-central1") if l != _LOC]):
            host = "aiplatform.googleapis.com" if loc == "global" else f"{loc}-aiplatform.googleapis.com"
            url = f"https://{host}/v1/projects/{project()}/locations/{loc}/publishers/google/models/{model}:generateContent"
            try:
                out = _req(url, body, {"Content-Type": "application/json", "Authorization": f"Bearer {_vertex_token()}"}, timeout)
                LAST["backend"] = "vertex"
                return out
            except RuntimeError as e:
                last = e
                if not re.search(r"HTTP 404", str(e)):
                    raise
        raise last
    LAST["backend"] = "studio"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    return _req(url, body, {"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]}, timeout)


def veo(model, prompt, image_b64=None, aspect="16:9", seconds=8, resolution="720p", audio=False, timeout=900):
    """Vertex Veo image-to-video. Returns mp4 bytes."""
    host = "us-central1-aiplatform.googleapis.com"
    base = f"https://{host}/v1/projects/{project()}/locations/us-central1/publishers/google/models/{model}"
    inst = {"prompt": prompt}
    if image_b64:
        inst["image"] = {"bytesBase64Encoded": image_b64, "mimeType": "image/png"}
    body = {"instances": [inst], "parameters": {"aspectRatio": aspect, "durationSeconds": seconds, "resolution": resolution,
                                                 "generateAudio": audio, "sampleCount": 1}}
    h = {"Content-Type": "application/json", "Authorization": f"Bearer {_vertex_token()}"}
    op = _req(f"{base}:predictLongRunning", body, h, 120)
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(10)
        h["Authorization"] = f"Bearer {_vertex_token()}"
        st = _req(f"{base}:fetchPredictOperation", {"operationName": op["name"]}, h, 60)
        if st.get("done"):
            if "error" in st:
                raise RuntimeError(f"Veo error: {st['error']}")
            vids = st.get("response", {}).get("videos", [])
            if vids and vids[0].get("bytesBase64Encoded"):
                return base64.b64decode(vids[0]["bytesBase64Encoded"])
            raise RuntimeError(f"Veo returned no video: {json.dumps(st)[:400]}")
    raise RuntimeError("Veo timed out")


# ---------------- model choice with fallbacks ----------------
CANDIDATES = {
    "text": ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash", "gemini-3.1-flash-preview",
             "gemini-3-flash", "gemini-3-flash-preview", "gemini-2.5-flash"],
    "pro": ["gemini-3.8-pro", "gemini-3.7-pro", "gemini-3.5-pro", "gemini-3.1-pro", "gemini-3.1-pro-preview", "gemini-3-pro", "gemini-3-pro-preview",
            "gemini-2.5-pro", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash"],
    "image": ["gemini-nano-banana-2.1", "gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-3-pro-image", "gemini-3-pro-image-preview",
              "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"],
    "tts": ["gemini-3.1-flash-tts-preview", "gemini-3.1-flash-tts", "gemini-2.5-pro-tts", "gemini-2.5-flash-tts", "gemini-2.5-pro-preview-tts",
            "gemini-2.5-flash-preview-tts"],
    "veo": ["veo-3.1-fast-generate-001", "veo-3.1-generate-001", "veo-3.1-fast-generate-preview", "veo-3.1-generate-preview", "veo-3.0-fast-generate-001", "veo-3.0-generate-001"],
}
_chosen = {}
_MISSING = re.compile(r"HTTP 404|not found|is not supported|does not exist|not available|NOT_FOUND|Publisher Model", re.I)
_BUSY = re.compile(r"HTTP (429|500|502|503|504)|timed out|RESOURCE_EXHAUSTED|UNAVAILABLE", re.I)


def generate_any(kind, body, timeout=300, tries=4):
    """Call the first model of this kind that exists on the current backend. Remembers the winner."""
    order = CANDIDATES[kind]
    if kind in _chosen:
        order = [_chosen[kind]] + [m for m in order if m != _chosen[kind]]
    last = None
    for model in order:
        for attempt in range(tries):
            try:
                out = generate(model, body, timeout)
                if _chosen.get(kind) != model:
                    print(f"[gai] {kind} model: {model} via {LAST['backend']}", flush=True)
                _chosen[kind] = model
                return out, model
            except RuntimeError as e:
                last = e
                msg = str(e)
                if "HTTP 402" in msg:
                    raise RuntimeError("Gemini API wallet is empty and Vertex is not configured (add the GCP_SA_KEY secret)")
                if _MISSING.search(msg) and not _BUSY.search(msg):
                    print(f"[gai] {kind}: {model} not available here", flush=True)
                    break
                if _BUSY.search(msg):
                    time.sleep(min(90, 12 * (attempt + 1)))
                    continue
                raise
    raise RuntimeError(f"no {kind} model worked: {last}")


def ask_json(prompt, kind="text", temperature=0.8, timeout=240):
    cfg = {"responseMimeType": "application/json", "temperature": temperature}
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": cfg}
    out, model = generate_any(kind, body, timeout)
    parts = out["candidates"][0]["content"]["parts"]
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?|```$", "", text).strip()
    return json.loads(text)


def first_inline(out):
    for p in out["candidates"][0]["content"]["parts"]:
        if "inlineData" in p:
            return p["inlineData"]
        if "inline_data" in p:
            return {"data": p["inline_data"]["data"], "mimeType": p["inline_data"].get("mime_type", "")}
    raise RuntimeError("no media in response: " + json.dumps(out)[:300])


def veo_any(prompt, image_b64=None, aspect="16:9", seconds=8, audio=True):
    order = CANDIDATES["veo"]
    if "veo" in _chosen:
        order = [_chosen["veo"]] + [m for m in order if m != _chosen["veo"]]
    last = None
    for model in order:
        for attempt in range(3):
            try:
                data = veo(model, prompt, image_b64, aspect, seconds, "720p", audio)
                if _chosen.get("veo") != model:
                    print(f"[gai] veo model: {model}", flush=True)
                _chosen["veo"] = model
                return data, model
            except RuntimeError as e:
                last = e
                if _MISSING.search(str(e)) and not _BUSY.search(str(e)):
                    break
                if _BUSY.search(str(e)):
                    time.sleep(30 * (attempt + 1))
                    continue
                if "generateAudio" in str(e) or "audio" in str(e).lower() and "not supported" in str(e).lower():
                    audio = False
                    continue
                raise
    raise RuntimeError(f"no Veo model worked: {last}")


def omni(prompt, image_b64, aspect="16:9", timeout=600):
    """Gemini Omni through the AI Studio key (Interactions API). Returns mp4 bytes."""
    key = os.environ["GEMINI_API_KEY"]
    h = {"Content-Type": "application/json", "x-goog-api-key": key}
    body = {"model": "gemini-omni-flash-preview", "input": [{"type": "image", "data": image_b64, "mime_type": "image/png"}, {"type": "text", "text": prompt}],
            "response_format": {"type": "video", "aspect_ratio": aspect, "resolution": "720p"}}
    d = _req("https://generativelanguage.googleapis.com/v1beta/interactions", body, h, timeout)
    t0 = time.time()
    while d.get("status") in ("in_progress", "queued", "running", "pending") and time.time() - t0 < timeout:
        time.sleep(10)
        d = _req(f"https://generativelanguage.googleapis.com/v1beta/interactions/{d['id']}", None, h, 60, "GET")

    def walk(o):
        if isinstance(o, dict):
            if o.get("data") and len(str(o["data"])) > 1000:
                return o["data"], None
            if o.get("uri") and ("files/" in str(o["uri"]) or str(o["uri"]).startswith("http")):
                return None, o["uri"]
            for v in o.values():
                r = walk(v)
                if r != (None, None):
                    return r
        if isinstance(o, list):
            for v in o:
                r = walk(v)
                if r != (None, None):
                    return r
        return None, None
    data, uri = walk(d)
    if data:
        return base64.b64decode(data)
    if uri:
        url = uri if uri.startswith("http") else f"https://generativelanguage.googleapis.com/v1beta/{uri}"
        url += ("&" if "?" in url else "?") + "alt=media" if "alt=media" not in url else ""
        return urllib.request.urlopen(urllib.request.Request(url, headers={"x-goog-api-key": key}), timeout=300).read()
    raise RuntimeError("Omni returned no video: " + json.dumps(d)[:400])


def lyria(prompt, negative="vocals, singing, speech", timeout=180):
    """Vertex Lyria instrumental clip (about 30 s WAV). Returns bytes or None if unavailable."""
    if not _SA:
        return None
    url = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project()}/locations/us-central1/publishers/google/models/lyria-002:predict"
    try:
        d = _req(url, {"instances": [{"prompt": prompt, "negative_prompt": negative}], "parameters": {"sample_count": 1}},
                 {"Content-Type": "application/json", "Authorization": f"Bearer {_vertex_token()}"}, timeout)
        p = d["predictions"][0]
        return base64.b64decode(p.get("bytesBase64Encoded") or p.get("audioContent"))
    except Exception as e:
        print("[gai] lyria unavailable:", str(e)[:200], flush=True)
        return None
