"""Backend for the in-plugin file picker.

Steam's own "Browse" button (Add Non-Steam Game) is broken in the ARM64 Linux
client: SteamClient.System.OpenFileDialog rejects with result=2 without ever
reaching the desktop portal. Native dialogs (kdialog, xdg-desktop-portal) are
useless in the gamescope session — gamescope never presents their windows —
so the picker UI lives inside the plugin and only lists directories here; the
frontend registers the pick via SteamClient.Apps.AddShortcut.
"""
import glob
import os

SESSION_HOME = "/var/home/nebel"

# Filesystem bookkeeping junk that should never be picked as a game.
HIDDEN_ENTRIES = {"lost+found", "System Volume Information", "$RECYCLE.BIN", "RECYCLER"}


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
