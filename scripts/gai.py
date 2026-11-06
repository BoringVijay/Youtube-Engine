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
    """Vertex first when configured (bills the Cloud credits); falls back to the AI Studio key if Vertex lacks the model."""
    if _SA:
        host = "aiplatform.googleapis.com" if _LOC == "global" else f"{_LOC}-aiplatform.googleapis.com"
        url = f"https://{host}/v1/projects/{project()}/locations/{_LOC}/publishers/google/models/{model}:generateContent"
        try:
            out = _req(url, body, {"Content-Type": "application/json", "Authorization": f"Bearer {_vertex_token()}"}, timeout)
            LAST["backend"] = "vertex"
            return out
        except RuntimeError as e:
            if not (os.environ.get("GEMINI_API_KEY") and re.search(r"HTTP (400|403|404)", str(e))):
                raise
            print(f"[gai] vertex could not serve {model} ({str(e)[:160]}), using AI Studio", flush=True)
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
