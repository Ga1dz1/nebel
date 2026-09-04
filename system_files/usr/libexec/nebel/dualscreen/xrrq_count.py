import ctypes
X11=ctypes.CDLL("libX11.so.6"); XR=ctypes.CDLL("libXrandr.so.2")
vp=ctypes.c_void_p; ul=ctypes.c_ulong
X11.XOpenDisplay.argtypes=[ctypes.c_char_p]; X11.XOpenDisplay.restype=vp
X11.XDefaultRootWindow.argtypes=[vp]; X11.XDefaultRootWindow.restype=ul
d=X11.XOpenDisplay(b":0"); root=X11.XDefaultRootWindow(d)
class Res(ctypes.Structure):
    _fields_=[("ts",ul),("cts",ul),("ncrtc",ctypes.c_int),("crtcs",ctypes.POINTER(ul)),
      ("noutput",ctypes.c_int),("outputs",ctypes.POINTER(ul)),
      ("nmode",ctypes.c_int),("modes",vp)]
XR.XRRGetScreenResourcesCurrent.argtypes=[vp,ul]; XR.XRRGetScreenResourcesCurrent.restype=ctypes.POINTER(Res)
print(XR.XRRGetScreenResourcesCurrent(d,root).contents.noutput)
