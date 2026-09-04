#!/bin/bash
# Wait for Steam CEF debug AND the SharedJSContext target, then place the
# second steamui window on the internal panel (seat A) when dual-output is active.
DUALSCREEN_DIR="/usr/libexec/nebel/dualscreen"
for i in $(seq 1 90); do
    if curl -sf http://127.0.0.1:8080/json 2>/dev/null | grep -q SharedJSContext; then
        break
    fi
    sleep 2
done
curl -sf http://127.0.0.1:8080/json 2>/dev/null | grep -q SharedJSContext || exit 0
# re-apply the persistent window-switcher patch if a Steam update replaced
# the chunk (no-op when the marker is already there)
python3 "$DUALSCREEN_DIR/steamui_switcher_patch.py" >/dev/null 2>&1 || true
# install the window-switcher Y patch early (before module 15821 first executes)
python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "void($(cat "$DUALSCREEN_DIR/switcher_patch.js")); \"started\"" >/dev/null 2>&1 || true
outs=$(DISPLAY=:0 python3 "$DUALSCREEN_DIR/xrrq_count.py" 2>/dev/null || echo 1)
[ "$outs" = "2" ] || exit 0

# Wait for the main BPM window to be mapped first, else the window-diff in
# seatA.sh can mistake the appearing main window for the newly created popup.
for i in $(seq 1 60); do
    if DISPLAY=:0 python3 "$DUALSCREEN_DIR/xmove.py" 2>/dev/null | grep -q '1920x1080'; then
        break
    fi
    sleep 2
done

"$DUALSCREEN_DIR/seatA.sh"
# refresh the dual-output gate now that seat placement is known
python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "fetch(\"http://127.0.0.1:48717/state\").then(r=>r.json()).then(j=>{window.__seatDual=!!j.dual}).catch(()=>{}); \"gate-refreshed\"" >/dev/null 2>&1 || true

# Watchdog: the second window does not survive steamwebhelper window
# re-creation (GPU process restarts, hotplug flaps of the external panel) -
# Steam only recreates its own windows. While two outputs are present,
# recreate the card if it disappeared. The JS patches die with the CEF
# context, so re-install them before recreating.
while true; do
    sleep 5
    outs=$(DISPLAY=:0 python3 "$DUALSCREEN_DIR/xrrq_count.py" 2>/dev/null || echo 1)
    [ "$outs" = "2" ] || continue
    if DISPLAY=:0 python3 "$DUALSCREEN_DIR/xmove.py" 2>/dev/null | grep -q '1240x1080+340+1080'; then
        continue
    fi
    curl -sf http://127.0.0.1:8080/json 2>/dev/null | grep -q SharedJSContext || continue
    python3 "$DUALSCREEN_DIR/steamui_switcher_patch.py" >/dev/null 2>&1 || true
    python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "void($(cat "$DUALSCREEN_DIR/switcher_patch.js")); \"started\"" >/dev/null 2>&1 || true
    "$DUALSCREEN_DIR/seatA.sh" || true
done
