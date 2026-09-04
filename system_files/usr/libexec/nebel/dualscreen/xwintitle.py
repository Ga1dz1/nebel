import sys
from ctypes import *
X = CDLL("libX11.so.6")
vp = c_void_p; ul = c_ulong
X.XOpenDisplay.argtypes = [c_char_p]; X.XOpenDisplay.restype = vp
X.XInternAtom.argtypes = [vp, c_char_p, c_int]; X.XInternAtom.restype = ul
X.XGetWindowProperty.argtypes = [vp, ul, ul, c_long, c_long, c_int, ul,
    POINTER(ul), POINTER(c_int), POINTER(c_ulong), POINTER(c_ulong), POINTER(POINTER(c_ubyte))]
X.XGetWindowProperty.restype = c_int

def get_prop(d, wid, name):
    atom = X.XInternAtom(d, name.encode(), 0)
    ret = ul(); fmt = c_int(); n = c_ulong(); rem = c_ulong(); buf = POINTER(c_ubyte)()
    if X.XGetWindowProperty(d, wid, atom, 0, 256, 0, 0,
            byref(ret), byref(fmt), byref(n), byref(rem), byref(buf)) != 0 or not buf:
        return ""
    return string_at(buf, n.value).decode("utf-8", "replace")

d = X.XOpenDisplay(b":0")
wid = int(sys.argv[1], 16)
t = get_prop(d, wid, "_NET_WM_NAME") or get_prop(d, wid, "WM_NAME")
print(t)
