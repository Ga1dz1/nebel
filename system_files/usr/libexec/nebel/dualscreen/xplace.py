import sys, time
from ctypes import *
vp, ul, c_int, c_uint = c_void_p, c_ulong, c_int, c_uint
X = CDLL("libX11.so.6")
X.XOpenDisplay.argtypes=[c_char_p]; X.XOpenDisplay.restype=vp
X.XInternAtom.argtypes=[vp,c_char_p,c_int]; X.XInternAtom.restype=ul
X.XDeleteProperty.argtypes=[vp,ul,ul]
X.XMoveResizeWindow.argtypes=[vp,ul,c_int,c_int,c_uint,c_uint]
X.XSync.argtypes=[vp,c_int]
X.XGetGeometry.argtypes=[vp,ul,POINTER(ul),POINTER(c_int),POINTER(c_int),POINTER(c_uint),POINTER(c_uint),POINTER(c_uint),POINTER(c_uint)]
def geom(d,wid):
    r=ul();x=c_int();y=c_int();w=c_uint();h=c_uint();bw=c_uint();dep=c_uint()
    X.XGetGeometry(d,wid,byref(r),byref(x),byref(y),byref(w),byref(h),byref(bw),byref(dep))
    return (x.value,y.value,w.value,h.value)
d=X.XOpenDisplay(b":0")
wid=int(sys.argv[1],16)
x,y,w,h = int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5])
X.XDeleteProperty(d,wid,X.XInternAtom(d,b"STEAM_GAME",0))
X.XSync(d,0)
X.XMoveResizeWindow(d,wid,x,y,w,h)
X.XSync(d,0)
time.sleep(1.5)
X.XSync(d,0)
print("final:",geom(d,wid))
