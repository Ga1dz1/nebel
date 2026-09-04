#!/usr/bin/env python3
# Re-apply the persistent window-switcher patch ("Y = send to internal
# screen") to steamui on disk. The runtime half (switcher_patch.js) only
# lives for the current Steam process; the disk half survives restarts but
# is overwritten by every Steam client update, and the chunk filename is
# build-specific - so locate the chunk by its anchor strings instead of by
# name and patch it again when the marker is gone. The untouched original
# is kept next to the chunk as <name>.nebelbak.
import glob
import os
import sys

ANCHOR_ITEM = "a.vrIcon={appid:s,enum:K.YZ.zt},g.push(a)"
ANCHOR_ITEM_NEW = "a.vrIcon={appid:s,enum:K.YZ.zt},window.__seatY&&window.__seatY(a,n,s),g.push(a)"
ANCHOR_PROPS = "onSecondaryActionDescription:e.strSecondaryActionLabel}"
ANCHOR_PROPS_NEW = "onSecondaryActionDescription:e.strSecondaryActionLabel,onOptionsButton:e.fnOptionsAction,onOptionsActionDescription:e.strOptionsActionLabel}"
MARKER = "__seatY"

steamui_dir = os.path.expanduser("~/.local/share/Steam/steamui")
patched = 0
for path in glob.glob(os.path.join(steamui_dir, "chunk~*.js")):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            src = f.read()
    except OSError:
        continue
    if ANCHOR_ITEM not in src or ANCHOR_PROPS not in src:
        continue
    if MARKER in src:
        continue  # already patched
    out = src.replace(ANCHOR_ITEM, ANCHOR_ITEM_NEW).replace(ANCHOR_PROPS, ANCHOR_PROPS_NEW)
    if out == src:
        continue
    backup = path + ".nebelbak"
    try:
        if not os.path.exists(backup):
            with open(backup, "w", encoding="utf-8") as f:
                f.write(src)
        with open(path, "w", encoding="utf-8") as f:
            f.write(out)
        patched += 1
        print(f"steamui_switcher_patch: patched {os.path.basename(path)}")
    except OSError as exc:
        print(f"steamui_switcher_patch: {path}: {exc}", file=sys.stderr)
sys.exit(0)
