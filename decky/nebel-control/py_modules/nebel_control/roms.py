"""Import emulator ROMs into the Steam library as non-Steam shortcuts.

ROMs live under ~/ROMs/<system>/ (one folder per system, same convention as
EmuDeck/ROCKNIX). The SYSTEMS table maps each folder to the emulator wrapper
that runs it; a system only shows up when its emulator binary is actually
installed, so adding an emulator to the image later means adding one entry
here and nothing else. Imported shortcuts go through the same
nebel-game-launch wrapper every other shortcut gets (prepended by the
frontend), so per-game tweaks apply to ROMs too.

Covers come from the libretro-thumbnails repo (Named_Boxarts), which needs no
API key; the per-system file index is fetched once via the GitHub trees API
and cached for a week.
"""
import difflib
import json
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from nebel_control.steam import add_shortcuts, grid_dir, shortcut_appid

ROMS_ROOT = Path("/var/home/nebel/ROMs")
THUMB_CACHE = Path("/var/home/nebel/.cache/nebel-control/thumb-index")
THUMB_CACHE_TTL = 7 * 24 * 3600
THUMB_REPO = "libretro/libretro-thumbnails"
SGDB_KEY_FILE = Path("/var/home/nebel/.config/nebel-control/sgdb-api-key")
SGDB_API = "https://www.steamgriddb.com/api/v2"

SYSTEMS = {
    "ps2": {
        "label": "PlayStation 2",
        "exts": {".iso", ".bin", ".chd", ".cso", ".gz"},
        "exe": "/usr/bin/nebel-pcsx2",
        "thumbs": "Sony - PlayStation 2",
    },
    "switch": {
        "label": "Nintendo Switch",
        "exts": {".nsp", ".xci", ".nca"},
        "exe": "/usr/bin/nebel-eden",
        "args": ["-f"],
        "thumbs": "Nintendo - Switch",
    },
    "gamecube": {
        "label": "Nintendo GameCube",
        "exts": {".iso", ".gcm", ".rvz", ".ciso", ".gcz"},
        "exe": "/usr/bin/dolphin-emu",
        "args": ["-b", "-e"],
        "thumbs": "Nintendo - GameCube",
    },
    "wii": {
        "label": "Nintendo Wii",
        "exts": {".iso", ".rvz", ".wbfs", ".ciso", ".gcz"},
        "exe": "/usr/bin/dolphin-emu",
        "args": ["-b", "-e"],
        "thumbs": "Nintendo - Wii",
    },
}

_TAG_RE = re.compile(r"\s*(\([^()]*\)|\[[^\[\]]*\])\s*")
_WS_RE = re.compile(r"\s+")


def clean_name(stem):
    """'Zelda - Wind Waker (Europe) (En,Fr)' -> 'Zelda - Wind Waker'."""
    name = _TAG_RE.sub(" ", stem).replace("_", " ").replace(".", " ")
    return _WS_RE.sub(" ", name).strip(" -") or stem


def _norm(text):
    return _WS_RE.sub(" ", _TAG_RE.sub(" ", text).lower()).strip()


def available_systems():
    return {sid: sys for sid, sys in SYSTEMS.items() if os.path.exists(sys["exe"])}


def _rom_files(system):
    rom_dir = ROMS_ROOT / _system_id(system)
    if not rom_dir.is_dir():
        return []
    return sorted(
        (p for p in rom_dir.iterdir() if p.is_file() and p.suffix.lower() in system["exts"]),
        key=lambda p: p.name.casefold(),
    )


def _system_id(system):
    for sid, entry in SYSTEMS.items():
        if entry is system:
            return sid
    return ""


def scan_roms():
    systems = []
    for sid, system in available_systems().items():
        roms = _rom_files(system)
        systems.append({
            "id": sid,
            "label": system["label"],
            "dir": str(ROMS_ROOT / sid),
            "count": len(roms),
        })
    return {"root": str(ROMS_ROOT), "systems": systems}


def import_roms():
    games = []
    for sid, system in available_systems().items():
        prefix = " ".join(system.get("args") or [])
        for rom in _rom_files(system):
            args = f'"{rom}"'
            if prefix:
                args = f"{prefix} {args}"
            games.append({
                "name": clean_name(rom.stem),
                "exe": system["exe"],
                "args": args,
                "startdir": str(rom.parent),
            })
    if not games:
        return {"added": [], "skipped": [], "error": "no ROMs found"}
    try:
        added, skipped = add_shortcuts(games)
    except (OSError, ValueError, RuntimeError) as exc:
        return {"added": [], "skipped": [], "error": str(exc)}
    return {"added": added, "skipped": skipped, "error": ""}


def _http_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "nebel-control"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def _thumb_index(system):
    """Map of normalized game name -> repo-relative png path for a system."""
    cache_file = THUMB_CACHE / (urllib.parse.quote(system["thumbs"], safe="") + ".json")
    try:
        cached = json.loads(cache_file.read_text(encoding="utf-8"))
        if time.time() - cached.get("fetched", 0) < THUMB_CACHE_TTL:
            return cached["names"]
    except (OSError, ValueError, KeyError):
        pass
    listing = _http_json(f"https://api.github.com/repos/{THUMB_REPO}/contents/")
    sha = next(
        (item["sha"] for item in listing if item.get("name") == system["thumbs"] and item.get("type") == "dir"),
        None,
    )
    if not sha:
        raise RuntimeError(f"no thumbnail set for {system['thumbs']}")
    tree = _http_json(f"https://api.github.com/repos/{THUMB_REPO}/git/trees/{sha}?recursive=1")
    names = {}
    for node in tree.get("tree") or []:
        path = node.get("path") or ""
        if not path.startswith("Named_Boxarts/") or not path.endswith(".png"):
            continue
        names[_norm(Path(path).stem)] = path
    try:
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        cache_file.write_text(json.dumps({"fetched": time.time(), "names": names}), encoding="utf-8")
    except OSError:
        pass
    return names


def sgdb_key_state():
    try:
        key = SGDB_KEY_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        key = ""
    masked = key[:4] + "…" + key[-4:] if len(key) > 8 else ("*" * len(key))
    return {"present": bool(key), "masked": masked if key else ""}


def set_sgdb_key(key):
    key = (key or "").strip()
    try:
        if key:
            SGDB_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
            SGDB_KEY_FILE.write_text(key + "\n", encoding="utf-8")
        else:
            SGDB_KEY_FILE.unlink(missing_ok=True)
    except OSError:
        pass
    return sgdb_key_state()


def _sgdb_get(path, key):
    request = urllib.request.Request(
        SGDB_API + path,
        headers={"Authorization": f"Bearer {key}", "User-Agent": "nebel-control"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def _sgdb_cover(name, key):
    """600x900 grid cover URL for a game name via SteamGridDB, or None."""
    results = _sgdb_get("/search/autocomplete/" + urllib.parse.quote(name), key)
    games = results.get("data") or []
    if not games:
        return None
    target = _norm(name)
    game_id = games[0].get("id")
    for game in games:
        if _norm(str(game.get("name") or "")) == target:
            game_id = game["id"]
            break
    if not game_id:
        return None
    grids = _sgdb_get(f"/grids/game/{game_id}?dimensions=600x900", key)
    entries = grids.get("data") or []
    return entries[0].get("url") if entries else None


def _download(url, dest):
    request = urllib.request.Request(url, headers={"User-Agent": "nebel-control"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def fetch_artwork():
    """Download boxart covers for imported ROM shortcuts into Steam's grid dir.

    SteamGridDB (when the user saved an API key) has proper coverage for the
    systems we emulate; libretro-thumbnails is the keyless fallback, good for
    cartridge-era systems but thin for PS2/GameCube/Switch.
    """
    target_dir = grid_dir()
    if target_dir is None:
        return {"matched": 0, "missed": [], "error": "no Steam grid dir"}
    try:
        sgdb_key = SGDB_KEY_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        sgdb_key = ""
    matched = 0
    missed = []
    error = ""
    for sid, system in available_systems().items():
        roms = _rom_files(system)
        if not roms:
            continue
        index = {}
        keys = []
        try:
            index = _thumb_index(system)
            keys = list(index.keys())
        except Exception:
            if not sgdb_key:
                error = f"no cover source for {system['label']}"
        for rom in roms:
            name = clean_name(rom.stem)
            exe = f'"{system["exe"]}"'
            appid = shortcut_appid(exe, name) & 0xFFFFFFFF
            cover = target_dir / f"{appid}p.png"
            if cover.exists():
                continue
            got = False
            if sgdb_key:
                try:
                    url = _sgdb_cover(name, sgdb_key)
                    if url:
                        _download(url, cover)
                        got = True
                except Exception:
                    pass
            if not got and index:
                norm = _norm(rom.stem)
                key = norm if norm in index else None
                if key is None:
                    close = difflib.get_close_matches(norm, keys, n=1, cutoff=0.85)
                    key = close[0] if close else None
                if key is not None:
                    url = (
                        f"https://raw.githubusercontent.com/{THUMB_REPO}/master/"
                        + urllib.parse.quote(system["thumbs"] + "/" + index[key])
                    )
                    try:
                        _download(url, cover)
                        got = True
                    except Exception:
                        pass
            if got:
                matched += 1
            else:
                missed.append(name)
    return {"matched": matched, "missed": missed, "error": error}
