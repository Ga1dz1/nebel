#!/usr/bin/env python3
# nebel seat control bridge: tiny HTTP daemon on 127.0.0.1:48717 so CEF JS can
# set the gamescope root atom NEBEL_CTRL_WINDOW_SEAT and query dual-output state.
#   GET  /state            -> {"dual": true|false}
#   POST /seat {"win":"0x...|pid:N|name:str","seat":"a|b|auto"} -> {"ok":true}
import json, os, subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

DUALSCREEN_DIR = "/usr/libexec/nebel/dualscreen"
ENV = dict(os.environ, DISPLAY=":0")

def output_count():
    try:
        out = subprocess.run(["python3", os.path.join(DUALSCREEN_DIR, "xrrq_count.py")],
                             env=ENV, capture_output=True, text=True, timeout=5)
        return int(out.stdout.strip())
    except Exception:
        return 1

def set_seat(win, seat):
    if seat not in ("a", "b", "auto"):
        raise ValueError("bad seat")
    if not (win.startswith("0x") or win.startswith("pid:") or win.startswith("name:")):
        raise ValueError("bad win")
    subprocess.run(["/usr/bin/xprop", "-root", "-format", "NEBEL_CTRL_WINDOW_SEAT", "8s",
                    "-set", "NEBEL_CTRL_WINDOW_SEAT", win + " " + seat],
                   env=ENV, timeout=5, check=True)

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/state":
            self._json(200, {"dual": output_count() >= 2})
        else:
            self._json(404, {"err": "not found"})

    def do_POST(self):
        if self.path != "/seat":
            return self._json(404, {"err": "not found"})
        try:
            ln = int(self.headers.get("Content-Length") or 0)
            data = json.loads(self.rfile.read(ln) or b"{}")
            set_seat(str(data.get("win", "")), str(data.get("seat", "")))
            self._json(200, {"ok": True})
        except Exception as ex:
            self._json(400, {"ok": False, "err": str(ex)})

    def log_message(self, *a):
        pass

HTTPServer(("127.0.0.1", 48717), H).serve_forever()
