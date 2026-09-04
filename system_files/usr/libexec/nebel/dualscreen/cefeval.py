import socket, base64, os, struct, json, sys, urllib.request

def ws_eval(wsurl, expr):
    # parse ws url
    assert wsurl.startswith("ws://")
    rest = wsurl[5:]
    hostport, path = rest.split("/", 1)
    host, port = hostport.split(":")
    s = socket.create_connection((host, int(port)), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    req = ("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
           "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n") % (path, hostport, key)
    s.sendall(req.encode())
    resp = b""
    while b"\r\n\r\n" not in resp:
        resp += s.recv(4096)
    def send_frame(payload):
        data = payload.encode()
        header = bytearray([0x81])
        n = len(data)
        if n < 126: header.append(0x80 | n)
        elif n < 65536: header.append(0x80 | 126); header += struct.pack(">H", n)
        else: header.append(0x80 | 127); header += struct.pack(">Q", n)
        mask = os.urandom(4)
        header += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        s.sendall(bytes(header) + masked)
    def recv_frame():
        def read(n):
            d = b""
            while len(d) < n:
                chunk = s.recv(n - len(d))
                if not chunk: raise IOError("closed")
                d += chunk
            return d
        while True:
            b1, b2 = read(2)
            ln = b2 & 0x7F
            if ln == 126: ln = struct.unpack(">H", read(2))[0]
            elif ln == 127: ln = struct.unpack(">Q", read(8))[0]
            payload = read(ln)
            if (b1 & 0x0F) == 1:
                return payload.decode()
    send_frame(json.dumps({"id": 1, "method": "Runtime.evaluate",
        "params": {"expression": expr, "returnByValue": True, "awaitPromise": True}}))
    while True:
        msg = json.loads(recv_frame())
        if msg.get("id") == 1:
            return msg

target = sys.argv[1]  # substring of title or url
expr = sys.argv[2]
tabs = json.load(urllib.request.urlopen("http://127.0.0.1:8080/json/list", timeout=5))
tab = [t for t in tabs if target in t.get("title","") or target in t.get("url","")]
if not tab:
    print("NO TARGET; have:", [t.get("title") for t in tabs]); sys.exit(1)
res = ws_eval(tab[0]["webSocketDebuggerUrl"], expr)
r = res.get("result", {})
val = r.get("result", {})
print(json.dumps(val.get("value", val.get("description", r)), ensure_ascii=False)[:4000])
