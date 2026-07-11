# Reddit comment poster via the OFFICIAL Reddit API (OAuth2 authorization-code flow).
# No password stored, no bot-detection games — this is the sanctioned automation route.
#
# One-time setup:
#   1. Log into reddit as u/YogurtclosetOk80, open https://www.reddit.com/prefs/apps
#   2. "create another app" -> name: dlh-helper, type: script,
#      redirect uri: http://localhost:8765/callback
#   3. Put client_id (the string under the app name) and secret into
#      pipeline-data/reddit-app-config.json (template created next to this script's first run)
#   4. Run: python scripts/reddit_poster.py auth
#      A browser opens; click "Allow". Token saved to pipeline-data/.reddit-token.json
#
# Usage:
#   python scripts/reddit_poster.py whoami
#   python scripts/reddit_poster.py comment "<reddit post/comment URL>" path/to/comment.txt
#
# The target URL can be a post URL (comments on the post) or a specific comment's
# permalink (replies to that comment).

import json
import re
import secrets
import sys
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlencode, urlparse, parse_qs

import requests

REPO = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO / "pipeline-data" / "reddit-app-config.json"
TOKEN_PATH = REPO / "pipeline-data" / ".reddit-token.json"
REDIRECT_PORT = 8765
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}/callback"
USER_AGENT = "windows:dlh-comment-helper:v1.0 (by /u/YogurtclosetOk80)"
SCOPES = "identity submit read"


def load_config():
    if not CONFIG_PATH.exists():
        CONFIG_PATH.write_text(json.dumps(
            {"client_id": "PASTE_CLIENT_ID_HERE", "client_secret": "PASTE_SECRET_HERE"},
            indent=2))
        sys.exit(f"Created template {CONFIG_PATH} — fill in client_id and client_secret, then rerun.")
    cfg = json.loads(CONFIG_PATH.read_text())
    if "PASTE" in cfg.get("client_id", "") or "PASTE" in cfg.get("client_secret", ""):
        sys.exit(f"{CONFIG_PATH} still has placeholder values — fill in the real app credentials.")
    return cfg


class _CallbackHandler(BaseHTTPRequestHandler):
    code = None
    expected_state = None

    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        if qs.get("state", [""])[0] != _CallbackHandler.expected_state:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"State mismatch, try again.")
            return
        _CallbackHandler.code = qs.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h2>Authorized. You can close this tab and go back to Claude.</h2>")

    def log_message(self, *args):
        pass


def auth():
    cfg = load_config()
    state = secrets.token_urlsafe(16)
    _CallbackHandler.expected_state = state
    params = {
        "client_id": cfg["client_id"],
        "response_type": "code",
        "state": state,
        "redirect_uri": REDIRECT_URI,
        "duration": "permanent",
        "scope": SCOPES,
    }
    url = "https://www.reddit.com/api/v1/authorize?" + urlencode(params)
    print("Opening browser for Reddit authorization...")
    print("If it doesn't open, paste this URL manually:\n" + url)
    webbrowser.open(url)
    server = HTTPServer(("localhost", REDIRECT_PORT), _CallbackHandler)
    while _CallbackHandler.code is None:
        server.handle_request()
    resp = requests.post(
        "https://www.reddit.com/api/v1/access_token",
        auth=(cfg["client_id"], cfg["client_secret"]),
        data={"grant_type": "authorization_code",
              "code": _CallbackHandler.code,
              "redirect_uri": REDIRECT_URI},
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    tok = resp.json()
    if "refresh_token" not in tok:
        sys.exit(f"No refresh token in response: {tok}")
    tok["obtained_at"] = int(time.time())
    TOKEN_PATH.write_text(json.dumps(tok, indent=2))
    print(f"Token saved to {TOKEN_PATH}. Run 'whoami' to verify.")


def access_token():
    cfg = load_config()
    if not TOKEN_PATH.exists():
        sys.exit("No token yet — run: python scripts/reddit_poster.py auth")
    tok = json.loads(TOKEN_PATH.read_text())
    # refresh if older than 45 min (tokens last 1h)
    if time.time() - tok.get("obtained_at", 0) > 45 * 60:
        resp = requests.post(
            "https://www.reddit.com/api/v1/access_token",
            auth=(cfg["client_id"], cfg["client_secret"]),
            data={"grant_type": "refresh_token",
                  "refresh_token": tok["refresh_token"]},
            headers={"User-Agent": USER_AGENT},
            timeout=30,
        )
        resp.raise_for_status()
        new = resp.json()
        new.setdefault("refresh_token", tok["refresh_token"])
        new["obtained_at"] = int(time.time())
        TOKEN_PATH.write_text(json.dumps(new, indent=2))
        tok = new
    return tok["access_token"]


def api_headers():
    return {"Authorization": f"bearer {access_token()}", "User-Agent": USER_AGENT}


def whoami():
    r = requests.get("https://oauth.reddit.com/api/v1/me", headers=api_headers(), timeout=30)
    r.raise_for_status()
    me = r.json()
    print(f"Logged in as u/{me['name']} — link karma {me.get('link_karma')}, "
          f"comment karma {me.get('comment_karma')}")


def url_to_fullname(url):
    # comment permalink: .../comments/<post_id>/<slug>/<comment_id>/
    m = re.search(r"/comments/([a-z0-9]+)(?:/[^/]+/([a-z0-9]+))?", url)
    if not m:
        sys.exit(f"Can't parse reddit URL: {url}")
    post_id, comment_id = m.group(1), m.group(2)
    return f"t1_{comment_id}" if comment_id else f"t3_{post_id}"


def comment(url, text_file):
    text = Path(text_file).read_text(encoding="utf-8").strip()
    if not text:
        sys.exit("Comment file is empty.")
    thing = url_to_fullname(url)
    r = requests.post(
        "https://oauth.reddit.com/api/comment",
        headers=api_headers(),
        data={"api_type": "json", "thing_id": thing, "text": text},
        timeout=30,
    )
    r.raise_for_status()
    out = r.json()
    errors = out.get("json", {}).get("errors", [])
    if errors:
        sys.exit(f"Reddit rejected the comment: {errors}")
    things = out.get("json", {}).get("data", {}).get("things", [])
    permalink = things[0]["data"].get("permalink", "?") if things else "?"
    print(f"Posted: https://www.reddit.com{permalink}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "auth":
        auth()
    elif cmd == "whoami":
        whoami()
    elif cmd == "comment" and len(sys.argv) == 4:
        comment(sys.argv[2], sys.argv[3])
    else:
        sys.exit("Usage: reddit_poster.py auth | whoami | comment <url> <text_file>")
