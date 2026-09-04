"""Import emulator ROMs into the Steam library as non-Steam shortcuts.

ROMs live under a per-user ROM root (default ~/ROMs, changeable from the
plugin; one subfolder per system, same convention as EmuDeck/ROCKNIX). The
SYSTEMS table maps each folder to the emulator that runs it: a standalone
binary shipped in the image, or RetroArch (system package or flatpak) with a
libretro core. Emulators installed later are picked up automatically - a
system appears as soon as its emulator shows up. Imported shortcuts go
through the same nebel-game-launch wrapper every other shortcut gets
(prepended by the frontend), so per-game tweaks apply to ROMs too.

Covers come from SteamGridDB when the user saved an API key (proper 600x900
grids for every system), with libretro-thumbnails (Named_Boxarts, no key
needed) as fallback; the per-system file index is fetched once via the
GitHub trees API and cached for a week.
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

SESSION_HOME = Path("/var/home/nebel")
ROMS_ROOT_DEFAULT = SESSION_HOME / "ROMs"
ROM_ROOT_FILE = SESSION_HOME / ".config/nebel-control/roms-root"
THUMB_CACHE = SESSION_HOME / ".cache/nebel-control/thumb-index"
THUMB_CACHE_TTL = 7 * 24 * 3600
THUMB_REPO = "libretro/libretro-thumbnails"
SGDB_KEY_FILE = SESSION_HOME / ".config/nebel-control/sgdb-api-key"
SGDB_API = "https://www.steamgriddb.com/api/v2"

# RetroArch itself: system package first, then flatpak exports.
RETROARCH_CANDIDATES = [
    "/usr/bin/retroarch",
    "/var/lib/flatpak/exports/bin/org.libretro.RetroArch",
    str(SESSION_HOME / ".local/share/flatpak/exports/bin/org.libretro.RetroArch"),
]
# Where libretro cores get installed (Fedora libretro-* packages, RetroArch's
# own core downloader for a system install, the flatpak's core directory).
CORE_DIRS = [
    "/usr/lib64/libretro",
    str(SESSION_HOME / ".config/retroarch/cores"),
    str(SESSION_HOME / ".var/app/org.libretro.RetroArch/config/retroarch/cores"),
]

SYSTEMS = {
    "ps2": {
        "label": "PlayStation 2",
        "exts": {".iso", ".bin", ".chd", ".cso", ".gz"},
        "exe": ["/usr/bin/nebel-pcsx2"],
        "thumbs": "Sony - PlayStation 2",
    },
    "switch": {
        "label": "Nintendo Switch",
        "exts": {".nsp", ".xci", ".nca"},
        "exe": ["/usr/bin/nebel-eden"],
        "args": ["-f"],
        "thumbs": "Nintendo - Switch",
    },
    "gamecube": {
        "label": "Nintendo GameCube",
        "exts": {".iso", ".gcm", ".rvz", ".ciso", ".gcz"},
        "exe": ["/usr/bin/dolphin-emu"],
        "args": ["-b", "-e"],
        "thumbs": "Nintendo - GameCube",
    },
    "wii": {
        "label": "Nintendo Wii",
        "exts": {".iso", ".rvz", ".wbfs", ".ciso", ".gcz"},
        "exe": ["/usr/bin/dolphin-emu"],
        "args": ["-b", "-e"],
        "thumbs": "Nintendo - Wii",
    },
    "3ds": {
        "label": "Nintendo 3DS",
        "exts": {".3ds", ".cci", ".cxi", ".app", ".zip", ".7z"},
        "exe": [
            "/usr/bin/azahar",
            "/usr/bin/citra",
            "/var/lib/flatpak/exports/bin/org.azahar_emu.Azahar",
            str(SESSION_HOME / ".local/share/flatpak/exports/bin/org.azahar_emu.Azahar"),
            "/var/lib/flatpak/exports/bin/io.github.lime3ds.Azahar",
            str(SESSION_HOME / ".local/share/flatpak/exports/bin/io.github.lime3ds.Azahar"),
        ],
        "cores": ["citra_libretro.so"],
        "thumbs": "Nintendo - Nintendo 3DS",
    },
    "psp": {
        "label": "PlayStation Portable",
        "exts": {".iso", ".cso", ".pbp", ".chd"},
        "exe": [
            "/usr/bin/ppsspp",
            "/var/lib/flatpak/exports/bin/org.ppsspp.PPSSPP",
            str(SESSION_HOME / ".local/share/flatpak/exports/bin/org.ppsspp.PPSSPP"),
        ],
        "cores": ["ppsspp_libretro.so"],
        "thumbs": "Sony - PlayStation Portable",
    },
    "psx": {
        "label": "PlayStation",
        "exts": {".cue", ".chd", ".pbp", ".img", ".iso"},
        "cores": ["pcsx_rearmed_libretro.so", "beetle_psx_hw_libretro.so", "beetle_psx_libretro.so"],
        "thumbs": "Sony - PlayStation",
    },
    "nes": {
        "label": "Nintendo (NES)",
        "exts": {".nes", ".fds", ".unf", ".unif", ".zip", ".7z"},
        "cores": ["nestopia_libretro.so", "fceumm_libretro.so", "quicknes_libretro.so"],
        "thumbs": "Nintendo - Nintendo Entertainment System",
    },
    "snes": {
        "label": "Super Nintendo",
        "exts": {".smc", ".sfc", ".fig", ".swc", ".zip", ".7z"},
        "cores": ["snes9x_libretro.so", "bsnes_libretro.so"],
        "thumbs": "Nintendo - Super Nintendo Entertainment System",
    },
    "n64": {
        "label": "Nintendo 64",
        "exts": {".n64", ".z64", ".v64", ".zip", ".7z"},
        "cores": ["mupen64plus_next_libretro.so", "parallel_n64_libretro.so"],
        "thumbs": "Nintendo - Nintendo 64",
    },
    "gb": {
        "label": "Game Boy",
        "exts": {".gb", ".zip", ".7z"},
        "cores": ["gambatte_libretro.so", "mgba_libretro.so", "sameboy_libretro.so"],
        "thumbs": "Nintendo - Game Boy",
    },
    "gbc": {
        "label": "Game Boy Color",
        "exts": {".gbc", ".zip", ".7z"},
        "cores": ["gambatte_libretro.so", "mgba_libretro.so", "sameboy_libretro.so"],
        "thumbs": "Nintendo - Game Boy Color",
    },
    "gba": {
        "label": "Game Boy Advance",
        "exts": {".gba", ".agb", ".zip", ".7z"},
        "cores": ["mgba_libretro.so", "vbam_libretro.so", "vba_next_libretro.so"],
        "thumbs": "Nintendo - Game Boy Advance",
    },
    "nds": {
        "label": "Nintendo DS",
        "exts": {".nds", ".zip", ".7z"},
        "cores": ["melonds_libretro.so", "desmume_libretro.so"],
        "thumbs": "Nintendo - Nintendo DS",
    },
    "genesis": {
        "label": "Sega Mega Drive / Genesis",
        "exts": {".md", ".gen", ".smd", ".bin", ".zip", ".7z"},
        "cores": ["genesis_plus_gx_libretro.so", "picodrive_libretro.so"],
        "thumbs": "Sega - Mega Drive - Genesis",
    },
    "mastersystem": {
        "label": "Sega Master System",
        "exts": {".sms", ".zip", ".7z"},
        "cores": ["genesis_plus_gx_libretro.so", "picodrive_libretro.so"],
        "thumbs": "Sega - Master System - Mark III",
    },
    "dreamcast": {
        "label": "Sega Dreamcast",
        "exts": {".chd", ".gdi", ".cdi", ".cue"},
        "cores": ["flycast_libretro.so"],
        "thumbs": "Sega - Dreamcast",
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


def roms_root():
    """The configured ROM root (~/ROMs unless the user picked another folder)."""
    try:
        root = ROM_ROOT_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        root = ""
    return Path(root) if root else ROMS_ROOT_DEFAULT


def roms_root_state():
    return {
        "root": str(roms_root()),
        "default": str(ROMS_ROOT_DEFAULT),
        "custom": roms_root() != ROMS_ROOT_DEFAULT,
    }


def set_roms_root(path):
    """Point the ROM library at another folder (any mount, incl. SD cards)."""
    path = (path or "").strip()
    if not path or os.path.realpath(path) == os.path.realpath(ROMS_ROOT_DEFAULT):
        ROM_ROOT_FILE.unlink(missing_ok=True)
        return roms_root_state()
    if not os.path.isdir(path):
        raise ValueError(f"not a directory: {path}")
    ROM_ROOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    ROM_ROOT_FILE.write_text(path + "\n", encoding="utf-8")
    return roms_root_state()


def _first_existing(candidates):
    return next((c for c in candidates if os.path.exists(c)), None)


def _find_core(names):
    for directory in CORE_DIRS:
        for name in names:
            path = os.path.join(directory, name)
            if os.path.exists(path):
                return path
    return None


def _resolve(system):
    """(exe, args) launching this system, or None when no emulator is installed."""
    exe = _first_existing(system.get("exe") or [])
    if exe:
        return exe, list(system.get("args") or [])
    cores = system.get("cores") or []
    if cores:
        retroarch = _first_existing(RETROARCH_CANDIDATES)
        core = _find_core(cores)
        if retroarch and core:
            return retroarch, ["-L", core]
    return None


def available_systems():
    return {
        sid: system
        for sid, system in ((sid, _resolved(sid, system)) for sid, system in SYSTEMS.items())
        if system
    }


def _resolved(sid, system):
    resolved = _resolve(system)
    if not resolved:
        return None
    exe, args = resolved
    return {**system, "id": sid, "exe": exe, "args": args}


def _rom_files(system, root):
    rom_dir = root / system["id"]
    if not rom_dir.is_dir():
        return []
    return sorted(
        (p for p in rom_dir.iterdir() if p.is_file() and p.suffix.lower() in system["exts"]),
        key=lambda p: p.name.casefold(),
    )


def _any_folder_roms(root):
    """Recursive scan used when `root` has NO per-system subfolders at all
    (the user pointed the importer at a loose folder, e.g. Downloads).

    A file matches a system when its extension is unique to that system
    (.cci/.3ds -> 3ds, .nsp/.xci -> switch, ...). Shared extensions
    (.iso, .zip, .chd, ...) need a folder-name hint: a path component
    matching the system id or label ("wii", "PlayStation", ...).
    """
    by_ext = {}
    for sid, system in available_systems().items():
        for ext in system["exts"]:
            by_ext.setdefault(ext, []).append(sid)
    out = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        sids = by_ext.get(p.suffix.lower())
        if not sids:
            continue
        if len(sids) == 1:
            out.append((sids[0], p))
            continue
        parts = [part.casefold() for part in p.parts[:-1]]
        hinted = [
            sid for sid in sids
            if any(sid in part or SYSTEMS[sid]["label"].casefold() in part for part in parts)
        ]
        if hinted:
            out.append((hinted[0], p))
    return out


def _has_system_subfolders(root):
    return any((root / sid).is_dir() for sid in available_systems())


def scan_roms(root=None):
    """Systems and ROM counts under `root` (configured ROM root when omitted)."""
    root = Path(root) if root else roms_root()
    systems = []
    loose = None if _has_system_subfolders(root) else _any_folder_roms(root)
    for sid, system in available_systems().items():
        if loose is None:
            count = len(_rom_files(system, root))
        else:
            count = sum(1 for fsid, _ in loose if fsid == sid)
        systems.append({
            "id": sid,
            "label": system["label"],
            "dir": str(root / sid),
            "count": count,
        })
    return {"root": str(root), "systems": systems}


def import_roms(root=None):
    """Create Steam shortcuts for ROMs under `root`.

    `root` is either an organized library (per-system subfolders like
    `root/3ds/`) or any loose folder - then the whole tree is scanned
    recursively, classified by extension (+ folder-name hints for shared
    extensions).
    """
    root = Path(root) if root else roms_root()
    found = []
    if _has_system_subfolders(root):
        for system in available_systems().values():
            for rom in _rom_files(system, root):
                found.append((system, rom))
    else:
        systems = available_systems()
        for sid, rom in _any_folder_roms(root):
            found.append((systems[sid], rom))
    games = []
    for system, rom in found:
        prefix = " ".join(system.get("args") or [])
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


def fetch_artwork(root=None):
    """Download boxart covers for imported ROM shortcuts into Steam's grid dir.

    SteamGridDB (when the user saved an API key) has proper coverage for the
    systems we emulate; libretro-thumbnails is the keyless fallback, good for
    cartridge-era systems but thin for PS2/GameCube/Switch.
    """
    root = Path(root) if root else roms_root()
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
        roms = _rom_files(system, root)
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
