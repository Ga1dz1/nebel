"""Backend for the in-plugin file picker.

Steam's own "Browse" button (Add Non-Steam Game) is broken in the ARM64 Linux
client: SteamClient.System.OpenFileDialog rejects with result=2 without ever
reaching the desktop portal. Native dialogs (kdialog, xdg-desktop-portal) are
useless in the gamescope session — gamescope never presents their windows —
so the picker UI lives inside the plugin and only lists directories here; the
frontend registers the pick via SteamClient.Apps.AddShortcut.

Heroic games must not be added as raw exe picks: they need their Heroic
prefix, wine build and env. Shortcuts point at /usr/bin/nebel-heroic-launch,
a foreground wrapper that reads Heroic's per-game config and execs
legendary+umu directly. `heroic --no-gui heroic://launch...` is unsuitable:
with any Heroic instance already running it just forwards the URL and exits,
so Steam sees the "game" die after two seconds and never focuses the window.
heroic_games() feeds a one-click list in the picker, and heroic_match()
intercepts manual picks inside a Heroic install dir.
"""
import glob
import json
import os
import re

SESSION_HOME = "/var/home/nebel"

# Filesystem bookkeeping junk that should never be picked as a game.
HIDDEN_ENTRIES = {"lost+found", "System Volume Information", "$RECYCLE.BIN", "RECYCLER"}

# Heroic per-store installed-games registries: (installed.json path, runner).
HEROIC_STORES = [
    (os.path.join(SESSION_HOME, ".config/heroic/legendaryConfig/legendary/installed.json"), "legendary"),
    (os.path.join(SESSION_HOME, ".config/heroic/gog_store/installed.json"), "gog"),
]

# Foreground launcher shipped in the image; falls back to ~/.local/bin on
# systems where /usr/bin is still an older (pre-wrapper) build.
HEROIC_LAUNCHER_CANDIDATES = [
    "/usr/bin/nebel-heroic-launch",
    os.path.join(SESSION_HOME, ".local/bin/nebel-heroic-launch"),
]

HEROIC_CFG_DIR = os.path.join(SESSION_HOME, ".config/heroic")


def heroic_launcher():
    """The launcher path to put into shortcuts (first one that exists)."""
    return next((p for p in HEROIC_LAUNCHER_CANDIDATES if os.path.isfile(p)),
                HEROIC_LAUNCHER_CANDIDATES[0])


def heroic_shortcut(appid):
    """How a Steam shortcut relates to Heroic, or None.

    Returns {"style": "wrapper"|"heroic", "appName", "runner", "name",
             "exe", "launchOptions", "launcher"}.
    "wrapper" = launches via nebel-heroic-launch (reliable, tracked by Steam).
    "heroic"  = Heroic's own `heroic --no-gui heroic://launch...` form, which
                breaks in game mode whenever a Heroic instance is running.
    """
    from nebel_control.steam import shortcut_entry

    entry = shortcut_entry(appid)
    if not entry:
        return None
    exe = (entry.get("Exe") or "").strip().strip('"')
    options = entry.get("LaunchOptions") or ""
    name = entry.get("AppName") or ""
    base = os.path.basename(exe)
    app_name, runner = "", "legendary"
    # The game-launch wrapper is prepended to shortcuts automatically
    # ("nebel-game-launch %command% ...") - look past it when parsing.
    parse_options = re.sub(r"^\s*\S*nebel-game-launch\s+%command%\s*", "", options)
    if base == "nebel-heroic-launch":
        style = "wrapper"
        match = re.match(r'\s*"([^"]+)"\s*(\w*)', parse_options)
        if match:
            app_name = match.group(1)
            runner = match.group(2) or "legendary"
    else:
        match = re.search(r"heroic://launch\?appName=([^&\"\s]+)(?:&runner=(\w+))?", options)
        if not match and base != "heroic":
            return None
        style = "heroic"
        if match:
            app_name = match.group(1)
            runner = match.group(2) or "legendary"
    if not app_name:
        return None
    return {
        "style": style,
        "appName": app_name,
        "runner": runner,
        "name": name,
        "exe": exe,
        "launchOptions": options,
        "launcher": heroic_launcher(),
    }


# Heroic GamesConfig files nest per-game overrides under the app name key and
# keep global defaults under "default".
def _heroic_games_config(app_name):
    path = os.path.join(HEROIC_CFG_DIR, "GamesConfig", f"{app_name}.json")
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        data = {}
    return path, data


def heroic_config(app_name):
    """Per-game Heroic settings relevant to launching, flattened for the UI."""
    _, data = _heroic_games_config(app_name)
    game = data.get(app_name)
    if not isinstance(game, dict):
        game = data.get("default") if isinstance(data.get("default"), dict) else {}
    wine_version = game.get("wineVersion") or {}
    return {
        "appName": app_name,
        "wineVersionBin": wine_version.get("bin", ""),
        "wineVersionName": wine_version.get("name", ""),
        "wineVersionType": wine_version.get("type", ""),
        "winePrefix": game.get("winePrefix", ""),
        "enableEsync": bool(game.get("enableEsync", True)),
        "enableFsync": bool(game.get("enableFsync", True)),
        "enableMsync": bool(game.get("enableMsync", False)),
        "enableWoW64": bool(game.get("enableWoW64", True)),
    }


_HEROIC_TOGGLES = ("enableEsync", "enableFsync", "enableMsync", "enableWoW64")


def heroic_set_config(app_name, patch):
    """Merge a settings patch into Heroic's per-game config, preserving layout."""
    if not re.fullmatch(r"[\w.-]+", app_name or ""):
        raise ValueError("bad app name")
    path, data = _heroic_games_config(app_name)
    game = data.get(app_name)
    if not isinstance(game, dict):
        game = {}
        data[app_name] = game
    for key in _HEROIC_TOGGLES:
        if key in patch:
            game[key] = bool(patch[key])
    version = patch.get("wineVersion")
    if isinstance(version, dict) and version.get("bin"):
        game["wineVersion"] = {
            "bin": str(version["bin"]),
            "name": str(version.get("name") or os.path.basename(os.path.dirname(version["bin"]))),
            "type": str(version.get("type") or "proton"),
        }
    data.setdefault("version", "v0")
    data["explicit"] = True
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
    os.replace(tmp, path)
    return heroic_config(app_name)


def heroic_versions():
    """Wine/Proton builds installed under Heroic's tools dir."""
    out = []
    for kind, subdir, bin_rel in (("proton", "proton", "proton"),
                                  ("wine", "wine", os.path.join("bin", "wine"))):
        base = os.path.join(HEROIC_CFG_DIR, "tools", subdir)
        try:
            entries = sorted(os.listdir(base))
        except OSError:
            continue
        for name in entries:
            binary = os.path.join(base, name, bin_rel)
            if os.path.isfile(binary):
                out.append({"name": name, "type": kind, "bin": binary})
    return out


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
    """Steam shortcut fields for launching the game via nebel-heroic-launch."""
    return {
        "name": game["title"],
        "exe": heroic_launcher(),
        "args": f'"{game["appName"]}" {game["runner"]}',
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
