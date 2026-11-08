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


def _ffmpeg():
    import shutil, subprocess
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    r = subprocess.run("curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | tar xJ -C /tmp && "
                       "sudo cp /tmp/ffmpeg-*-static/ffmpeg /tmp/ffmpeg-*-static/ffprobe /usr/local/bin/", shell=True)
    if r.returncode or not shutil.which("ffmpeg"):
        subprocess.run("sudo DEBIAN_FRONTEND=noninteractive timeout 300 apt-get install -y -qq --no-install-recommends ffmpeg || "
                       "(sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg)", shell=True, check=True)
    return "ffmpeg"


def ig_ready(src):
    """Re-encode to Instagram's Reels spec: H.264 High yuv420p, VBR ~6 Mbps capped at 8 (limit is 25),
    AAC 48 kHz stereo 128k, moov atom first. A 59 s Short comes out around 40-50 MB."""
    import subprocess
    dst = src.replace(".mp4", ".ig.mp4")
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return dst
    subprocess.run([_ffmpeg(), "-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-profile:v", "high", "-level", "4.1",
                    "-pix_fmt", "yuv420p", "-preset", "medium", "-b:v", "6M", "-maxrate", "8M", "-bufsize", "16M",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
                    "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k", "-movflags", "+faststart", dst], check=True)
    log(f"instagram encode: {os.path.getsize(src)/1e6:.0f} MB -> {os.path.getsize(dst)/1e6:.0f} MB")
    return dst


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
        local = ig_ready(local)
        size = os.path.getsize(local)
        c = call("POST", f"{uid}/media", {"media_type": "REELS", "upload_type": "resumable", "caption": caption(st), "share_to_feed": "true"})
        ig.update(status="posting", container=c["id"], started=now())
        save(st)
        try:
            how, newc = send_video(c["id"], c.get("uri"), local, st, save)
            ig["container"] = newc
            save(st)
        except Exception:
            ig.pop("container", None)  # start a fresh container next time
            unshare(st, save)
            raise
        log("uploaded", jid, size, "bytes via", how)
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
    try:
        import drive
        if ig.get("tmpfile"):  # temporary Instagram copy: delete it outright
            drive.req("DELETE", f"{drive.API}/files/{ig['tmpfile']}")
            ig.pop("tmpfile", None); ig.pop("share", None)
        elif ig.get("share"):
            drive.req("DELETE", f"{drive.API}/files/{st['final']['id']}/permissions/{ig['share']}")
            ig.pop("share", None)
        save(st)
    except Exception as e:
        log("could not unshare the Drive file:", str(e)[:150])


def send_video(cid, uri, local, st, save):
    """Push the video into a resumable container. Byte upload first; Instagram has refused byte uploads of Reels
    over ~40 s since Oct 2026 (ProcessingFailedError), so fall back to file_url: a temporary link-shared copy in
    Drive that Meta fetches itself, deleted once the container is ready."""
    url = uri or f"https://rupload.facebook.com/ig-api-upload/{VER}/{cid}"
    size = os.path.getsize(local)
    import subprocess
    try:
        secs = float(subprocess.run([_ffmpeg().replace("ffmpeg", "ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", local],
                                    capture_output=True, text=True).stdout.strip() or 0)
    except Exception:
        secs = 0
    try:
        if secs > 38:  # known refusal; go straight to the hosted link
            raise RuntimeError(f"ProcessingFailedError (skipped byte upload, {secs:.0f} s Reel)")
        up = call("POST", "", url=url, raw=open(local, "rb").read(),
                  headers={"Authorization": f"OAuth {tok()}", "offset": "0", "file_size": str(size)}, timeout=900)
        if up.get("success", True):
            return "bytes", cid
        raise RuntimeError(f"upload refused: {up}")
    except RuntimeError as e:
        if "ProcessingFailedError" not in str(e):
            raise
        log("byte upload refused (known Instagram limit on longer Reels), switching to hosted link")
    import drive
    ig = st.setdefault("instagram", {})
    fid = drive.upload(drive.CFG["videos"], f"ig-temp-{st['id']}.mp4", local, "video/mp4")
    ig["tmpfile"] = fid
    ig["share"] = drive.req("POST", f"{drive.API}/files/{fid}/permissions", json.dumps({"type": "anyone", "role": "reader"}).encode()).get("id")
    save(st)
    link = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
    ig["link"] = link
    try:  # what will Meta's fetcher see? (anonymous request, first KB)
        rq = urllib.request.Request(link, headers={"Range": "bytes=0-1023", "User-Agent": "facebookexternalhit/1.1"})
        with urllib.request.urlopen(rq, timeout=60) as rr:
            head = rr.read(64)
            log("hosted link check:", rr.status, rr.headers.get("Content-Type"), rr.headers.get("Content-Range") or rr.headers.get("Content-Length"),
                "| looks like mp4" if b"ftyp" in head else "| NOT a video: " + head[:40].decode("latin1"))
    except Exception as e:
        log("hosted link check failed:", str(e)[:150])
    # the refused container can't take another upload; open a fresh one that fetches the link itself
    c2 = call("POST", f"{ig_id()}/media", {"media_type": "REELS", "video_url": link, "caption": caption(st), "share_to_feed": "true"})
    return "hosted", c2["id"]


def whoami():
    """Read-only check: who the token is, what it can do. Posts nothing."""
    if not tok():
        print("No IG_ACCESS_TOKEN secret yet."); return
    print("login type:", "Instagram Login" if ig_login() else "Facebook Login")
    uid = ig_id()
    info = call("GET", uid, {"fields": "username,account_type,media_count" if ig_login() else "username,followers_count,media_count"})
    print("account:", info.get("username"), "| followers:", info.get("followers_count", "?"), "| posts:", info.get("media_count"))
    dbg = call("GET", "", url="https://graph.facebook.com/debug_token?" + urllib.parse.urlencode({"input_token": tok(), "access_token": tok()}), timeout=20) if not ig_login() else {}
    d = dbg.get("data", {})
    if d:
        print("token valid:", d.get("is_valid"), "| type:", d.get("type"), "| expires:", d.get("expires_at") or "never", "| scopes:", ",".join(d.get("scopes", [])))
    lim = call("GET", f"{uid}/content_publishing_limit", {"fields": "quota_usage,config"})
    print("publishing quota:", json.dumps(lim.get("data", lim))[:200])
    print("token renewed:", _live.get("renewed") or "not yet (uses the GitHub secret)")


def dryrun(jid, trim=None):
    """Pressure test: upload a finished Short to Instagram and wait until it's ready to publish, then STOP.
    Nothing is published. The unused container expires on its own within 24 hours."""
    st = json.load(open(os.path.join(ROOT, "jobs", jid, "state.json")))
    st = dict(st, instagram={"status": "queued"})
    t0 = time.time()
    uid = ig_id()
    out = os.path.join(ROOT, "out", jid); os.makedirs(out, exist_ok=True)
    local = os.path.join(out, "short.mp4")
    import drive
    drive.download(st["final"]["id"], local)
    print(f"original: {os.path.getsize(local)/1e6:.1f} MB")
    local = ig_ready(local)
    if trim:
        import subprocess
        cut = local.replace(".mp4", f".{int(trim)}s.mp4")
        subprocess.run([_ffmpeg(), "-y", "-loglevel", "error", "-i", local, "-t", str(trim), "-c", "copy", "-movflags", "+faststart", cut], check=True)
        local = cut
        print(f"trimmed to first {trim:.0f} s for the test")
    size = os.path.getsize(local)
    print(f"video: {size/1e6:.1f} MB, login type: {'Instagram' if ig_login() else 'Facebook/system user'}")
    lim = call("GET", f"{uid}/content_publishing_limit", {"fields": "quota_usage,config"})
    print("quota before:", json.dumps(lim.get("data", lim))[:200])
    if ig_login():
        print("dry run only covers the Facebook-login route"); return
    c = call("POST", f"{uid}/media", {"media_type": "REELS", "upload_type": "resumable", "caption": caption(st), "share_to_feed": "true"})
    print("container:", c.get("id"), "| upload uri host:", urllib.parse.urlparse(c.get("uri", "")).netloc)
    st["instagram"] = {"status": "dryrun"}
    try:
        how, cid = send_video(c["id"], c.get("uri"), local, st, lambda s: None)
        print(f"upload accepted via {how} in {time.time()-t0:.0f}s (container {cid})")
        for i in range(60):
            r = call("GET", cid, {"fields": "status_code,status"})
            if r.get("status_code") in ("FINISHED", "ERROR", "EXPIRED"):
                break
            time.sleep(10)
        print(f"container status after {time.time()-t0:.0f}s:", r)
    finally:
        unshare(st, lambda s: None)
        print("temporary Drive copy cleaned up")
    print("caption preview:\n" + caption(st))
    print("RESULT:", "READY TO PUBLISH (not published)" if r.get("status_code") == "FINISHED" else "NOT READY")


def _metrics(obj, wanted, extra=None):
    """Ask for insight metrics; drop any the API rejects for this media/account and retry."""
    wanted = list(wanted)
    for _ in range(len(wanted)):
        try:
            res = call("GET", f"{obj}/insights", dict({"metric": ",".join(wanted)}, **(extra or {})), timeout=30).get("data", [])
            out = {}
            for m in res:
                v = (m.get("total_value") or {}).get("value")
                if v is None and m.get("values"):
                    v = m["values"][-1].get("value")
                out[m["name"]] = v
            return out
        except RuntimeError as e:
            bad = [w for w in wanted if w in str(e)]
            if not bad:
                return {"error": str(e)[:200]}
            wanted = [w for w in wanted if w not in bad]
            if not wanted:
                return {}
    return {}


def insights(save_to=None):
    """Account + per-Reel numbers for the dashboard. Read-only."""
    uid = ig_id()
    acct = call("GET", uid, {"fields": "username,followers_count,media_count"}, timeout=30)
    media = call("GET", f"{uid}/media", {"fields": "id,caption,permalink,timestamp,media_product_type,like_count,comments_count", "limit": 50}, timeout=30).get("data", [])
    reels = []
    for m in media:
        row = {k: m.get(k) for k in ("id", "permalink", "timestamp", "like_count", "comments_count")}
        row["title"] = ((m.get("caption") or "").split("\n")[0])[:90]
        row.update(_metrics(m["id"], ["views", "reach", "likes", "comments", "shares", "saved", "total_interactions",
                                       "ig_reels_avg_watch_time", "ig_reels_video_view_total_time"]))
        reels.append(row)
    since = int(time.time()) - 28 * 86400
    acc = _metrics(uid, ["reach", "views", "profile_views", "accounts_engaged", "follows_and_unfollows"],
                   {"period": "day", "metric_type": "total_value", "since": since, "until": int(time.time())})
    data = {"updated": now(), "username": acct.get("username"), "followers": acct.get("followers_count"),
            "posts": acct.get("media_count"), "last_28d": acc, "reels": reels}
    if save_to:
        os.makedirs(os.path.dirname(save_to), exist_ok=True)
        json.dump(data, open(save_to, "w"), indent=1)
    return data


def insights_sync(every_hours=3):
    """Refresh Instagram numbers for the dashboard (every 3 h) and copy each posted Reel's stats onto its job."""
    path = os.path.join(ROOT, "analytics", "instagram.json")
    if not tok():
        return
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < every_hours * 3600 - 300:
        return
    try:
        d = insights(path)
    except Exception as e:
        log("insights failed:", str(e)[:200]); return
    by_id = {r["id"]: r for r in d["reels"]}
    import produce as P
    for p in glob.glob(os.path.join(ROOT, "jobs", "*", "state.json")):
        try:
            st = json.load(open(p))
        except Exception:
            continue
        ig = st.get("instagram") or {}
        r = by_id.get(ig.get("media_id"))
        if r:
            ig["stats"] = {k: r.get(k) for k in ("views", "reach", "likes", "comments", "shares", "saved", "ig_reels_avg_watch_time")}
            ig["stats_at"] = d["updated"]
            st["instagram"] = ig
            P.save_state(st)
    log("insights:", d.get("followers"), "followers,", len(d["reels"]), "reels")


def main():
    if sys.argv[1:] == ["insights-sync"]:
        return insights_sync()
    if sys.argv[1:] == ["whoami"]:
        return whoami()
    if sys.argv[1:2] == ["dryrun"]:
        return dryrun(sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else None)
    if sys.argv[1:] == ["insights"]:
        d = insights(os.path.join(ROOT, "analytics", "instagram.json"))
        print(json.dumps({k: v for k, v in d.items() if k != "reels"}, indent=1)); print("reels:", len(d["reels"]))
        for r in d["reels"][:5]: print(json.dumps(r)[:300])
        return
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
