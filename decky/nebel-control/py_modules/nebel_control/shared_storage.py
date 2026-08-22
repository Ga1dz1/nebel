import re
from pathlib import Path

CONFIG = Path("/etc/nebel/shared-storage.conf")
SETUP = "/usr/libexec/nebel/shared-storage-setup"


def shared_storage_enabled():
    """Return whether the shared storage mount is currently enabled.

    Missing config defaults to enabled so the partition is used automatically
    once it exists. Only an explicit `enabled=0` disables it.
    """
    if not CONFIG.exists():
        return True
    try:
        text = CONFIG.read_text(encoding="utf-8")
    except OSError:
        return True
    return not bool(re.search(r"^enabled\s*=\s*0\s*$", text, re.MULTILINE))


def set_shared_storage_enabled(enabled):
    """Toggle the shared-storage mount and return the new state."""
    from subprocess import run

    cmd = "enable" if enabled else "disable"
    run(["sudo", SETUP, cmd], check=False)
    return shared_storage_enabled()
