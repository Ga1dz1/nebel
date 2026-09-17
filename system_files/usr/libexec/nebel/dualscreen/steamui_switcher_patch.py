#!/usr/bin/env python3
# Re-apply the persistent window-switcher patch ("Y = send to internal
# screen") to steamui on disk. The runtime half (switcher_patch.js) only
# lives for the current Steam process; the disk half survives restarts but
# is overwritten by every Steam client update, and the chunk filename is
# build-specific - so locate the chunk by its anchor strings instead of by
# name and patch it again when the marker is gone.
#
# Anchors are REGEX-based: minified variable names change with every client
# build (a.vrIcon=.../g.push(a) became vt.vrIcon=.../oe.push(vt) in the
# 2026-09-16 build), but the structure around them is stable:
#   ITEM.vrIcon={appid:APP,enum:X.YZ.zt},LIST.push(ITEM)     (item hook)
#   onSecondaryButton:V.fnSecondaryAction,
#   onSecondaryActionDescription:V.strSecondaryActionLabel} (menu props)
# The window-info object feeding the hook is the variable in
# {strKey:WINFO.windowid?.toString(),...} closest before the item anchor.
import glob
import os
import re
import sys

MARKER = "__seatY"

# Minified identifiers may include '$' (e.g. enum:$.YZ.zt), which \w misses.
_IDENT = r"[A-Za-z0-9_$]+"

RE_TAIL = re.compile(
    rf"({_IDENT})\.vrIcon=\{{appid:({_IDENT}),enum:({_IDENT})\.YZ\.zt\}},"
    rf"({_IDENT})\.push\(({_IDENT})\)"
)
RE_STRKEY = re.compile(r"\{strKey:([A-Za-z0-9_$]+)\.windowid\?\.toString\(\)")
RE_PROPS = re.compile(
    r"onSecondaryButton:([A-Za-z0-9_$]+)\.fnSecondaryAction,"
    r"onSecondaryActionDescription:\1\.strSecondaryActionLabel\}"
)


def patch_source(src):
    """Patch one chunk source. Returns (new_source, n_changes)."""
    if MARKER in src:
        return src, 0
    changes = 0

    def tail_repl(mo):
        nonlocal changes
        item, appid, enumv, lst, item2 = mo.groups()
        if item != item2:
            return mo.group(0)
        winfo = None
        for sm in RE_STRKEY.finditer(src, max(0, mo.start() - 8000), mo.start()):
            winfo = sm.group(1)
        if not winfo:
            return mo.group(0)
        changes += 1
        return (
            f"{item}.vrIcon={{appid:{appid},enum:{enumv}.YZ.zt}},"
            f"window.{MARKER}&&window.{MARKER}({item},{winfo},{appid}),"
            f"{lst}.push({item})"
        )

    out = RE_TAIL.sub(tail_repl, src, count=1)

    def props_repl(mo):
        nonlocal changes
        changes += 1
        v = mo.group(1)
        return (
            f"onSecondaryButton:{v}.fnSecondaryAction,"
            f"onSecondaryActionDescription:{v}.strSecondaryActionLabel,"
            f"onOptionsButton:{v}.fnOptionsAction,"
            f"onOptionsActionDescription:{v}.strOptionsActionLabel}}"
        )

    out = RE_PROPS.sub(props_repl, out, count=1)
    return out, changes


steamui_dir = os.path.expanduser("~/.local/share/Steam/steamui")
patched = 0
for path in glob.glob(os.path.join(steamui_dir, "chunk~*.js")):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            src = f.read()
    except OSError:
        continue
    if MARKER in src or (not RE_TAIL.search(src) and not RE_PROPS.search(src)):
        continue
    out, changes = patch_source(src)
    if out == src or changes == 0:
        continue
    backup = path + ".nebelbak"
    try:
        # Always refresh the backup when (re)patching an unpatched chunk:
        # a same-named chunk may carry a different build after an update.
        with open(backup, "w", encoding="utf-8") as f:
            f.write(src)
        with open(path, "w", encoding="utf-8") as f:
            f.write(out)
        patched += 1
        print(f"steamui_switcher_patch: patched {os.path.basename(path)} ({changes} anchors)")
    except OSError as exc:
        print(f"steamui_switcher_patch: {path}: {exc}", file=sys.stderr)
sys.exit(0)
