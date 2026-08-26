"""Backend for the in-plugin file picker.

Steam's own "Browse" button (Add Non-Steam Game) is broken in the ARM64 Linux
client: SteamClient.System.OpenFileDialog rejects with result=2 without ever
reaching the desktop portal. Native dialogs (kdialog, xdg-desktop-portal) are
useless in the gamescope session — gamescope never presents their windows —
so the picker UI lives inside the plugin and only lists directories here; the
frontend registers the pick via SteamClient.Apps.AddShortcut.

Heroic games must not be added as raw exe picks: they need their Heroic
prefix, wine build and env, which only a `heroic --no-gui heroic://launch...`
shortcut sets up (the same shortcut Heroic's own "Add to Steam" writes).
heroic_games() feeds a one-click list in the picker, and heroic_match()
intercepts manual picks inside a Heroic install dir.
"""
import glob
import json
import os
import shutil

SESSION_HOME = "/var/home/nebel"

# Filesystem bookkeeping junk that should never be picked as a game.
HIDDEN_ENTRIES = {"lost+found", "System Volume Information", "$RECYCLE.BIN", "RECYCLER"}

# Heroic per-store installed-games registries: (installed.json path, runner).
HEROIC_STORES = [
    (os.path.join(SESSION_HOME, ".config/heroic/legendaryConfig/legendary/installed.json"), "legendary"),
    (os.path.join(SESSION_HOME, ".config/heroic/gog_store/installed.json"), "gog"),
]

HEROIC_BIN = shutil.which("heroic") or "heroic"


def heroic_games():
    """Installed Heroic games: [{appName, title, runner, installPath}]."""
    games = []
    for registry, runner in HEROIC_STORES:
        try:
            data = json.load(open(registry, encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for entry in data.values():
            if not isinstance(entry, dict) or entry.get("is_dlc"):
                continue
            app_name, install_path = entry.get("app_name"), entry.get("install_path")
            if not app_name or not install_path:
                continue
            games.append({
                "appName": app_name,
                "title": entry.get("title") or app_name,
                "runner": runner,
                "installPath": install_path,
            })
    games.sort(key=lambda game: game["title"].lower())
    return games


def heroic_launch(game):
    """Steam shortcut fields for launching the game through Heroic itself."""
    return {
        "name": game["title"],
        "exe": HEROIC_BIN,
        "args": f'--no-gui --no-sandbox "heroic://launch?appName={game["appName"]}&runner={game["runner"]}"',
    }


def heroic_match(path):
    """The Heroic game owning `path` (an exe inside its install dir), or None."""
    if not path:
        return None
    real = os.path.realpath(path)
    for game in heroic_games():
        root = os.path.realpath(game["installPath"])
        if real == root or real.startswith(root + os.sep):
            return game
    return None


def list_dir(path):
    """Return {"path", "parent", "dirs", "files", "shortcuts"} for the picker UI."""
    path = os.path.realpath(path) if path else SESSION_HOME
    if not os.path.isdir(path):
        path = os.path.dirname(path) or SESSION_HOME
    if not os.path.isdir(path):
        path = SESSION_HOME
    try:
        entries = os.listdir(path)
    except OSError:
        entries = []
    dirs, files = [], []
    for entry in entries:
        if entry.startswith(".") or entry in HIDDEN_ENTRIES:
            continue
        (dirs if os.path.isdir(os.path.join(path, entry)) else files).append(entry)
    parent = None if path == "/" else os.path.dirname(path)
    # Quick jumps: internal storage (home) plus real removable-media mounts.
    # /run/media may contain symlinks (e.g. /run/media/SK01T -> armada/SK01T),
    # so only descend into real directories and only offer actual mount points.
    shortcuts = [{"id": "home", "label": "", "path": SESSION_HOME}]
    for root in sorted(glob.glob("/run/media/*")):
        if os.path.islink(root) or not os.path.isdir(root):
            continue
        shortcuts += [
            {"id": "media", "label": os.path.basename(mount), "path": mount}
            for mount in sorted(glob.glob(os.path.join(root, "*")))
            if os.path.isdir(mount) and os.path.ismount(mount)
        ]
    return {
        "path": path,
        "parent": parent,
        "dirs": sorted(dirs, key=str.lower),
        "files": sorted(files, key=str.lower),
        "shortcuts": shortcuts,
    }
