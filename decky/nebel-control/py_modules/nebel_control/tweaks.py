import copy
import json
import re
from pathlib import Path

from .privileged import call

TWEAKS_CONFIG = Path("/etc/nebel/game-tweaks.json")
COMPAT_APPLIED_STATE = Path("/var/lib/nebel/compat-applied.json")
FEX_PROFILES_CONFIG = Path("/usr/share/nebel/fex-profiles.json")
PLUGIN_FEX_PROFILES_CONFIG = Path(__file__).resolve().parent.parent / "fex-profiles.json"


def load_fex_contract():
    path = FEX_PROFILES_CONFIG if FEX_PROFILES_CONFIG.exists() else PLUGIN_FEX_PROFILES_CONFIG
    with path.open(encoding="utf-8") as f:
        contract = json.load(f)
    profiles = contract.get("profiles")
    if not isinstance(contract.get("defaults"), dict) or not isinstance(profiles, dict) or "default" not in profiles:
        raise ValueError("invalid FEX profile contract")
    for profile in profiles.values():
        if not isinstance(profile, dict) or not isinstance(profile.get("config"), dict):
            raise ValueError("invalid FEX profile contract")
    return contract


def fex_profile_labels(contract):
    return {
        name: {"label": profile.get("label", name.title()), "config": profile.get("config", {})}
        for name, profile in contract["profiles"].items()
        if isinstance(profile, dict)
    }


def load_tweaks():
    contract = load_fex_contract()
    try:
        with TWEAKS_CONFIG.open(encoding="utf-8") as f:
            loaded = json.load(f)
    except (OSError, ValueError):
        return copy.deepcopy(contract["defaults"])
    data = copy.deepcopy(contract["defaults"])
    if isinstance(loaded, dict):
        if isinstance(loaded.get("global"), dict):
            data["global"].update(loaded["global"])
        if isinstance(loaded.get("games"), dict):
            data["games"] = {
                str(k): v for k, v in loaded["games"].items()
                if str(k).isdigit() and isinstance(v, dict)
            }
    data["games"] = {
        gid: {k: v for k, v in game.items() if k != "enabled"}
        for gid, game in data["games"].items()
        if isinstance(game, dict) and game.get("enabled") is not False
    }
    return data


def sanitize_tweaks(data):
    if not isinstance(data, dict):
        raise ValueError("tweaks must be an object")
    if len(json.dumps(data)) > 256 * 1024:
        raise ValueError("tweaks payload too large")
    clean = {"global": {}, "games": {}}
    if isinstance(data.get("global"), dict):
        clean["global"] = data["global"]
    raw_games = data.get("games")
    if isinstance(raw_games, dict):
        for gid, game in raw_games.items():
            if str(gid).isdigit() and isinstance(game, dict):
                clean["games"][str(gid)] = game
    return clean


def save_tweaks(data):
    call("write_config", name="tweaks", text=json.dumps(sanitize_tweaks(data), indent=2, sort_keys=True) + "\n")


LSFG_LAYER_MANIFEST = Path("/usr/share/vulkan/lsfg-vk/VkLayer_LSFGVK_frame_generation.json")


def lsfg_availability():
    # The decky backend runs as root (PluginLoader service), so Path.home()
    # points at /root and never finds the user's Steam install. Use the
    # session home like sync.py/steam.py do. Scan every Steam library folder
    # (internal storage AND any SD-card library), not just the default home
    # paths - Lossless Scaling installed to the card library is invisible
    # otherwise, and the per-game toggle never appears.
    home = Path("/var/home/nebel")
    roots = {home / ".local/share/Steam", home / ".steam/steam"}
    for root in list(roots):
        for library_file in (root / "steamapps" / "libraryfolders.vdf", root / "config" / "libraryfolders.vdf"):
            try:
                text = library_file.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for match in re.finditer(r'"path"\s+"([^"]+)"', text):
                roots.add(Path(match.group(1).replace("\\\\", "\\")))
    lossless_candidates = [
        root / "steamapps" / "common" / "Lossless Scaling" / "Lossless.dll"
        for root in sorted(roots)
    ]
    return {
        "layer": LSFG_LAYER_MANIFEST.is_file(),
        "lossless": any(candidate.is_file() for candidate in lossless_candidates),
    }


def load_compat_applied():
    try:
        with COMPAT_APPLIED_STATE.open(encoding="utf-8") as f:
            loaded = json.load(f)
    except (OSError, ValueError):
        return []
    appids = loaded.get("appids") if isinstance(loaded, dict) else None
    if not isinstance(appids, list):
        return []
    return sorted({str(appid) for appid in appids if str(appid).isdigit()}, key=int)


def save_compat_applied(appids):
    clean = sorted({str(appid) for appid in appids if str(appid).isdigit()}, key=int)
    text = json.dumps({"appids": clean}, indent=2, sort_keys=True) + "\n"
    call("write_config", name="compat-applied", text=text)
    return clean


# --- Export / import (shareable per-game tweak packs, pocknix-style) ------
TWEAKS_EXPORT_VERSION = 1
TWEAKS_EXPORT_PATH = Path("/var/home/nebel/nebel-tweaks-export.json")


def export_tweaks():
    data = load_tweaks()
    return {
        "nebel-tweaks": TWEAKS_EXPORT_VERSION,
        "global": data.get("global", {}),
        "games": data.get("games", {}),
    }


def import_tweaks(payload):
    if not isinstance(payload, dict):
        raise ValueError("not a tweaks export")
    version = payload.get("nebel-tweaks")
    if version is None:
        raise ValueError("missing nebel-tweaks marker")
    if int(version) > TWEAKS_EXPORT_VERSION:
        raise ValueError(f"unsupported export version {version}")
    data = sanitize_tweaks({"global": payload.get("global", {}), "games": payload.get("games", {})})
    save_tweaks(data)
    return export_tweaks()


def export_tweaks_file():
    """Write the export next to the user home so it can be grabbed off the
    console (SD card, sync, ssh) and shared; returns the path."""
    payload = export_tweaks()
    text = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    TWEAKS_EXPORT_PATH.write_text(text, encoding="utf-8")
    try:
        import os
        os.chown(TWEAKS_EXPORT_PATH, 1000, 1000)
    except OSError:
        pass
    return {"path": str(TWEAKS_EXPORT_PATH), "games": len(payload.get("games", {}))}


def import_tweaks_file(path=None):
    """Import from a JSON file (defaults to the export path)."""
    source = Path(path) if path else TWEAKS_EXPORT_PATH
    with source.open(encoding="utf-8") as f:
        payload = json.load(f)
    result = import_tweaks(payload)
    return {"games": len(result.get("games", {})), "path": str(source)}
