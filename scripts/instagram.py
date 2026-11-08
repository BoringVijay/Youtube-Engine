#!/usr/bin/env python3
"""Instagram Reels publisher.

Two login types, picked from the token itself:
  * Instagram Login (token starts "IG", no Facebook Page needed). Host graph.instagram.com. Reels need a public
    video_url, so the Short's Drive file is shared "anyone with the link" for the few minutes Instagram needs to fetch
    it, then unshared. The token lasts 60 days; the engine renews it weekly and keeps the newest in a private Drive file.
  * Facebook Login (Page token, starts "EAA"). Host graph.facebook.com with resumable upload to rupload.facebook.com.

Only posts a Short after Vijay taps "Post to Instagram" in Penguin Studio (inbox message {"type": "instagram", "id": ...}).
Flow: create a REELS container (upload_type=resumable) -> send the bytes to rupload.facebook.com -> wait until the
container is FINISHED -> media_publish -> read the permalink.

Env:
  IG_ACCESS_TOKEN  Instagram Login token (IG...) or a Facebook Page token (EAA...)
  IG_USER_ID       the Instagram professional account id (optional: looked up from the token)
  GDRIVE_REFRESH_TOKEN (+ YT_CLIENT_ID / YT_CLIENT_SECRET) to fetch the finished Short from Drive
"""
import datetime as dt, glob, json, os, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = "v26.0"
_acct = {}
_live = {}
TOKEN_FILE = "ig_token.json"  # private engine folder in Drive, never the panel outbox


def ig_login():
    return tok().startswith("IG")


def graph():
    return f"https://graph.instagram.com/{VER}" if ig_login() else f"https://graph.facebook.com/{VER}"


def log(*a):
    print(time.strftime("%H:%M:%S"), "[instagram]", *a, flush=True)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _private_folder():
    import drive
    return drive.ensure_folder(drive.CFG["root"], "engine-private")


def tok():
    """Newest token: the renewed one in Drive if it exists, else the GitHub secret."""
    if "token" in _live:
        return _live["token"]
    t = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    _live["token"], _live["renewed"] = t, None
    if t.startswith("IG") and os.environ.get("GDRIVE_REFRESH_TOKEN"):
        try:
            import drive
            hit = drive.find(_private_folder(), TOKEN_FILE)
            if hit:
                saved = json.loads(drive.read_text(hit[0]["id"]))
                if saved.get("seed") == t[-12:] and saved.get("token"):  # a new secret always wins over an old renewal
                    _live["token"], _live["renewed"] = saved["token"], saved.get("renewed")
        except Exception as e:
            log("could not read the renewed token:", str(e)[:150])
    return _live["token"]


def renew():
    """Instagram Login tokens last 60 days. Renew weekly (allowed once the token is a day old)."""
    if not ig_login():
        return
    last = _live.get("renewed")
    if last and dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(last) < dt.timedelta(days=7):
        return
    try:
        r = call("GET", "", url="https://graph.instagram.com/refresh_access_token?" + urllib.parse.urlencode(
            {"grant_type": "ig_refresh_token", "access_token": tok()}), timeout=30)
        if r.get("access_token"):
            import drive
            seed = os.environ.get("IG_ACCESS_TOKEN", "").strip()[-12:]
            drive.put_bytes(_private_folder(), TOKEN_FILE, json.dumps({"token": r["access_token"], "seed": seed, "renewed": now()}).encode(), "application/json")
            _live["token"], _live["renewed"] = r["access_token"], now()
            log("token renewed, good for", int(r.get("expires_in", 0)) // 86400, "days")
    except Exception as e:
        log("token renewal skipped:", str(e)[:200])


def call(method, path, params=None, headers=None, raw=None, url=None, timeout=120):
    params = dict(params or {})
    full = url or f"{graph()}/{path}"
    data = None
    if raw is not None:
        data = raw
    elif url and "access_token=" in url:
        pass
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
    try:
        cid = json.load(open(os.path.join(ROOT, "config", "publish.json"))).get("instagram_user_id")
        if cid:
            return str(cid)
    except Exception:
        pass
    if _acct.get("id"):
        return _acct["id"]
    if ig_login():
        me = call("GET", "me", {"fields": "user_id,username"})
        _acct["id"] = str(me.get("user_id") or me["id"])
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
    if not ig.get("container") and ig_login():
        import drive
        fid = st["final"]["id"]
        perm = drive.req("POST", f"{drive.API}/files/{fid}/permissions", json.dumps({"type": "anyone", "role": "reader"}).encode())
        ig["share"] = perm.get("id")
        save(st)
        try:
            c = call("POST", f"{uid}/media", {"media_type": "REELS", "share_to_feed": "true", "caption": caption(st),
                                              "video_url": f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"})
            ig.update(status="posting", container=c["id"], started=now())
            save(st)
        except Exception:
            unshare(st, save)
            raise
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
            unshare(st, save)
            raise RuntimeError(f"Instagram could not process the video: {s.get('status') or code}")
        time.sleep(10)
    else:
        raise RuntimeError("Instagram is still processing the video. Will check again next run")
    unshare(st, save)  # Instagram has its copy; the Drive file goes back to private
    pub = call("POST", f"{uid}/media_publish", {"creation_id": cid})
    mid = pub["id"]
    link = call("GET", mid, {"fields": "permalink"}).get("permalink")
    st["instagram"] = {"status": "posted", "media_id": mid, "permalink": link, "at": now()}
    save(st)
    log("posted", jid, link)


def unshare(st, save):
    ig = st.get("instagram") or {}
    if ig.get("share"):
        try:
            import drive
            drive.req("DELETE", f"{drive.API}/files/{st['final']['id']}/permissions/{ig['share']}")
            ig.pop("share", None)
            save(st)
        except Exception as e:
            log("could not unshare the Drive file:", str(e)[:150])


def whoami():
    """Read-only check: who the token is, what it can do. Posts nothing."""
    if not tok():
        print("No IG_ACCESS_TOKEN secret yet."); return
    print("login type:", "Instagram Login" if ig_login() else "Facebook Login")
    uid = ig_id()
    info = call("GET", uid, {"fields": "username,account_type,media_count" if ig_login() else "username,media_count"})
    print("account:", info.get("username"), "| type:", info.get("account_type", "?"), "| posts:", info.get("media_count"))
    lim = call("GET", f"{uid}/content_publishing_limit", {"fields": "quota_usage,config"})
    print("publishing quota:", json.dumps(lim.get("data", lim))[:200])
    print("token renewed:", _live.get("renewed") or "not yet (uses the GitHub secret)")


def main():
    if sys.argv[1:] == ["whoami"]:
        return whoami()
    import produce as P
    todo = []
    for p in glob.glob(os.path.join(ROOT, "jobs", "*", "state.json")):
        try:
            st = json.load(open(p))
        except Exception:
            continue
        ig = st.get("instagram") or {}
        due = ig.get("status") == "scheduled" and ig.get("at") and dt.datetime.fromisoformat(ig["at"]) <= dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=12)
        if (ig.get("status") in ("queued", "posting", "error") or due) and st.get("final"):
            todo.append(st)
    if tok():
        renew()
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
        if ig.get("status") == "scheduled":  # runs start a few minutes early; wait for the exact time
            wait = (dt.datetime.fromisoformat(ig["at"]) - dt.datetime.now(dt.timezone.utc)).total_seconds()
            if 0 < wait < 900:
                log(f"waiting {int(wait)}s for the scheduled time"); time.sleep(wait)
            ig["status"] = "queued"
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
