from pathlib import Path
import binascii
import struct

STEAM_ROOT = Path("/var/home/nebel/.local/share/Steam")
STEAM_APPS_DIR = STEAM_ROOT / "steamapps"


def _read_cstring(buf, pos):
    end = buf.index(b"\x00", pos)
    return buf[pos:end].decode("utf-8", errors="replace"), end + 1


def _write_cstring(text):
    return text.encode("utf-8") + b"\x00"


# Mirror of _vdf_parse_map: nested maps, strings, int32. That covers every
# field Steam writes into a shortcuts.vdf entry.
def _vdf_write_map(buf, mapping):
    for name, value in mapping.items():
        if isinstance(value, dict):
            buf += b"\x00" + _write_cstring(name)
            buf = _vdf_write_map(buf, value)
            buf += b"\x08"
        elif isinstance(value, int):
            buf += b"\x02" + _write_cstring(name) + struct.pack("<i", value)
        else:
            buf += b"\x01" + _write_cstring(name) + _write_cstring(str(value))
    return buf


# Steam derives a non-Steam app's id from the Exe + AppName strings exactly as
# stored in shortcuts.vdf (quotes included); the high bit marks it non-Steam.
def shortcut_appid(exe, name):
    crc = binascii.crc32((exe + name).encode("utf-8")) & 0xFFFFFFFF
    appid = crc | 0x80000000
    return appid - 0x100000000 if appid >= 0x80000000 else appid


def _user_config_dir():
    # Steam keeps an "anonymous"/"0" userdata entry alongside the real account.
    for user_dir in sorted(STEAM_ROOT.glob("userdata/*")):
        if user_dir.name in ("0", "anonymous", "ac"):
            continue
        config_dir = user_dir / "config"
        if config_dir.is_dir():
            return config_dir
    return None


# Minimal binary VDF reader - covers the field types shortcuts.vdf uses
# (nested maps, strings, int32, uint64, end-of-map markers).
def _vdf_parse_map(buf, pos):
    out = {}
    while pos < len(buf):
        kind = buf[pos]
        pos += 1
        if kind == 0x08:  # end of map
            break
        name, pos = _read_cstring(buf, pos)
        if kind == 0x00:
            value, pos = _vdf_parse_map(buf, pos)
        elif kind == 0x01:
            value, pos = _read_cstring(buf, pos)
        elif kind == 0x02:
            value = struct.unpack_from("<i", buf, pos)[0]
            pos += 4
        elif kind == 0x07:
            value = struct.unpack_from("<Q", buf, pos)[0]
            pos += 8
        else:
            raise ValueError(f"unknown vdf field type {kind:#x}")
        out[name] = value
    return out, pos


# Non-Steam games have no appmanifest; they live in the binary shortcuts.vdf.
# The stored appid is a signed int32 with the high bit set - the frontend
# (appStore, resolution override, per-game config) uses it as unsigned.
def _shortcut_games():
    games = []
    for vdf_file in STEAM_ROOT.glob("userdata/*/config/shortcuts.vdf"):
        try:
            data = vdf_file.read_bytes()
        except OSError:
            continue
        try:
            root, _ = _vdf_parse_map(data, 0)
        except (ValueError, IndexError, struct.error):
            continue
        shortcuts = root.get("shortcuts") or {}
        if not isinstance(shortcuts, dict):
            continue
        for entry in shortcuts.values():
            if not isinstance(entry, dict):
                continue
            raw_appid = entry.get("appid")
            name = entry.get("AppName") or entry.get("appname") or ""
            if isinstance(raw_appid, int) and name:
                games.append({"appid": str(raw_appid & 0xFFFFFFFF), "name": name})
    return games


def shortcut_entry(appid):
    """Full shortcuts.vdf entry (Exe, LaunchOptions, ...) for an unsigned appid."""
    for vdf_file in STEAM_ROOT.glob("userdata/*/config/shortcuts.vdf"):
        try:
            data = vdf_file.read_bytes()
        except OSError:
            continue
        try:
            root, _ = _vdf_parse_map(data, 0)
        except (ValueError, IndexError, struct.error):
            continue
        shortcuts = root.get("shortcuts") or {}
        if not isinstance(shortcuts, dict):
            continue
        for entry in shortcuts.values():
            if not isinstance(entry, dict):
                continue
            raw_appid = entry.get("appid")
            if isinstance(raw_appid, int) and str(raw_appid & 0xFFFFFFFF) == str(appid):
                return entry
    return None


def add_shortcuts(games):
    """Append non-Steam shortcuts, skipping ones already present.

    games: list of {"name", "exe", "args", "startdir"} where exe/startdir are
    bare paths. Returns (added, skipped) name lists. Steam only re-reads
    shortcuts.vdf on startup, so the caller should tell the user to restart
    game mode for the new entries to appear.
    """
    config_dir = _user_config_dir()
    if config_dir is None:
        raise RuntimeError("no Steam user config found")
    vdf_file = config_dir / "shortcuts.vdf"
    shortcuts = {}
    if vdf_file.exists():
        root, _ = _vdf_parse_map(vdf_file.read_bytes(), 0)
        shortcuts = root.get("shortcuts") or {}
    known = set()
    next_index = 0
    for key, entry in shortcuts.items():
        if not isinstance(entry, dict):
            continue
        known.add(((entry.get("Exe") or ""), entry.get("AppName") or ""))
        try:
            next_index = max(next_index, int(key) + 1)
        except (TypeError, ValueError):
            pass
    added, skipped = [], []
    for game in games:
        exe = f'"{game["exe"]}"'
        name = game["name"]
        if (exe, name) in known:
            skipped.append(name)
            continue
        options = game.get("args") or ""
        entry = {
            "appid": shortcut_appid(exe, name),
            "AppName": name,
            "Exe": exe,
            "StartDir": f'"{game.get("startdir") or str(Path(game["exe"]).parent)}"',
            "icon": "",
            "ShortcutPath": "",
            "LaunchOptions": options,
            "IsHidden": 0,
            "AllowDesktopConfig": 1,
            "AllowOverlay": 1,
            "OpenVR": 0,
            "Devkit": 0,
            "DevkitGameID": "",
            "DevkitOverrideAppID": 0,
            "LastPlayTime": 0,
            "FlatpakAppID": "",
            "tags": {},
        }
        shortcuts[str(next_index)] = entry
        next_index += 1
        known.add((exe, name))
        added.append(name)
    if not added:
        return added, skipped
    backup = vdf_file.with_suffix(".vdf.nebel-bak")
    if vdf_file.exists() and not backup.exists():
        backup.write_bytes(vdf_file.read_bytes())
    buf = _vdf_write_map(b"", {"shortcuts": shortcuts}) + b"\x08"
    vdf_file.write_bytes(buf)
    return added, skipped


def grid_dir():
    config_dir = _user_config_dir()
    if config_dir is None:
        return None
    return config_dir / "grid"


def installed_games():
    steamapps_dirs = {STEAM_APPS_DIR}
    for library_file in (STEAM_APPS_DIR / "libraryfolders.vdf", STEAM_ROOT / "config/libraryfolders.vdf"):
        try:
            lines = library_file.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for line in lines:
            parts = line.strip().split('"')
            if len(parts) >= 4 and parts[1] == "path":
                steamapps_dirs.add(Path(parts[3]) / "steamapps")
    games = []
    seen = set()
    for steamapps_dir in sorted(steamapps_dirs):
        for manifest in sorted(steamapps_dir.glob("appmanifest_*.acf")):
            values = {}
            try:
                lines = manifest.read_text(encoding="utf-8", errors="replace").splitlines()
            except OSError:
                continue
            for line in lines:
                parts = line.strip().split('"')
                if len(parts) >= 4 and parts[1] in ("appid", "name"):
                    values[parts[1]] = parts[3]
            appid = values.get("appid")
            name = values.get("name")
            if appid and name and appid not in seen:
                games.append({"appid": str(appid), "name": name})
                seen.add(appid)
    for game in _shortcut_games():
        if game["appid"] not in seen:
            games.append(game)
            seen.add(game["appid"])
    return sorted(games, key=lambda game: game["name"].casefold())
