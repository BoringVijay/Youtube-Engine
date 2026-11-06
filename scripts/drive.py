#!/usr/bin/env python3
"""Google Drive bridge between the engine and the control panel.

outbox/  engine -> panel: deck.json, status.json, analytics.json, comments.json
inbox/   panel -> engine: one JSON file per request (brew, approve, reply...), moved to inbox/done after handling
Env: YT_CLIENT_ID, YT_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "drive.json")))
API = "https://www.googleapis.com/drive/v3"
UP = "https://www.googleapis.com/upload/drive/v3"
_tok = None


def token():
    global _tok
    if not _tok:
        data = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                       "refresh_token": os.environ["GDRIVE_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
        _tok = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data))["access_token"]
    return _tok


def req(method, url, body=None, ctype="application/json", raw=False):
    r = urllib.request.Request(url, data=body, method=method, headers={"Authorization": f"Bearer {token()}", "Content-Type": ctype})
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Drive {method} {url.split('?')[0]} -> HTTP {e.code}: {e.read()[:400].decode('utf-8', 'replace')}")
    return data if raw else (json.loads(data) if data else {})


def find(folder, name):
    q = f"'{folder}' in parents and name = '{name}' and trashed = false"
    res = req("GET", f"{API}/files?" + urllib.parse.urlencode({"q": q, "fields": "files(id,name,modifiedTime)"}))
    return res.get("files", [])


def put_bytes(folder, name, data, mime):
    """Create or overwrite a file by name in a folder. Returns file id."""
    existing = find(folder, name)
    if existing:
        fid = existing[0]["id"]
        req("PATCH", f"{UP}/files/{fid}?uploadType=media", data, mime)
        return fid
    boundary = uuid.uuid4().hex
    meta = json.dumps({"name": name, "parents": [folder]})
    body = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{meta}\r\n"
            f"--{boundary}\r\nContent-Type: {mime}\r\n\r\n").encode() + data + f"\r\n--{boundary}--".encode()
    return req("POST", f"{UP}/files?uploadType=multipart&fields=id", body, f"multipart/related; boundary={boundary}")["id"]


def put_large(folder, name, path, mime):
    """Resumable upload for videos (multipart is capped at 5 MB). Overwrites a same-named file."""
    size = os.path.getsize(path)
    existing = find(folder, name)
    if existing:
        url = f"{UP}/files/{existing[0]['id']}?uploadType=resumable&fields=id"
        meta, method = b"{}", "PATCH"
    else:
        url = f"{UP}/files?uploadType=resumable&fields=id"
        meta, method = json.dumps({"name": name, "parents": [folder]}).encode(), "POST"
    r = urllib.request.Request(url, data=meta, method=method, headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json; charset=UTF-8",
                                                                     "X-Upload-Content-Type": mime, "X-Upload-Content-Length": str(size)})
    try:
        session = urllib.request.urlopen(r, timeout=60).headers["Location"]
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Drive resumable start -> HTTP {e.code}: {e.read()[:300]}")
    chunk = 16 * 1024 * 1024
    with open(path, "rb") as f:
        pos = 0
        while pos < size:
            data = f.read(chunk)
            end = pos + len(data) - 1
            r = urllib.request.Request(session, data=data, method="PUT", headers={"Content-Length": str(len(data)), "Content-Range": f"bytes {pos}-{end}/{size}"})
            try:
                with urllib.request.urlopen(r, timeout=300) as resp:
                    return json.loads(resp.read())["id"]
            except urllib.error.HTTPError as e:
                if e.code != 308:
                    raise RuntimeError(f"Drive resumable chunk -> HTTP {e.code}: {e.read()[:300]}")
            pos = end + 1
    raise RuntimeError("Drive upload ended without a file id")


def put_json(folder_key, name, obj):
    return put_bytes(CFG[folder_key], name, json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode(), "text/plain")


def put_file(folder_key, name, path, mime):
    if os.path.getsize(path) > 4 * 1024 * 1024:
        return put_large(CFG[folder_key], name, path, mime)
    with open(path, "rb") as f:
        return put_bytes(CFG[folder_key], name, f.read(), mime)


def list_inbox():
    q = f"'{CFG['inbox']}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'"
    res = req("GET", f"{API}/files?" + urllib.parse.urlencode({"q": q, "orderBy": "createdTime", "fields": "files(id,name,createdTime,mimeType)"}))
    return res.get("files", [])


def read_text(file_id, mime=""):
    if mime.startswith("application/vnd.google-apps"):
        return req("GET", f"{API}/files/{file_id}/export?mimeType=text/plain", raw=True).decode("utf-8-sig")
    return req("GET", f"{API}/files/{file_id}?alt=media", raw=True).decode("utf-8-sig")


def mark_done(file_id):
    done = find(CFG["inbox"], "done")
    if not done:
        done_id = req("POST", f"{API}/files", json.dumps({"name": "done", "mimeType": "application/vnd.google-apps.folder",
                                                          "parents": [CFG["inbox"]]}).encode())["id"]
    else:
        done_id = done[0]["id"]
    req("PATCH", f"{API}/files/{file_id}?addParents={done_id}&removeParents={CFG['inbox']}", b"{}")


def slim_card(c):
    """What the panel needs, small enough to read through the Drive connector."""
    keep = ("wiki_views_24h", "wiki_change_pct", "wiki_avg_30d", "wiki_article", "google_searches", "google_geo",
            "reddit_upvotes", "reddit_comments", "hn_points", "hn_comments", "bet_volume_24h_usd", "hack_usd",
            "yt_results", "yt_top_views", "yt_median_top10_views", "yt_recent_in_top10", "yt_top_title", "yt_top_channel", "yt_top_url")
    return {
        "id": c["id"], "key": c["key"], "t": c["created_at"], "kind": c["kind"], "q": c["question"], "hook": c.get("hook", ""),
        "about": c.get("about", ""), "surprise": c.get("surprise", ""), "series": c.get("series", ""), "aud": c.get("audience", ""),
        "fmt": c.get("format", "both"), "risk": c.get("risk", ""),
        "sc": {k: v for k, v in (c.get("scores") or {}).items()},
        "st": {k: v for k, v in (c.get("stats") or {}).items() if k in keep},
        "origin": c.get("origin"), "src": (c.get("sources") or [])[:3],
        "demand": c.get("demand"), "comp": c.get("competition"), "quality": c.get("quality"), "opp": c.get("opportunity"),
    }


def publish_deck():
    cards = json.load(open(os.path.join(ROOT, "deck", "cards.json")))
    slim = [slim_card(c) for c in cards[:300]]
    fid = put_json("outbox", "deck.json", {"updated": cards[0]["created_at"] if cards else None, "count": len(slim), "cards": slim})
    print(f"[drive] deck.json published: {len(slim)} cards (file {fid})")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "deck"
    if cmd == "deck":
        publish_deck()
    elif cmd == "inbox":
        for f in list_inbox():
            print(f["name"], f["id"], f["mimeType"])
