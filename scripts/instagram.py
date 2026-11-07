#!/usr/bin/env python3
"""Instagram Reels publisher (Instagram API with Facebook Login, resumable upload).

Only posts a Short after Vijay taps "Post to Instagram" in Penguin Studio (inbox message {"type": "instagram", "id": ...}).
Flow: create a REELS container (upload_type=resumable) -> send the bytes to rupload.facebook.com -> wait until the
container is FINISHED -> media_publish -> read the permalink.

Env:
  IG_ACCESS_TOKEN  a Facebook Page access token made from a long-lived user token (it does not expire)
  IG_USER_ID       the Instagram professional account id linked to that Page (optional: found via /me/accounts)
  GDRIVE_REFRESH_TOKEN (+ YT_CLIENT_ID / YT_CLIENT_SECRET) to fetch the finished Short from Drive
"""
import datetime as dt, glob, json, os, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = "v26.0"
GRAPH = f"https://graph.facebook.com/{VER}"
_acct = {}


def log(*a):
    print(time.strftime("%H:%M:%S"), "[instagram]", *a, flush=True)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def tok():
    return os.environ.get("IG_ACCESS_TOKEN", "").strip()


def call(method, path, params=None, headers=None, raw=None, url=None, timeout=120):
    params = dict(params or {})
    full = url or f"{GRAPH}/{path}"
    data = None
    if raw is not None:
        data = raw
    elif method == "POST":
        params["access_token"] = tok()
        data = urllib.parse.urlencode(params).encode()
    else:
        params["access_token"] = tok()
        full += "?" + urllib.parse.urlencode(params)
    r = urllib.request.Request(full, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            txt = resp.read()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        body = e.read()[:500].decode("utf-8", "replace")
        try:
            msg = json.loads(body).get("error", {}).get("message", body)
        except Exception:
            msg = body
        raise RuntimeError(f"Instagram {method} {path or 'upload'} -> HTTP {e.code}: {msg}")


def ig_id():
    if os.environ.get("IG_USER_ID", "").strip():
        return os.environ["IG_USER_ID"].strip()
    if _acct.get("id"):
        return _acct["id"]
    pages = call("GET", "me/accounts", {"fields": "name,instagram_business_account"}).get("data", [])
    for p in pages:
        if p.get("instagram_business_account"):
            _acct["id"] = p["instagram_business_account"]["id"]
            return _acct["id"]
    # a Page token answers /me as the Page itself
    me = call("GET", "me", {"fields": "instagram_business_account"})
    if me.get("instagram_business_account"):
        _acct["id"] = me["instagram_business_account"]["id"]
        return _acct["id"]
    raise RuntimeError("No Instagram professional account is linked to the Facebook Page behind this token")


def account():
    """Small summary for status.json. Cached for the whole run; never raises."""
    if "summary" in _acct:
        return _acct["summary"]
    if not tok():
        _acct["summary"] = {"connected": False}
        return _acct["summary"]
    try:
        info = call("GET", ig_id(), {"fields": "username"}, timeout=20)
        _acct["summary"] = {"connected": True, "username": info.get("username")}
    except Exception as e:
        _acct["summary"] = {"connected": False, "error": str(e)[:200]}
    return _acct["summary"]


def caption(st):
    meta = st.get("meta") or {}
    cap = (meta.get("instagram_caption") or "").strip()
    if not cap:
        cap = (meta.get("title") or st.get("q") or "").strip() + "\n\n#curiouspenguin #didyouknow #animation #explained #facts"
    return (cap + "\n\nAnimated with AI tools. Spot the penguin.")[:2100]


def post(st, save):
    jid = st["id"]
    ig = st["instagram"]
    out = os.path.join(ROOT, "out", jid)
    os.makedirs(out, exist_ok=True)
    local = os.path.join(out, "short.mp4")
    uid = ig_id()
    if not ig.get("container"):
        if not os.path.exists(local):
            import drive
            drive.download(st["final"]["id"], local)
        size = os.path.getsize(local)
        c = call("POST", f"{uid}/media", {"media_type": "REELS", "upload_type": "resumable", "caption": caption(st), "share_to_feed": "true"})
        ig.update(status="posting", container=c["id"], started=now())
        save(st)
        try:
            up = call("POST", "", url=c.get("uri") or f"https://rupload.facebook.com/ig-api-upload/{VER}/{c['id']}", raw=open(local, "rb").read(),
                      headers={"Authorization": f"OAuth {tok()}", "offset": "0", "file_size": str(size)}, timeout=900)
            if not up.get("success", True):
                raise RuntimeError(f"upload refused: {up}")
        except Exception:
            ig.pop("container", None)  # start a fresh container next time
            raise
        log("uploaded", jid, size, "bytes")
    cid = ig["container"]
    for _ in range(60):  # up to ~10 minutes of processing
        s = call("GET", cid, {"fields": "status_code,status"})
        code = s.get("status_code")
        if code == "FINISHED":
            break
        if code in ("ERROR", "EXPIRED"):
            ig.pop("container", None)
            raise RuntimeError(f"Instagram could not process the video: {s.get('status') or code}")
        time.sleep(10)
    else:
        raise RuntimeError("Instagram is still processing the video. Will check again next run")
    pub = call("POST", f"{uid}/media_publish", {"creation_id": cid})
    mid = pub["id"]
    link = call("GET", mid, {"fields": "permalink"}).get("permalink")
    st["instagram"] = {"status": "posted", "media_id": mid, "permalink": link, "at": now()}
    save(st)
    log("posted", jid, link)


def main():
    import produce as P
    todo = []
    for p in glob.glob(os.path.join(ROOT, "jobs", "*", "state.json")):
        try:
            st = json.load(open(p))
        except Exception:
            continue
        if (st.get("instagram") or {}).get("status") in ("queued", "posting", "error") and st.get("final"):
            todo.append(st)
    if not todo:
        return
    for st in todo:
        ig = st["instagram"]
        if not tok():
            st["instagram"] = {"status": "needs setup", "error": "Connect Instagram first: Channel tab, Instagram steps", "at": now()}
            P.save_state(st)
            continue
        if ig.get("status") == "error" and ig.get("fails", 0) >= 3:
            continue
        try:
            post(st, P.save_state)
        except Exception as e:
            ig = st["instagram"]
            ig["fails"] = ig.get("fails", 0) + 1
            ig["status"] = "error" if ig["fails"] < 3 else "failed"
            ig["error"] = str(e)[:300]
            P.save_state(st)
            log("failed:", e)
    P.publish_status()


if __name__ == "__main__":
    main()
