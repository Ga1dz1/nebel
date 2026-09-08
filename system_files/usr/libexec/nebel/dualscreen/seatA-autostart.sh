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

# Seat content setting (Decky Display tab -> /etc/nebel/seat-a.conf; same file
# seatctl serves as /config to the render JS).
seat_content() {
    sed -n 's/^CONTENT=//p' /etc/nebel/seat-a.conf 2>/dev/null | head -1
}
seat_full_steam() {
    [ "$(sed -n 's/^FULL_STEAM=//p' /etc/nebel/seat-a.conf 2>/dev/null | head -1)" = "1" ]
}

# "Second screen off": don't create the window at all (a live flip is handled
# by the watchdog below).
if [ "$(seat_content)" != "off" ]; then
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
fi

# Watchdog: the second window does not survive steamwebhelper window
# re-creation (GPU process restarts, hotplug flaps of the external panel) -
# Steam only recreates its own windows. While two outputs are present,
# recreate the card if it disappeared. The JS patches die with the CEF
# context, so re-install them before recreating.
# The card is matched by its NebelSeatB title, NOT by geometry: the seat-A
# rect differs per device (Mini 1240x1080+340+1080, RP6 1920x1080+0+1080)
# and gamescope re-clamps the placement anyway, so a hardcoded rect makes
# the loop recreate the window forever on any other panel. The title must
# be read via xwintitle.py (_NET_WM_NAME): xmove.py's XFetchName only
# reads legacy WM_NAME, which CEF never sets - the window looks unnamed
# there and a name grep on xmove output never matches (same infinite
# recreate loop, visible as the internal panel re-connecting).
while true; do
    sleep 5
    outs=$(DISPLAY=:0 python3 "$DUALSCREEN_DIR/xrrq_count.py" 2>/dev/null || echo 1)
    [ "$outs" = "2" ] || continue
    # "Second screen off" flipped on live: close the card and stop recreating
    # it until the setting changes back.
    if [ "$(seat_content)" = "off" ]; then
        python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "try{const w=window.__seatB;if(w&&!w.closed)w.close()}catch(e){};\"off\"" >/dev/null 2>&1 || true
        continue
    fi
    # Full Steam on the second screen: after navigation the window carries the
    # SPA's own title, not NebelSeatB - the title scan below would "recreate"
    # it every loop. Ask the SharedJSContext about the window handle instead.
    if seat_full_steam; then
        alive=$(python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "try{(window.__seatB&&!window.__seatB.closed)?1:0}catch(e){0}" 2>/dev/null) || alive=""
        case "$alive" in
            *1*) continue ;;
        esac
        curl -sf http://127.0.0.1:8080/json 2>/dev/null | grep -q SharedJSContext || continue
        python3 "$DUALSCREEN_DIR/steamui_switcher_patch.py" >/dev/null 2>&1 || true
        python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "void($(cat "$DUALSCREEN_DIR/switcher_patch.js")); \"started\"" >/dev/null 2>&1 || true
        "$DUALSCREEN_DIR/seatA.sh" || true
        continue
    fi
    # The just-created card needs a moment before CEF sets its
    # _NET_WM_NAME; checking once right after seatA.sh returns would see an
    # untitled window, "recreate" it, and the new window kills the old one -
    # an endless recreate loop (the internal panel visibly re-connecting).
    # Retry the title scan for ~12s before deciding the card is gone.
    seat_found=0
    for attempt in $(seq 1 6); do
        for wid in $(DISPLAY=:0 python3 "$DUALSCREEN_DIR/xmove.py" 2>/dev/null | awk '{print $1}'); do
            if [ "$(DISPLAY=:0 python3 "$DUALSCREEN_DIR/xwintitle.py" "$wid" 2>/dev/null)" = "NebelSeatB" ]; then
                seat_found=1
                break
            fi
        done
        [ "$seat_found" = "1" ] && break
        sleep 2
    done
    [ "$seat_found" = "1" ] && continue
    curl -sf http://127.0.0.1:8080/json 2>/dev/null | grep -q SharedJSContext || continue
    python3 "$DUALSCREEN_DIR/steamui_switcher_patch.py" >/dev/null 2>&1 || true
    python3 "$DUALSCREEN_DIR/cefeval.py" SharedJSContext "void($(cat "$DUALSCREEN_DIR/switcher_patch.js")); \"started\"" >/dev/null 2>&1 || true
    "$DUALSCREEN_DIR/seatA.sh" || true
done
