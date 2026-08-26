"""Syncthing integration: service control, pairing and preset folders.

Talks to Syncthing's REST API on 127.0.0.1:8384 using the API key from the
user's config.xml. Service enable/start goes through the privileged helper
because the unit is a *user* service of the nebel account.
"""

import shutil
import subprocess
import re
import urllib.error
import urllib.request
import json
from pathlib import Path

from .privileged import call
from .system import run_cmd

HOME = Path("/var/home/nebel")
# Syncthing v2 stores config under ~/.local/state, v1 under ~/.config.
CONFIG_CANDIDATES = (
    HOME / ".local" / "state" / "syncthing" / "config.xml",
    HOME / ".config" / "syncthing" / "config.xml",
)
API_BASE = "http://127.0.0.1:8384"

# Preset folders the user can toggle. Paths are relative to the armada home.
# Steam games themselves stay on Steam Cloud; these cover everything else.
PRESET_FOLDERS = {
    "nebel-config": ("Nebel (stick lighting, calibration & game profiles)", ".config/nebel"),
    "nebel-decky-settings": ("Decky Settings", "homebrew/settings"),
    "nebel-heroic-config": ("Heroic (settings)", ".config/heroic"),
    # Wine prefixes hold the actual save files; game files themselves
    # (~/Games/Heroic) are way too large for sync - add manually if needed.
    "nebel-heroic-saves": ("Heroic saves (Wine prefixes)", "Games/Heroic/Prefixes"),
    "nebel-pcsx2": ("PCSX2 (saves & settings)", ".config/PCSX2"),
    "nebel-eden-config": ("Eden settings", ".config/eden"),
    "nebel-eden-saves": ("Eden saves", ".local/share/eden/nand/user/save"),
    "nebel-retroarch": (
        "RetroArch (saves & settings)",
        ".var/app/org.libretro.RetroArch/config/retroarch",
    ),
}


def installed():
    return shutil.which("syncthing") is not None or Path("/usr/bin/syncthing").exists()


def _config_xml():
    for candidate in CONFIG_CANDIDATES:
        if candidate.exists():
            return candidate
    return CONFIG_CANDIDATES[0]


def api_key():
    # No xml.etree here: Decky's sandboxed Python ships a reduced stdlib.
    # The apikey element is flat and attribute-free, a regex is enough.
    try:
        text = _config_xml().read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    match = re.search(r"<apikey>([^<]+)</apikey>", text)
    return match.group(1).strip() if match else ""


def rest(method, path, body=None, timeout=8):
    key = api_key()
    if not key:
        raise RuntimeError("syncthing config not generated yet")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        API_BASE + path, data=data, method=method,
        headers={"X-API-Key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404 and method == "DELETE":
            return None
        raise RuntimeError(f"syncthing API {method} {path}: HTTP {exc.code}") from exc
    except OSError as exc:
        raise RuntimeError("syncthing is not reachable (service off?)") from exc
    return json.loads(raw) if raw else None


def service_state():
    try:
        return call("get_syncthing_enabled")
    except Exception:
        pass
    # Fallback: ask the user manager directly.
    base = ["/usr/bin/systemctl", "--machine=nebel@", "--user"]
    enabled = run_cmd(base + ["is-enabled", "syncthing.service"])
    active = run_cmd(base + ["is-active", "syncthing.service"])
    return {
        "enabled": bool(enabled and enabled.stdout.strip() == "enabled"),
        "active": bool(active and active.stdout.strip() == "active"),
    }


def set_service_enabled(enabled):
    result = call("set_syncthing_enabled", enabled=bool(enabled))
    if enabled:
        # First start generates config.xml; wait for the API to come up.
        import time

        for _ in range(30):
            try:
                rest("GET", "/rest/system/status", timeout=2)
                break
            except Exception:
                time.sleep(0.5)
        # Drop the stock ~/Sync folder Syncthing auto-creates on first run.
        try:
            rest("DELETE", "/rest/config/folders/default")
        except Exception:
            pass
    return result


def _remote_devices():
    devices = rest("GET", "/rest/config/devices") or []
    return [d for d in devices if isinstance(d, dict) and d.get("deviceID")]


# Safety net for a two-way sync: deletions and bad overwrites land in the
# folder's trash for two weeks instead of vanishing from both consoles.
FOLDER_VERSIONING = {"type": "trashcan", "params": {"cleanoutDays": "14"}, "cleanupIntervalS": 3600}

# Per-preset ignore patterns (written as .stignore into the folder root).
FOLDER_IGNORES = {
    "nebel-pcsx2": ["logs/"],
}


def _write_ignores(preset_id, path):
    patterns = FOLDER_IGNORES.get(preset_id)
    if not patterns:
        return
    try:
        path.mkdir(parents=True, exist_ok=True)
        stignore = path / ".stignore"
        existing = stignore.read_text(encoding="utf-8", errors="replace").splitlines() if stignore.exists() else []
        merged = existing + [p for p in patterns if p not in existing]
        stignore.write_text("\n".join(merged) + "\n", encoding="utf-8")
    except OSError:
        pass


def _folder_entry(preset_id):
    label, rel = PRESET_FOLDERS[preset_id]
    path = HOME / rel
    _write_ignores(preset_id, path)
    return {
        "id": preset_id,
        "label": label,
        "path": str(path),
        "type": "sendreceive",
        "devices": [{"deviceID": d["deviceID"]} for d in _remote_devices()],
        "ignorePerms": True,
        "fsWatcherEnabled": True,
        "rescanIntervalS": 3600,
        "versioning": FOLDER_VERSIONING,
        "paused": False,
    }


def sync_state():
    state = {
        "installed": installed(),
        "serviceEnabled": False,
        "serviceActive": False,
        "configReady": bool(api_key()),
        "myId": "",
        "devices": [],
        "folders": [],
        "pendingDevices": [],
        "pendingFolders": [],
        "error": "",
    }
    try:
        svc = service_state()
        state["serviceEnabled"] = bool(svc.get("enabled"))
        state["serviceActive"] = bool(svc.get("active"))
    except Exception as exc:
        state["error"] = str(exc)
        return state
    if not state["serviceActive"]:
        return state
    try:
        status = rest("GET", "/rest/system/status") or {}
        state["myId"] = str(status.get("myID", ""))
        connections = (rest("GET", "/rest/system/connections") or {}).get("connections", {})
        devices = []
        for dev in _remote_devices():
            dev_id = dev["deviceID"]
            devices.append({
                "id": dev_id,
                "name": dev.get("name") or dev_id[:7],
                "connected": bool(connections.get(dev_id, {}).get("connected")),
            })
        state["devices"] = devices
        existing = {f.get("id"): f for f in (rest("GET", "/rest/config/folders") or [])}
        folders = []
        for preset_id, (label, rel) in PRESET_FOLDERS.items():
            current = existing.get(preset_id)
            folders.append({
                "id": preset_id,
                "label": label,
                "path": str(HOME / rel),
                "enabled": current is not None,
                "pathExists": (HOME / rel).exists(),
                "sharedWith": [d.get("deviceID", "")[:7] for d in current.get("devices", [])] if current else [],
                "custom": False,
            })
        # User-added folders (skip Syncthing's own "default" folder).
        for folder_id, current in existing.items():
            if folder_id in PRESET_FOLDERS or folder_id == "default":
                continue
            folders.append({
                "id": folder_id,
                "label": current.get("label") or folder_id,
                "path": str(current.get("path", "")),
                "enabled": True,
                "pathExists": True,
                "sharedWith": [d.get("deviceID", "")[:7] for d in current.get("devices", [])],
                "custom": True,
            })
        state["folders"] = folders
        for folder in state["folders"]:
            if not folder["enabled"]:
                continue
            try:
                db = rest("GET", f"/rest/db/status?folder={folder['id']}") or {}
                folder["syncState"] = str(db.get("state", ""))
            except Exception:
                folder["syncState"] = ""
        pending_devices = rest("GET", "/rest/cluster/pending/devices") or {}
        state["pendingDevices"] = [
            {"id": dev_id, "name": str(info.get("name") or dev_id[:7])}
            for dev_id, info in pending_devices.items()
        ]
        pending_folders = rest("GET", "/rest/cluster/pending/folders") or {}
        offers = {}
        for folder_id, info in pending_folders.items():
            for dev_id, offer in (info.get("offeredBy") or {}).items():
                offers.setdefault(folder_id, {"id": folder_id, "label": str(offer.get("label") or folder_id), "offeredBy": []})
                offers[folder_id]["offeredBy"].append(dev_id)
        state["pendingFolders"] = list(offers.values())
    except Exception as exc:
        state["error"] = str(exc)
    return state


def _validate_device_id(device_id):
    cleaned = str(device_id).strip().upper().replace(" ", "")
    parts = [p for p in cleaned.split("-") if p]
    if not parts or any(len(p) > 8 or not p.isalnum() for p in parts):
        raise ValueError("invalid device id")
    return "-".join(parts)


def discovered_devices():
    """Unpaired devices visible via Syncthing's LAN discovery.

    Returns short id + IPs so the UI can offer tap-to-pair instead of
    typing the full device id. The remote side still gets the usual
    pending-device prompt to confirm.
    """
    try:
        found = rest("GET", "/rest/system/discovery", timeout=4) or {}
    except Exception:
        return []
    if not isinstance(found, dict):
        return []
    known = {d["deviceID"] for d in _remote_devices()}
    out = []
    for dev_id, info in found.items():
        if not isinstance(dev_id, str) or dev_id in known:
            continue
        addresses = info.get("addresses") if isinstance(info, dict) else None
        ips = sorted({
            m.group(1)
            for addr in (addresses or []) if isinstance(addr, str)
            for m in [re.match(r"\w+://(\[[0-9a-fA-F:]+\]|[0-9.]+)", addr)]
            if m
        })
        out.append({"deviceID": dev_id, "short": dev_id[:7], "addresses": ips})
    return out


def add_device(device_id, name):
    dev_id = _validate_device_id(device_id)
    existing = {d["deviceID"] for d in _remote_devices()}
    if dev_id not in existing:
        rest("POST", "/rest/config/devices", {"deviceID": dev_id, "name": str(name).strip() or dev_id[:7]})
    # Share all already-enabled preset folders with the new device.
    for folder in rest("GET", "/rest/config/folders") or []:
        if folder.get("id") not in PRESET_FOLDERS:
            continue
        devices = folder.get("devices", [])
        if all(d.get("deviceID") != dev_id for d in devices):
            devices.append({"deviceID": dev_id})
            folder["devices"] = devices
            rest("PUT", f"/rest/config/folders/{folder['id']}", folder)
    return sync_state()


def remove_device(device_id):
    dev_id = str(device_id).strip()
    for folder in rest("GET", "/rest/config/folders") or []:
        devices = [d for d in folder.get("devices", []) if d.get("deviceID") != dev_id]
        if len(devices) != len(folder.get("devices", [])):
            folder["devices"] = devices
            rest("PUT", f"/rest/config/folders/{folder['id']}", folder)
    rest("DELETE", f"/rest/config/devices/{dev_id}")
    return sync_state()


def set_folder_enabled(preset_id, enabled):
    if preset_id not in PRESET_FOLDERS:
        raise ValueError("unknown preset folder")
    if enabled:
        existing = {f.get("id") for f in (rest("GET", "/rest/config/folders") or [])}
        if preset_id not in existing:
            rest("POST", "/rest/config/folders", _folder_entry(preset_id))
    else:
        rest("DELETE", f"/rest/config/folders/{preset_id}")
    return sync_state()


ALLOWED_CUSTOM_ROOTS = (HOME, Path("/run/media"))


def _validate_custom_path(path):
    raw = str(path).strip()
    if raw.startswith("~"):
        raw = str(HOME) + raw[1:]
    resolved = Path(raw).resolve()
    if not any(resolved == root or root in resolved.parents for root in ALLOWED_CUSTOM_ROOTS):
        raise ValueError("path must be under the home directory or /run/media")
    return resolved


def add_custom_folder(path, label):
    resolved = _validate_custom_path(path)
    resolved.mkdir(parents=True, exist_ok=True)
    existing = {f.get("id") for f in (rest("GET", "/rest/config/folders") or [])}
    folder_id = "custom-" + re.sub(r"[^a-z0-9]+", "-", resolved.name.lower()).strip("-")
    if not folder_id or folder_id == "custom-":
        folder_id = "custom-folder"
    suffix = 2
    candidate = folder_id
    while candidate in existing or candidate in PRESET_FOLDERS:
        candidate = f"{folder_id}-{suffix}"
        suffix += 1
    entry = {
        "id": candidate,
        "label": str(label).strip() or resolved.name,
        "path": str(resolved),
        "type": "sendreceive",
        "devices": [{"deviceID": d["deviceID"]} for d in _remote_devices()],
        "ignorePerms": True,
        "fsWatcherEnabled": True,
        "rescanIntervalS": 3600,
        "versioning": FOLDER_VERSIONING,
        "paused": False,
    }
    rest("POST", "/rest/config/folders", entry)
    return sync_state()


def remove_custom_folder(folder_id):
    folder_id = str(folder_id).strip()
    if folder_id in PRESET_FOLDERS:
        # Presets go through set_folder_enabled so the toggle state stays consistent.
        return set_folder_enabled(folder_id, False)
    rest("DELETE", f"/rest/config/folders/{folder_id}")
    return sync_state()


def dismiss_pending_device(device_id):
    rest("DELETE", f"/rest/cluster/pending/devices/{str(device_id).strip()}")
    return sync_state()


def accept_pending_folder(folder_id):
    """Accept a folder a paired device is offering to share with us.

    Preset ids map to their preset path; anything else becomes a custom
    folder under ~/Sync/<label>.
    """
    folder_id = str(folder_id).strip()
    offers = (rest("GET", "/rest/cluster/pending/folders") or {}).get(folder_id) or {}
    offered_by = list((offers.get("offeredBy") or {}).keys())
    if folder_id in PRESET_FOLDERS:
        return set_folder_enabled(folder_id, True)
    label = None
    for info in (offers.get("offeredBy") or {}).values():
        label = info.get("label")
        if label:
            break
    label = str(label or folder_id)
    path = HOME / "Sync" / label
    path.mkdir(parents=True, exist_ok=True)
    entry = {
        "id": folder_id,
        "label": label,
        "path": str(path),
        "type": "sendreceive",
        "devices": [{"deviceID": d} for d in offered_by] or [{"deviceID": d["deviceID"]} for d in _remote_devices()],
        "ignorePerms": True,
        "fsWatcherEnabled": True,
        "rescanIntervalS": 3600,
        "versioning": FOLDER_VERSIONING,
        "paused": False,
    }
    existing = {f.get("id") for f in (rest("GET", "/rest/config/folders") or [])}
    if folder_id not in existing:
        rest("POST", "/rest/config/folders", entry)
    return sync_state()


def dismiss_pending_folder(folder_id, device_id):
    rest("DELETE", f"/rest/cluster/pending/folders/{str(folder_id).strip()}?device={str(device_id).strip()}")
    return sync_state()
