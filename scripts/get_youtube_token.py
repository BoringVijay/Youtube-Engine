#!/usr/bin/env python3
"""One-time logins. Run on your Mac:
  YouTube (channel account):  python3 get_youtube_token.py client_secret.json
  Google Drive (personal):    python3 get_youtube_token.py client_secret.json --drive

Opens your browser, you pick the channel's Google account and click Allow
(you'll see an "unverified app" warning: Advanced > Go to app). It prints a
refresh token. Paste it into GitHub as the secret YT_REFRESH_TOKEN.
No installs needed: standard library only.
"""
import json, sys, urllib.parse, urllib.request, webbrowser, http.server, secrets

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",      # read + reply to comments
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]
DRIVE = "--drive" in sys.argv
if DRIVE:
    SCOPES = ["https://www.googleapis.com/auth/drive"]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
PORT = 8765
REDIRECT = f"http://localhost:{PORT}"

cfg = json.load(open(args[0] if args else "client_secret.json"))["installed"]
state = secrets.token_urlsafe(16)
auth_url = cfg["auth_uri"] + "?" + urllib.parse.urlencode({
    "client_id": cfg["client_id"], "redirect_uri": REDIRECT, "response_type": "code",
    "scope": " ".join(SCOPES), "access_type": "offline", "prompt": "consent", "state": state,
})

code_box = {}
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if q.get("state", [""])[0] == state and "code" in q:
            code_box["code"] = q["code"][0]
            msg = "Done. You can close this tab and go back to the terminal."
        else:
            msg = "Something went wrong. Check the terminal."
        self.send_response(200); self.end_headers(); self.wfile.write(msg.encode())
    def log_message(self, *a): pass

print("Opening your browser to sign in...\nIf it doesn't open, paste this URL:\n\n" + auth_url + "\n")
webbrowser.open(auth_url)
srv = http.server.HTTPServer(("localhost", PORT), Handler)
while "code" not in code_box:
    srv.handle_request()

data = urllib.parse.urlencode({
    "code": code_box["code"], "client_id": cfg["client_id"], "client_secret": cfg["client_secret"],
    "redirect_uri": REDIRECT, "grant_type": "authorization_code",
}).encode()
tok = json.load(urllib.request.urlopen(cfg["token_uri"], data))
if "refresh_token" not in tok:
    sys.exit("No refresh token returned. Remove the app's access at myaccount.google.com/permissions and run again.")
name = "GDRIVE_REFRESH_TOKEN" if DRIVE else "YT_REFRESH_TOKEN"
print(f"\n{name} (copy everything on the next line into GitHub Secrets):\n")
print(tok["refresh_token"])
