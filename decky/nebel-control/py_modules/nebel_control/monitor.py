"""Live system monitor (temps/fan/battery) + global MangoHud overlay toggle."""
import glob
from pathlib import Path

THERMAL_GLOB = "/sys/class/thermal/thermal_zone*"
HWMON_GLOB = "/sys/class/hwmon/hwmon*"
BATTERY = Path("/sys/class/power_supply/battery")
# systemd --user reads environment.d at manager start, so the gamescope
# session (and every game under it) picks MANGOHUD=1 up after a reboot.
OVERLAY_ENV_FILE = Path("/etc/environment.d/90-nebel-mangohud.conf")


def _read(path):
    try:
        return Path(path).read_text().strip()
    except OSError:
        return ""


def _temp_group(prefixes):
    best = None
    for zone in glob.glob(THERMAL_GLOB):
        ztype = _read(f"{zone}/type")
        if not any(ztype.startswith(prefix) for prefix in prefixes):
            continue
        raw = _read(f"{zone}/temp")
        if raw.lstrip("-").isdigit():
            value = int(raw) / 1000.0
            # Absent thermal sensors read out as deep negatives (e.g. -40 C).
            if value < -20:
                continue
            if best is None or value > best:
                best = value
    return best


def _fan_pct():
    for hwmon in glob.glob(HWMON_GLOB):
        if _read(f"{hwmon}/name") == "pwmfan":
            raw = _read(f"{hwmon}/pwm1")
            if raw.isdigit():
                return round(int(raw) / 255 * 100)
    return None


def overlay_enabled():
    return OVERLAY_ENV_FILE.exists()


def set_overlay_enabled(enabled):
    if enabled:
        OVERLAY_ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
        OVERLAY_ENV_FILE.write_text("MANGOHUD=1\n", encoding="utf-8")
    else:
        OVERLAY_ENV_FILE.unlink(missing_ok=True)
    return overlay_enabled()


def system_monitor():
    watts = None
    current = _read(BATTERY / "current_now")
    voltage = _read(BATTERY / "voltage_now")
    if current.lstrip("-").isdigit() and voltage.isdigit():
        watts = round(abs(int(current)) * int(voltage) / 1e12, 1)
    capacity = _read(BATTERY / "capacity")
    return {
        "cpuTemp": _temp_group(("cpu", "cluster")),
        "gpuTemp": _temp_group(("gpu",)),
        "skinTemp": _temp_group(("skin",)),
        "fanPct": _fan_pct(),
        "batteryPct": int(capacity) if capacity.isdigit() else None,
        "batteryStatus": _read(BATTERY / "status") or "Unknown",
        "batteryWatts": watts,
        "overlayEnabled": overlay_enabled(),
    }
