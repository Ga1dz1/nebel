#!/bin/bash
# seatA.sh — contextual second native Steam UI window on the internal
# screen (seat A: 1240x1080 at +340+1080). Shows AppDetails of the app focused/open/running on the main screen (polls tempNavStore route + game list selection + running apps every 1s); falls back to a Loading placeholder until collectionStore is ready.
# Runs inside the game-mode session while dual-output (duo mode) is active.
set -e
DUALSCREEN_DIR="/usr/libexec/nebel/dualscreen"
CEFEVAL="python3 $DUALSCREEN_DIR/cefeval.py"

# snapshot existing top-level X windows
BEFORE=$(python3 "$DUALSCREEN_DIR/xmove.py" | awk '{print $1}' | sort)

# 1. create the popup window from SharedJSContext (CEF)
echo "== create window =="
$CEFEVAL SharedJSContext "$(cat "$DUALSCREEN_DIR/seatA_create.js")"

# 2. wait for the new X window to appear (diff against snapshot)
WID=""
for i in $(seq 1 20); do
  sleep 0.5
  AFTER=$(python3 "$DUALSCREEN_DIR/xmove.py" | awk '{print $1}' | sort)
  WID=$(comm -13 <(echo "$BEFORE") <(echo "$AFTER") | head -1)
  [ -n "$WID" ] && break
done
if [ -z "$WID" ]; then
  echo "ERROR: new X window not found" >&2
  exit 1
fi
echo "== window id: $WID =="

# The window diff can grab a recreated BPM window instead of the card when
# steamwebhelper restarts (monitor hotplug) - placing THAT on seat A swaps
# the panels. The card always titles itself NebelSeatB; refuse to place
# anything else.
TITLE=""
for i in $(seq 1 10); do
  TITLE=$(python3 "$DUALSCREEN_DIR/xwintitle.py" "$WID" 2>/dev/null)
  [ "$TITLE" = "NebelSeatB" ] && break
  sleep 0.5
done
if [ "$TITLE" != "NebelSeatB" ]; then
  echo "ERROR: window $WID title is '$TITLE', not NebelSeatB - refusing to place" >&2
  exit 1
fi

# 3. drop STEAM_GAME property and move to seat A (else gamescope reverts position)
python3 "$DUALSCREEN_DIR/xplace.py" "$WID" 340 1080 1240 1080

# 4. render the contextual SteamUI view into the window via React from SharedJSContext
sleep 1
echo "== render contextual view =="
$CEFEVAL SharedJSContext "void($(cat "$DUALSCREEN_DIR/seatA_render.js")); \"started\""
