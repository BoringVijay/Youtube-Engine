#!/usr/bin/env python3
"""YouTube publisher. Uploads approved videos as PRIVATE with full metadata, thumbnail, playlist and AI disclosure,
then proposes a publishing slot. It never makes anything public on its own.

Stages: approved -> uploading -> scheduled (private on YouTube, waiting for Vijay to publish or confirm the slot).
Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN, GDRIVE_REFRESH_TOKEN
"""
import datetime as dt, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import drive  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "publish.json")))
YT = "https://www.googleapis.com/youtube/v3"
_tok = {}


def log(*a):
    print(time.strftime("%H:%M:%S"), "[publish]", *a, flush=True)


def token():
    if _tok.get("v") and time.time() < _tok["exp"]:
        return _tok["v"]
    data = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                   "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    r = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data, timeout=30))
    _tok.update(v=r["access_token"], exp=time.time() + int(r.get("expires_in", 3600)) - 120)
    return _tok["v"]


def api(method, path, body=None, params=None, ctype="application/json", raw=None, timeout=120):
    url = f"{YT}/{path}" + ("?" + urllib.parse.urlencode(params) if params else "")
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    r = urllib.request.Request(url, data=data, method=method, headers={"Authorization": f"Bearer {token()}", "Content-Type": ctype})
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            txt = resp.read()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"YouTube {method} {path} -> HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}")


def upload_video(path, snippet, status):
    size = os.path.getsize(path)
    meta = json.dumps({"snippet": snippet, "status": status}).encode()
    init = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", data=meta, method="POST",
                                  headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json; charset=UTF-8",
                                           "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)})
    try:
        loc = urllib.request.urlopen(init, timeout=60).headers["Location"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"YouTube upload start -> HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}")
    chunk, pos = 16 * 1024 * 1024, 0
    with open(path, "rb") as f:
        while pos < size:
            data = f.read(chunk)
            end = pos + len(data) - 1
            r = urllib.request.Request(loc, data=data, method="PUT", headers={"Content-Length": str(len(data)), "Content-Range": f"bytes {pos}-{end}/{size}"})
            try:
                with urllib.request.urlopen(r, timeout=600) as resp:
                    return json.loads(resp.read())
            except urllib.error.HTTPError as e:
                if e.code != 308:
                    raise RuntimeError(f"YouTube upload chunk -> HTTP {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")
            pos = end + 1
    raise RuntimeError("upload ended without a video id")


def playlist_id(title):
    items = api("GET", "playlists", params={"part": "snippet", "mine": "true", "maxResults": 50}).get("items", [])
    for it in items:
        if it["snippet"]["title"] == title:
            return it["id"]
    return api("POST", "playlists", {"snippet": {"title": title, "description": "Curious Penguin. Spot the penguin."}, "status": {"privacyStatus": "public"}},
               params={"part": "snippet,status"})["id"]


def add_to_playlist(pid, vid):
    try:
        api("POST", "playlistItems", {"snippet": {"playlistId": pid, "resourceId": {"kind": "youtube#video", "videoId": vid}}}, params={"part": "snippet"})
    except Exception as e:
        log("playlist add failed:", str(e)[:200])


def set_thumbnail(vid, jpg):
    raw = open(jpg, "rb").read()
    url = f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}"
    r = urllib.request.Request(url, data=raw, method="POST", headers={"Authorization": f"Bearer {token()}", "Content-Type": "image/jpeg"})
    try:
        urllib.request.urlopen(r, timeout=120).read()
        return True
    except urllib.error.HTTPError as e:
        log("thumbnail not set (custom thumbnails need a phone-verified channel):", e.code, e.read()[:200])
        return False


def next_slots(n, taken):
    """Propose publishing slots: rotate experiment times (IST) and respect the daily cap."""
    tz = dt.timezone(dt.timedelta(hours=5, minutes=30))
    now = dt.datetime.now(tz)
    slots, day = [], now.date() + dt.timedelta(days=1)
    per_day = {}
    for t in taken:
        d = dt.datetime.fromisoformat(t).astimezone(tz).date()
        per_day[d] = per_day.get(d, 0) + 1
    k = len(taken)
    while len(slots) < n:
        if per_day.get(day, 0) < CFG["daily_cap"]:
            hh, mm = CFG["experiment_slots_ist"][k % len(CFG["experiment_slots_ist"])].split(":")
            slots.append(dt.datetime(day.year, day.month, day.day, int(hh), int(mm), tzinfo=tz).isoformat())
            per_day[day] = per_day.get(day, 0) + 1
            k += 1
        else:
            day += dt.timedelta(days=1)
    return slots


def describe(meta, extra=""):
    desc = (meta.get("description") or "").strip()
    desc += "\n\n" + CFG["description_footer"]
    return (desc + extra)[:4900]


def publish(st, save, status_cb):
    jid = st["id"]
    meta = st.get("meta") or {}
    out = os.path.join(ROOT, "out", jid)
    os.makedirs(out, exist_ok=True)
    yt = st.setdefault("youtube", {})
    taken = [v["slot"] for s in all_states() for v in (s.get("youtube") or {}).get("videos", []) if v.get("slot")]
    pid = None
    try:
        pid = playlist_id(CFG["playlist"])
    except Exception as e:
        log("playlist lookup failed:", str(e)[:200])
    videos = yt.setdefault("videos", [])
    done_kinds = {v["kind"] for v in videos}
    items = []
    if st.get("final") and "main" not in done_kinds:
        is_short = not (st.get("brew", {}).get("format") or {}).get("long", True)
        items.append(("main", st["final"]["id"], meta.get("title") or st.get("q"), describe(meta) + ("\n#Shorts" if is_short else "")))
    for k, sh in enumerate(st.get("shorts") or []):
        if f"short{k + 1}" in done_kinds:
            continue
        sm = (meta.get("shorts") or [{}] * (k + 1))[k] if k < len(meta.get("shorts") or []) else {}
        title = (sm.get("title") or sh.get("title") or st.get("q"))[:95]
        items.append((f"short{k + 1}", sh["id"], title, ((sm.get("description") or "") + "\n\n" + CFG["description_footer"] + "\n#Shorts")[:4900]))
    for kind, fid, title, desc in items:
        local = os.path.join(out, f"{kind}.mp4")
        if not os.path.exists(local):
            drive.download(fid, local)
        snippet = {"title": title[:100], "description": desc, "tags": (meta.get("tags") or [])[:30], "categoryId": CFG["category_id"],
                   "defaultLanguage": "en", "defaultAudioLanguage": "en"}
        status = {"privacyStatus": "private", "selfDeclaredMadeForKids": False, "containsSyntheticMedia": True, "embeddable": True, "license": "youtube"}
        st["step"] = f"Uploading {kind} to YouTube (private)"
        save(st); status_cb()
        res = upload_video(local, snippet, status)
        vid = res["id"]
        entry = {"kind": kind, "id": vid, "url": f"https://youtu.be/{vid}", "studio": f"https://studio.youtube.com/video/{vid}/edit",
                 "title": title, "privacy": res.get("status", {}).get("privacyStatus", "private"), "uploaded": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
        if kind == "main":
            thumb_local = os.path.join(out, "thumb.jpg")
            if st.get("thumb") and not os.path.exists(thumb_local):
                drive.download(st["thumb"]["id"], thumb_local)
            if os.path.exists(thumb_local):
                entry["thumbnail"] = set_thumbnail(vid, thumb_local)
            if meta.get("pinned_comment"):
                entry["pinned_comment_draft"] = meta["pinned_comment"]
        if pid:
            add_to_playlist(pid, vid)
        videos.append(entry)
        save(st)
        log("uploaded", kind, vid)
    # proposed slots, main first; Shorts spread on following days
    need = [v for v in videos if not v.get("slot")]
    for v, slot in zip(need, next_slots(len(need), taken)):
        v["slot"] = slot
    yt["audited"] = CFG.get("api_audited", False)
    yt["note"] = ("Uploaded private. YouTube keeps API uploads from unaudited apps private, so publish from YouTube Studio at the proposed time "
                  "(or schedule it there). Once the API audit is approved, the engine can schedule them itself.") if not yt["audited"] else "Scheduled."
    save(st)


def all_states():
    import glob
    out = []
    for p in glob.glob(os.path.join(ROOT, "jobs", "*", "state.json")):
        try:
            out.append(json.load(open(p)))
        except Exception:
            pass
    return out


def main():
    import produce as P
    todo = [s for s in all_states() if s.get("stage") in ("approved", "uploading") and s.get("v") == 2]
    if not todo:
        return
    if not os.environ.get("YT_REFRESH_TOKEN"):
        log("no YouTube token; skipping")
        return
    for st in todo:
        try:
            P.set_stage(st, "uploading", "Uploading to YouTube as private")
            publish(st, P.save_state, P.publish_status)
            P.set_stage(st, "scheduled", "On YouTube as private. Publish it at the proposed slot in YouTube Studio", 97)
        except Exception as e:
            st["error"] = str(e)[:400]
            st["step"] = "YouTube upload hit an error. Retrying next run"
            P.save_state(st)
            P.publish_status()
            log("failed:", e)


if __name__ == "__main__":
    main()
