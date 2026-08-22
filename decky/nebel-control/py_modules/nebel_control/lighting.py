import re
import subprocess

from .privileged import call

STICK_LED_SCRIPT = "/usr/libexec/nebel/stick-led-color"
STICK_SIDES = ("l", "r")
STICK_LED_MODES = {"static", "breathing", "rainbow", "spin", "reactive", "multidot", "ambilight", "duotone", "wave", "starlight"}
STICK_LED_COLOR_SOURCES = {"static", "battery", "random", "shimmer"}
STICK_LED_PARAMS = ("speed", "intensity", "size")
FLASH_BUTTONS = (
    "south", "east", "north", "west",
    "l1", "r1", "l3", "r3", "l4", "r4",
    "start", "select",
    "dpad_up", "dpad_down", "dpad_left", "dpad_right",
    "other",
)
DEFAULT_COLOR = "0050FF"
DEFAULT_MODE = "static"
DEFAULT_COLOR_SOURCE = "static"
DEFAULT_CHARGING_INDICATOR = True
DEFAULT_SCREEN_LINK = False
DEFAULT_DUOTONE_COLOR_A = "0050FF"
DEFAULT_DUOTONE_COLOR_B = "FFD700"
DEFAULT_DUOTONE_ORIENTATION = "horizontal"
DUOTONE_ORIENTATIONS = ("horizontal", "vertical", "diagonal")


def stick_led_supported():
    from pathlib import Path

    return Path("/sys/class/leds/l:r1").exists()


def _default_side_state():
    return {
        "mode": DEFAULT_MODE,
        "color": DEFAULT_COLOR,
        "colorSource": DEFAULT_COLOR_SOURCE,
        "chargingIndicator": DEFAULT_CHARGING_INDICATOR,
        "duotoneColorA": DEFAULT_DUOTONE_COLOR_A,
        "duotoneColorB": DEFAULT_DUOTONE_COLOR_B,
        "duotoneOrientation": DEFAULT_DUOTONE_ORIENTATION,
        "chase": False,
        "compass": False,
        "seesaw": False,
        "flip": False,
        "params": {},
    }


def _default_state(supported):
    return {
        "supported": supported,
        "screenLink": DEFAULT_SCREEN_LINK,
        "enabled": True,
        "maxBrightness": 1.0,
        "notifyEnabled": True,
        "notifyColor": "33AAFF",
        "sides": {"l": _default_side_state(), "r": _default_side_state()},
        "flashColors": {},
    }


def _coerce_side(raw):
    raw = raw or {}
    return {
        "mode": raw.get("mode") if raw.get("mode") in STICK_LED_MODES else DEFAULT_MODE,
        "color": str(raw.get("color") or DEFAULT_COLOR),
        "colorSource": raw.get("colorSource") if raw.get("colorSource") in STICK_LED_COLOR_SOURCES else DEFAULT_COLOR_SOURCE,
        "chargingIndicator": bool(raw.get("chargingIndicator", DEFAULT_CHARGING_INDICATOR)),
        "duotoneColorA": str(raw.get("duotoneColorA") or DEFAULT_DUOTONE_COLOR_A),
        "duotoneColorB": str(raw.get("duotoneColorB") or DEFAULT_DUOTONE_COLOR_B),
        "duotoneOrientation": raw.get("duotoneOrientation") if raw.get("duotoneOrientation") in DUOTONE_ORIENTATIONS else DEFAULT_DUOTONE_ORIENTATION,
        "chase": bool(raw.get("chase", False)),
        "compass": bool(raw.get("compass", False)),
        "seesaw": bool(raw.get("seesaw", False)),
        "flip": bool(raw.get("flip", False)),
        "params": {k: float(v) for k, v in dict(raw.get("params") or {}).items()},
    }


def _parse_cli_output(out):
    sides = {"l": _default_side_state(), "r": _default_side_state()}
    screen_link = DEFAULT_SCREEN_LINK
    enabled = True
    max_brightness = 1.0
    notify_enabled = True
    notify_color = "33AAFF"
    flash_colors = {}
    for line in out.splitlines():
        key, sep, value = line.partition("=")
        if not sep:
            continue
        key, value = key.strip(), value.strip()
        if key == "screen_link":
            screen_link = value == "1"
            continue
        if key == "enabled":
            enabled = value == "1"
            continue
        if key == "max_brightness":
            try:
                max_brightness = max(0.0, min(1.0, float(value)))
            except ValueError:
                pass
            continue
        if key == "notify_enabled":
            notify_enabled = value == "1"
            continue
        if key == "notify_color" and re.fullmatch(r"[0-9A-Fa-f]{6}", value or ""):
            notify_color = value.upper()
            continue
        if key.startswith("flash_") and key[len("flash_"):] in FLASH_BUTTONS:
            if re.fullmatch(r"[0-9A-Fa-f]{6}", value or ""):
                flash_colors[key[len("flash_"):]] = value.upper()
            continue
        if key.endswith("_l"):
            side, base = "l", key[:-2]
        elif key.endswith("_r"):
            side, base = "r", key[:-2]
        else:
            continue
        s = sides[side]
        if base == "mode" and value in STICK_LED_MODES:
            s["mode"] = value
        elif base == "color" and re.fullmatch(r"[0-9A-Fa-f]{6}", value or ""):
            s["color"] = value
        elif base == "color_source" and value in STICK_LED_COLOR_SOURCES:
            s["colorSource"] = value
        elif base == "charging_indicator":
            s["chargingIndicator"] = value == "1"
        elif base == "duotone_color_a" and re.fullmatch(r"[0-9A-Fa-f]{6}", value or ""):
            s["duotoneColorA"] = value.upper()
        elif base == "duotone_color_b" and re.fullmatch(r"[0-9A-Fa-f]{6}", value or ""):
            s["duotoneColorB"] = value.upper()
        elif base == "duotone_orientation" and value in DUOTONE_ORIENTATIONS:
            s["duotoneOrientation"] = value
        elif base == "chase":
            s["chase"] = value == "1"
        elif base == "compass":
            s["compass"] = value == "1"
        elif base == "seesaw":
            s["seesaw"] = value == "1"
        elif base == "flip":
            s["flip"] = value == "1"
        elif "_" in base and base.split("_", 1)[0] in STICK_LED_PARAMS:
            try:
                s["params"][base] = float(value)
            except ValueError:
                pass
    return {
        "supported": True,
        "screenLink": screen_link,
        "enabled": enabled,
        "maxBrightness": max_brightness,
        "notifyEnabled": notify_enabled,
        "notifyColor": notify_color,
        "sides": sides,
        "flashColors": flash_colors,
    }


def stick_led_state():
    if not stick_led_supported():
        return _default_state(False)
    try:
        result = call("get_stick_led")
        return {
            "supported": True,
            "screenLink": bool(result.get("screenLink")),
            "enabled": bool(result.get("enabled", True)),
            "maxBrightness": max(0.0, min(1.0, float(result.get("maxBrightness", 1.0)))),
            "notifyEnabled": bool(result.get("notifyEnabled", True)),
            "notifyColor": str(result.get("notifyColor") or "33AAFF"),
            "sides": {side: _coerce_side((result.get("sides") or {}).get(side)) for side in STICK_SIDES},
            "flashColors": {k: str(v) for k, v in dict(result.get("flashColors") or {}).items()},
        }
    except Exception:
        try:
            out = subprocess.check_output([STICK_LED_SCRIPT, "get"], text=True, timeout=5)
        except (OSError, subprocess.SubprocessError):
            return _default_state(True)
        return _parse_cli_output(out)


def set_stick_led_color(side, value):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    value = str(value).lstrip("#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError("invalid color")
    call("set_stick_led_color", side=side, value=value.upper())
    return stick_led_state()


def set_stick_led_mode(side, mode):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    if mode not in STICK_LED_MODES:
        raise ValueError("invalid stick led mode")
    call("set_stick_led_mode", side=side, mode=mode)
    return stick_led_state()


def set_stick_led_screen_link(enabled):
    call("set_stick_led_screen_link", enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_enabled(enabled):
    call("set_stick_led_enabled", enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_max_brightness(value):
    call("set_stick_led_max_brightness", value=max(0.0, min(1.0, float(value))))
    return stick_led_state()


def set_stick_led_param(side, param, mode, value):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    if param not in STICK_LED_PARAMS:
        raise ValueError("invalid stick led param")
    call("set_stick_led_param", side=side, param=param, mode=mode, value=float(value))
    return stick_led_state()


def set_stick_led_flash_color(button, value):
    if button not in FLASH_BUTTONS:
        raise ValueError("invalid flash button")
    value = str(value).lstrip("#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError("invalid color")
    call("set_stick_led_flash_color", button=button, value=value.upper())
    return stick_led_state()


def set_stick_led_duotone_color(side, slot, value):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    if slot not in ("a", "b"):
        raise ValueError("invalid duotone color slot")
    value = str(value).lstrip("#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError("invalid color")
    call("set_stick_led_duotone_color", side=side, slot=slot, value=value.upper())
    return stick_led_state()


def set_stick_led_duotone_orientation(side, orientation):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    if orientation not in DUOTONE_ORIENTATIONS:
        raise ValueError("invalid duotone orientation")
    call("set_stick_led_duotone_orientation", side=side, orientation=orientation)
    return stick_led_state()


def set_stick_led_color_source(side, source):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    if source not in STICK_LED_COLOR_SOURCES:
        raise ValueError("invalid stick led color source")
    call("set_stick_led_color_source", side=side, source=source)
    return stick_led_state()


def set_stick_led_charging_indicator(side, enabled):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    call("set_stick_led_charging_indicator", side=side, enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_chase(side, enabled):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    call("set_stick_led_chase", side=side, enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_compass(side, enabled):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    call("set_stick_led_compass", side=side, enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_seesaw(side, enabled):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    call("set_stick_led_seesaw", side=side, enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_flip(side, enabled):
    if side not in STICK_SIDES:
        raise ValueError("invalid stick side")
    call("set_stick_led_flip", side=side, enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_notify(enabled):
    call("set_stick_led_notify", enabled=bool(enabled))
    return stick_led_state()


def set_stick_led_notify_color(value):
    value = str(value).lstrip("#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError("invalid color")
    call("set_stick_led_notify_color", value=value.upper())
    return stick_led_state()
