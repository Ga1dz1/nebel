from pathlib import Path
import struct

STEAM_ROOT = Path("/var/home/nebel/.local/share/Steam")
STEAM_APPS_DIR = STEAM_ROOT / "steamapps"


def _read_cstring(buf, pos):
    end = buf.index(b"\x00", pos)
    return buf[pos:end].decode("utf-8", errors="replace"), end + 1


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
