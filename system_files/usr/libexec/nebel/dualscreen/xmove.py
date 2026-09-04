import ctypes, sys
X11=ctypes.CDLL("libX11.so.6")
vp=ctypes.c_void_p; ul=ctypes.c_ulong
X11.XOpenDisplay.argtypes=[ctypes.c_char_p]; X11.XOpenDisplay.restype=vp
X11.XDefaultRootWindow.argtypes=[vp]; X11.XDefaultRootWindow.restype=ul
X11.XQueryTree.argtypes=[vp,ul,ctypes.POINTER(ul),ctypes.POINTER(ul),ctypes.POINTER(ctypes.POINTER(ul)),ctypes.POINTER(ctypes.c_uint)]
X11.XGetGeometry.argtypes=[vp,ul,ctypes.POINTER(ul),ctypes.POINTER(ctypes.c_int),ctypes.POINTER(ctypes.c_int),ctypes.POINTER(ctypes.c_uint),ctypes.POINTER(ctypes.c_uint),ctypes.POINTER(ctypes.c_uint),ctypes.POINTER(ctypes.c_uint)]
X11.XFetchName.argtypes=[vp,ul,ctypes.POINTER(ctypes.c_char_p)]
X11.XMoveWindow.argtypes=[vp,ul,ctypes.c_int,ctypes.c_int]
X11.XFlush.argtypes=[vp]
d=X11.XOpenDisplay(b":0")
root=X11.XDefaultRootWindow(d)
rw=ul(); pw=ul(); ch=ctypes.POINTER(ul)(); n=ctypes.c_uint()
X11.XQueryTree(d,root,ctypes.byref(rw),ctypes.byref(pw),ctypes.byref(ch),ctypes.byref(n))
r=ul(); x=ctypes.c_int(); y=ctypes.c_int(); w=ctypes.c_uint(); h=ctypes.c_uint(); bw=ctypes.c_uint(); dep=ctypes.c_uint()
wins=[]
for i in range(n.value):
    wid=ch[i]
    X11.XGetGeometry(d,wid,ctypes.byref(r),ctypes.byref(x),ctypes.byref(y),ctypes.byref(w),ctypes.byref(h),ctypes.byref(bw),ctypes.byref(dep))
    nm=ctypes.c_char_p()
    X11.XFetchName(d,wid,ctypes.byref(nm))
    name=nm.value.decode() if nm.value else ""
    if w.value>100 and h.value>100:
        wins.append((wid,x.value,y.value,w.value,h.value,name))
        print(f"0x{wid:x} {w.value}x{h.value}+{x.value}+{y.value} '{name}'")
if len(sys.argv)>1:
    tgt=int(sys.argv[1],16); nx=int(sys.argv[2]); ny=int(sys.argv[3])
    X11.XMoveWindow(d,tgt,nx,ny); X11.XFlush(d)
    print(f"moved 0x{tgt:x} to {nx},{ny}")
