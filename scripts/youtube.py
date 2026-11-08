#!/usr/bin/env python3
"""YouTube channel link: who the engine is connected to, and tracking for posted Shorts.

Until the Google Cloud project passes the YouTube API audit, videos uploaded through the API are locked
private for good, so Shorts are posted by Vijay from the YouTube app with the posting kit in Penguin Studio.
This module then finds each posted Short on the channel (read-only API, 1 quota unit a call) and tracks it:
privacy, scheduled time, views, likes and comments.

  python3 scripts/youtube.py whoami   # print the connected channel
  python3 scripts/youtube.py sync     # match posted Shorts and refresh their numbers
Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
"""
import datetime as dt, difflib, glob, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YT = "https://www.googleapis.com/youtube/v3"
_tok, _cache = {}, {}
TRACK = ("approved", "posting", "uploading", "scheduled", "live")


def log(*a):
    print(time.strftime("%H:%M:%S"), "[youtube]", *a, flush=True)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def have_token():
    return all(os.environ.get(k) for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"))


def token():
    if _tok.get("v") and time.time() < _tok["exp"]:
        return _tok["v"]
    data = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                   "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    r = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data, timeout=30))
    _tok.update(v=r["access_token"], exp=time.time() + int(r.get("expires_in", 3600)) - 120)
    return _tok["v"]


def get(path, **params):
    url = f"{YT}/{path}?" + urllib.parse.urlencode(params)
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {token()}"})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"YouTube {path} -> HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")


def channel():
    """Connected channel summary for status.json. Cached per run; never raises."""
    if "channel" in _cache:
        return _cache["channel"]
    if not have_token():
        _cache["channel"] = {"connected": False, "error": "No YouTube token in the engine"}
        return _cache["channel"]
    try:
        items = get("channels", part="snippet,statistics,contentDetails", mine="true").get("items", [])
        if not items:
            _cache["channel"] = {"connected": False, "error": "The Google account behind the token has no YouTube channel"}
        else:
            c = items[0]
            handle = c["snippet"].get("customUrl") or ""
            _cache["channel"] = {
                "connected": True, "id": c["id"], "title": c["snippet"]["title"], "handle": handle,
                "url": f"https://www.youtube.com/{handle}" if handle.startswith("@") else f"https://www.youtube.com/channel/{c['id']}",
                "studio": f"https://studio.youtube.com/channel/{c['id']}",
                "thumb": ((c["snippet"].get("thumbnails") or {}).get("default") or {}).get("url"),
                "subs": int(c["statistics"].get("subscriberCount", 0)) if not c["statistics"].get("hiddenSubscriberCount") else None,
                "views": int(c["statistics"].get("viewCount", 0)), "videos": int(c["statistics"].get("videoCount", 0)),
                "uploads": c["contentDetails"]["relatedPlaylists"]["uploads"], "checked": now()}
    except Exception as e:
        _cache["channel"] = {"connected": False, "error": str(e)[:200]}
    return _cache["channel"]


def recent_videos(n=30):
    ch = channel()
    if not ch.get("connected"):
        return []
    items = get("playlistItems", part="contentDetails", playlistId=ch["uploads"], maxResults=min(n, 50)).get("items", [])
    ids = [i["contentDetails"]["videoId"] for i in items]
    if not ids:
        return []
    vids = get("videos", part="snippet,status,statistics,contentDetails", id=",".join(ids)).get("items", [])
    return vids


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", (s or "").lower().replace("’", "'")).strip()


def describe(v):
    st, s = v.get("status", {}), v.get("statistics", {})
    privacy = st.get("privacyStatus")
    return {"kind": "main", "id": v["id"], "url": f"https://youtube.com/shorts/{v['id']}", "studio": f"https://studio.youtube.com/video/{v['id']}/edit",
            "title": v["snippet"]["title"], "privacy": privacy, "publish_at": st.get("publishAt"), "published": v["snippet"].get("publishedAt"),
            "upload_status": st.get("uploadStatus"), "views": int(s.get("viewCount", 0)), "likes": int(s.get("likeCount", 0)),
            "comments": int(s.get("commentCount", 0)), "checked": now()}


def match(st, vids, taken):
    titles = [norm((st.get("meta") or {}).get("title"))] + [norm(t) for t in (st.get("meta") or {}).get("alt_titles", [])] + [norm(st.get("q"))]
    titles = [t for t in titles if t]
    best, score = None, 0.0
    for v in vids:
        if v["id"] in taken:
            continue
        t = norm(v["snippet"]["title"])
        r = max(difflib.SequenceMatcher(None, t, x).ratio() for x in titles) if titles else 0
        if r > score:
            best, score = v, r
    return best if score >= 0.72 else None


def sync(states, save):
    """Find posted Shorts on the channel and refresh their numbers. Returns how many jobs changed."""
    todo = [s for s in states if s.get("stage") in TRACK and s.get("final")]
    if not todo or not channel().get("connected"):
        return 0
    vids = recent_videos(40)
    by_id = {v["id"]: v for v in vids}
    taken = {((s.get("youtube") or {}).get("videos") or [{}])[0].get("id") for s in states}
    changed = 0
    for st in todo:
        yt = st.setdefault("youtube", {})
        cur = (yt.get("videos") or [None])[0]
        v = by_id.get(cur["id"]) if cur and cur.get("id") else None
        if not v and cur and cur.get("id"):
            got = get("videos", part="snippet,status,statistics,contentDetails", id=cur["id"]).get("items", [])
            v = got[0] if got else None
        if not v:
            v = match(st, vids, taken)
            if v:
                taken.add(v["id"])
                log("found", st["id"], "->", v["id"], v["snippet"]["title"])
        if not v:
            if st.get("stage") == "posting" and st.get("posted_claimed"):
                st["step"] = "You said it's posted, but it isn't on the channel yet. It's matched by title, so keep the kit's title"
                save(st)
            continue
        d = describe(v)
        yt["videos"] = [d]
        yt["channel"] = channel().get("handle") or channel().get("title")
        if d["privacy"] == "public":
            stage, step = "live", f"Live on YouTube · {d['views']:,} views · {d['likes']:,} likes · {d['comments']:,} comments"
        elif d["publish_at"]:
            stage, step = "scheduled", "Scheduled on YouTube for " + d["publish_at"]
        else:
            stage, step = "scheduled", f"Uploaded as {d['privacy']}. Flip it to Public (or schedule it) in YouTube Studio"
        if stage != st.get("stage") or step != st.get("step"):
            st["stage"], st["step"] = stage, step
            st["pct"] = 100 if stage == "live" else 97
            st.setdefault("steps", []).append({"stage": stage, "at": now()})
            changed += 1
        save(st)
    return changed


def put(path, body, **params):
    url = f"{YT}/{path}?" + urllib.parse.urlencode(params)
    r = urllib.request.Request(url, data=json.dumps(body).encode(), method="PUT",
                               headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"YouTube {path} -> HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")


def set_audience(kids=True):
    """Set made-for-kids on every Curious Penguin video the engine uploaded, keeping its other status settings."""
    ids = []
    for p in glob.glob(os.path.join(ROOT, "jobs", "*", "state.json")):
        st = json.load(open(p))
        ids += [v["id"] for v in ((st.get("youtube") or {}).get("videos") or []) if v.get("id")]
    for i in range(0, len(ids), 50):
        for v in get("videos", part="status", id=",".join(ids[i:i + 50])).get("items", []):
            stt = {k: v["status"][k] for k in ("privacyStatus", "embeddable", "license", "publicStatsViewable", "publishAt", "containsSyntheticMedia") if k in v["status"]}
            stt["selfDeclaredMadeForKids"] = kids
            out = put("videos", {"id": v["id"], "status": stt}, part="status")
            log(v["id"], "madeForKids:", out.get("status", {}).get("madeForKids"), "selfDeclared:", out.get("status", {}).get("selfDeclaredMadeForKids"))


ANALYTICS = os.path.join(ROOT, "analytics", "latest.json")
YTA = "https://youtubeanalytics.googleapis.com/v2/reports"


def report(start, end, metrics, dimensions="", filters="", sort="", max_results=None):
    params = {"ids": "channel==MINE", "startDate": start, "endDate": end, "metrics": metrics}
    if dimensions: params["dimensions"] = dimensions
    if filters: params["filters"] = filters
    if sort: params["sort"] = sort
    if max_results: params["maxResults"] = max_results
    r = urllib.request.Request(YTA + "?" + urllib.parse.urlencode(params), headers={"Authorization": f"Bearer {token()}"})
    try:
        with urllib.request.urlopen(r, timeout=40) as resp:
            out = json.load(resp)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Analytics -> HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")
    cols = [c["name"] for c in out.get("columnHeaders", [])]
    return [dict(zip(cols, row)) for row in out.get("rows", []) or []]


def analytics(states, save, every_hours=3):
    """YouTube Analytics for the channel and every tracked Short. Analytics lags 1-2 days; the Data API views are live."""
    if not channel().get("connected"):
        return None
    try:
        prev = json.load(open(ANALYTICS))
        age = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(prev["at"])).total_seconds() / 3600
        if age < every_hours:
            return prev
    except Exception:
        prev = None
    today = dt.date.today()
    start28, end = (today - dt.timedelta(days=28)).isoformat(), today.isoformat()
    m = "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained"
    out = {"at": now(), "range": [start28, end], "note": "YouTube Analytics lags 1-2 days; live view counts come from the Data API."}
    try:
        tot = report(start28, end, m)
        out["totals"] = tot[0] if tot else {}
        out["daily"] = [[r["day"], r["views"], r.get("subscribersGained", 0)] for r in report(start28, end, "views,subscribersGained", "day", sort="day")]
        ids = []
        for st in states:
            ids += [v["id"] for v in ((st.get("youtube") or {}).get("videos") or []) if v.get("id")]
        per = {}
        for i in range(0, len(ids), 200):
            first = min((st.get("created") or end)[:10] for st in states if st.get("youtube")) if ids else start28
            for r in report(first, end, m, "video", "video==" + ",".join(ids[i:i + 200]), "-views", 200):
                per[r["video"]] = {k: r[k] for k in r if k != "video"}
        out["videos"] = per
        for st in states:
            vids = (st.get("youtube") or {}).get("videos") or []
            changed = False
            for v in vids:
                if v.get("id") in per:
                    v["analytics"] = per[v["id"]]; changed = True
            if changed:
                save(st)
    except Exception as e:
        log("analytics failed:", str(e)[:200])
        out["error"] = str(e)[:200]
        if prev and not out.get("totals"):
            prev["error"] = out["error"]
            out = prev
    os.makedirs(os.path.dirname(ANALYTICS), exist_ok=True)
    json.dump(out, open(ANALYTICS, "w"), indent=1)
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "whoami"
    if cmd in ("kids", "notkids"):
        set_audience(cmd == "kids")
        return
    if cmd == "whoami":
        c = channel()
        print(json.dumps({k: v for k, v in c.items() if k != "uploads"}, indent=1))
        if c.get("connected"):
            for v in recent_videos(10):
                print(" -", v["snippet"]["title"][:70], "|", v["status"]["privacyStatus"], "|", v["snippet"]["publishedAt"])
    elif cmd == "sync":
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import produce as P
        n = sync(P.all_states(), P.save_state)
        log(f"{n} job(s) changed")
        a = analytics(P.all_states(), P.save_state)
        if a:
            log("analytics:", json.dumps(a.get("totals", {}))[:200], a.get("error", ""))
        P.publish_status()


if __name__ == "__main__":
    main()
