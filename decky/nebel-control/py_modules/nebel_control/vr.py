"""VR / cinema / scheduler-tuning state for nebel-control (1.4.4).

- WiVRn runs as a *user* service (wivrn.service, shipped by the wivrn rpm);
  the plugin backend runs as the session user, so plain systemctl --user is
  enough and the enabled state survives OTA in ~/.config/systemd/user.
- scx_lavd is a *system* service (nebel-scx.service) toggled through the
  privileged control socket, mirroring set_ssh_enabled.
"""

import shutil
import subprocess

from .privileged import call

WIVRN_USER_UNIT = "wivrn.service"
SCX_SYSTEM_UNIT = "nebel-scx.service"


def _run(cmd, timeout=15):
    try:
        proc = subprocess.run(
            cmd,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=timeout,
        )
        return proc
    except (OSError, subprocess.SubprocessError):
        return None


def _uid_of(user="nebel"):
    proc = _run(["/usr/bin/id", "-u", user])
    if proc is None:
        return ""
    return proc.stdout.strip()


def _user_systemctl(*args, user="nebel"):
    # The decky backend runs as root; wivrn is a *user* unit of the gaming
    # session. Drive it through runuser with the session bus address wired
    # up, otherwise systemctl --user would talk to root's (empty) manager.
    uid = _uid_of(user)
    if not uid:
        return None
    return _run(
        [
            "/usr/bin/runuser",
            "-u", user, "--",
            "/usr/bin/env", f"XDG_RUNTIME_DIR=/run/user/{uid}",
            "DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/{0}/bus".format(uid),
            "/usr/bin/systemctl", "--user", *args,
        ],
        timeout=30,
    )


def _unit_state(scope_args, unit, user=None):
    """Return (enabled, active) for a systemd unit; ('','') when unknown."""
    enabled = active = ""
    if user is not None:
        proc = _user_systemctl("is-enabled", unit, user=user)
    else:
        proc = _run(["/usr/bin/systemctl", *scope_args, "is-enabled", unit])
    if proc is not None:
        enabled = proc.stdout.strip()
    if user is not None:
        proc = _user_systemctl("is-active", unit, user=user)
    else:
        proc = _run(["/usr/bin/systemctl", *scope_args, "is-active", unit])
    if proc is not None:
        active = proc.stdout.strip()
    return enabled, active


def vr_state():
    installed = shutil.which("wivrn-server") is not None
    enabled, active = _unit_state([], WIVRN_USER_UNIT, user="nebel")
    return {
        "installed": installed,
        "enabled": enabled == "enabled",
        "active": active == "active",
        "dashboard": shutil.which("wivrn-dashboard") is not None,
    }


def set_vr_enabled(enabled):
    enabled = bool(enabled)
    action = "enable" if enabled else "disable"
    proc = _user_systemctl(action, "--now", WIVRN_USER_UNIT)
    state = vr_state()
    if proc is None or proc.returncode != 0:
        state["error"] = "systemctl failed"
    return state


def scx_state():
    available = shutil.which("scx_lavd") is not None
    try:
        result = call("get_scx_enabled")
        return {
            "available": available,
            "enabled": bool(result.get("enabled")),
            "active": bool(result.get("active")),
        }
    except Exception:
        enabled, active = _unit_state([], SCX_SYSTEM_UNIT)
        return {
            "available": available,
            "enabled": enabled == "enabled",
            "active": active == "active",
        }


def set_scx_enabled(enabled):
    result = call("set_scx_enabled", enabled=bool(enabled))
    return {
        "available": shutil.which("scx_lavd") is not None,
        "enabled": bool(result.get("enabled")),
        "active": bool(result.get("active")),
    }
