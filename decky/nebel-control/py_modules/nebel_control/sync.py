"""Syncthing integration: service control, pairing and preset folders.

Talks to Syncthing's REST API on 127.0.0.1:8384 using the API key from the
user's config.xml. Service enable/start goes through the privileged helper
because the unit is a *user* service of the armada account.
"""

import shutil
import subprocess
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
import json
from pathlib import Path

from .privileged import call
from .system import run_cmd

HOME = Path("/var/home/armada")
CONFIG_XML = HOME / ".config" / "syncthing" / "config.xml"
API_BASE = "http://127.0.0.1:8384"

# Preset folders the user can toggle. Paths are relative to the armada home.
# Steam games themselves stay on Steam Cloud; these cover everything else.
PRESET_FOLDERS = {
    "nebel-decky-settings": ("Decky Settings", "homebrew/settings"),
    "nebel-heroic": ("Heroic (settings & games)", ".config/heroic"),
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


def api_key():
    try:
        root = ET.parse(CONFIG_XML).getroot()
        gui = root.find("gui")
        key = gui.findtext("apikey") if gui is not None else None
        return key or ""
    except (OSError, ET.ParseError):
        return ""


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
    base = ["/usr/bin/systemctl", "--machine=armada@", "--user"]
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
    return result


def _remote_devices():
    devices = rest("GET", "/rest/config/devices") or []
    return [d for d in devices if isinstance(d, dict) and d.get("deviceID")]


def _folder_entry(preset_id):
    label, rel = PRESET_FOLDERS[preset_id]
    return {
        "id": preset_id,
        "label": label,
        "path": str(HOME / rel),
        "type": "sendreceive",
        "devices": [{"deviceID": d["deviceID"]} for d in _remote_devices()],
        "ignorePerms": True,
        "fsWatcherEnabled": True,
        "rescanIntervalS": 3600,
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
            })
        state["folders"] = folders
    except Exception as exc:
        state["error"] = str(exc)
    return state


def _validate_device_id(device_id):
    cleaned = str(device_id).strip().upper().replace(" ", "")
    parts = [p for p in cleaned.split("-") if p]
    if not parts or any(len(p) > 8 or not p.isalnum() for p in parts):
        raise ValueError("invalid device id")
    return "-".join(parts)


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
