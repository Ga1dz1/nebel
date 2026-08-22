import copy
import fcntl
import json
import struct
import subprocess
import time
from pathlib import Path

from .privileged import call
from .system import read_text

INPUT_CALIBRATION_CONFIG = Path("/etc/nebel/input-calibration.json")
# Each supported gamepad driver exposes the same calibration parameter ABI
# (axis_*/trigger_* module params, see CALIBRATION_PARAMS) under its own
# /sys/module/<name>/parameters - only one of these will exist on any given
# device. "match" checks the resolved input event's phys/name so we don't
# depend on module load order.
CONTROLLER_DRIVERS = (
    {
        "module": "rsinput",
        "match": lambda event: "rsinput-gamepad" in event["phys"] or "rsinput" in event["name"].casefold(),
    },
    {
        "module": "retroid",
        "match": lambda event: "retroid-pocket-gamepad" in event["phys"] or "retroid pocket gamepad" in event["name"].casefold(),
        # This driver (drivers/input/joystick/retroid.c) registers ABS_Z/
        # ABS_RZ - same as rsinput's trigger codes below - but never actually
        # updates them (input_report_abs is only ever called for
        # ABS_HAT2X/ABS_HAT2Y). EVIOCGABS on the dead codes still succeeds
        # (just always returns 0), so nothing here fails loudly - it just
        # reads as a frozen trigger bar. Confirmed live on a Retroid Pocket
        # Mini V2: stick calibration worked, triggers never moved, until
        # this override was added.
        "trigger_codes": {"left_trigger": 0x14, "right_trigger": 0x15},  # ABS_HAT2X, ABS_HAT2Y
    },
)
INPUTPLUMBER_INTERCEPT = Path("/usr/libexec/nebel/inputplumber-intercept")
INPUTPLUMBER_SERVICE = "org.shadowblip.InputPlumber"
INPUTPLUMBER_COMPOSITE_IFACE = "org.shadowblip.Input.CompositeDevice"
ABS_CODES = {
    "left_x": 0,
    "left_y": 1,
    "left_trigger": 2,   # ABS_Z - overridden per-driver above where wrong
    "right_x": 3,
    "right_y": 4,
    "right_trigger": 5,  # ABS_RZ - overridden per-driver above where wrong
    "gas": 9,
    "brake": 10,
}
CALIBRATION_PARAMS = (
    "axis_leftx_min",
    "axis_leftx_center",
    "axis_leftx_max",
    "axis_leftx_deadzone",
    "axis_leftx_antideadzone",
    "axis_lefty_min",
    "axis_lefty_center",
    "axis_lefty_max",
    "axis_lefty_deadzone",
    "axis_lefty_antideadzone",
    "axis_rightx_min",
    "axis_rightx_center",
    "axis_rightx_max",
    "axis_rightx_deadzone",
    "axis_rightx_antideadzone",
    "axis_righty_min",
    "axis_righty_center",
    "axis_righty_max",
    "axis_righty_deadzone",
    "axis_righty_antideadzone",
    "trigger_left_max",
    "trigger_left_deadzone",
    "trigger_left_antideadzone",
    "trigger_right_max",
    "trigger_right_deadzone",
    "trigger_right_antideadzone",
)
_inputplumber_events_cache = {"time": 0, "events": []}
_calibration_session_token = None
_session_device = None
_session_fd = None


def input_events():
    events = []
    for event in sorted(Path("/sys/class/input").glob("event*")):
        name = read_text(event / "device/name")
        phys = read_text(event / "device/phys")
        dev = Path("/dev/input") / event.name
        if name and dev.exists():
            events.append(input_event_from_path(dev, name=name, phys=phys, source="sysfs"))
    return events


def input_event_from_path(path, name=None, phys=None, source="sysfs"):
    dev = Path(path)
    sysfs = Path("/sys/class/input") / dev.name
    return {
        "event": dev.name,
        "path": str(dev),
        "name": name if name is not None else read_text(sysfs / "device/name"),
        "phys": phys if phys is not None else read_text(sysfs / "device/phys"),
        "source": source,
    }


def busctl_get_property(path, interface, prop):
    try:
        result = subprocess.run(
            ["busctl", "--system", "--json=short", "get-property", INPUTPLUMBER_SERVICE, path, interface, prop],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    try:
        payload = json.loads(result.stdout)
    except ValueError:
        return None
    data = payload.get("data")
    if str(payload.get("type", "")).startswith("a"):
        return data if isinstance(data, list) else []
    if isinstance(data, list):
        return data[0] if len(data) == 1 else data
    return data


def begin_calibration_intercept():
    try:
        call("inputplumber_intercept", mode="overlay")
        return True
    except Exception:
        pass
    try:
        subprocess.run(
            [str(INPUTPLUMBER_INTERCEPT), "overlay"],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def end_calibration_intercept():
    try:
        call("inputplumber_intercept", mode="reset")
        return True
    except Exception:
        pass
    try:
        subprocess.run(
            [str(INPUTPLUMBER_INTERCEPT), "reset"],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
        return True
    except (OSError, subprocess.SubprocessError):
        return False


def inputplumber_source_events():
    now = time.monotonic()
    if now - _inputplumber_events_cache["time"] < 2:
        return copy.deepcopy(_inputplumber_events_cache["events"])

    try:
        result = subprocess.run(
            ["busctl", "--system", "--list", "--no-pager", "--no-legend"],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
    except (OSError, subprocess.SubprocessError):
        _inputplumber_events_cache.update({"time": now, "events": []})
        return []
    if INPUTPLUMBER_SERVICE not in result.stdout:
        _inputplumber_events_cache.update({"time": now, "events": []})
        return []

    try:
        tree = subprocess.run(
            ["busctl", "--system", "tree", INPUTPLUMBER_SERVICE],
            check=True,
            capture_output=True,
            text=True,
            timeout=1,
        )
    except (OSError, subprocess.SubprocessError):
        _inputplumber_events_cache.update({"time": now, "events": []})
        return []

    events = []
    seen = set()
    for line in tree.stdout.splitlines():
        path = line.strip(" │├─└")
        if not path.startswith("/org/shadowblip/InputPlumber/CompositeDevice"):
            continue
        paths = busctl_get_property(path, INPUTPLUMBER_COMPOSITE_IFACE, "SourceDevicePaths")
        if not isinstance(paths, list):
            continue
        for source_path in paths:
            dev = Path(source_path)
            if dev.name in seen or not str(dev).startswith("/dev/input/event") or not dev.exists():
                continue
            event = input_event_from_path(dev, source="inputplumber")
            if event["name"]:
                events.append(event)
                seen.add(dev.name)
    _inputplumber_events_cache.update({"time": now, "events": copy.deepcopy(events)})
    return events


def calibration_event():
    events = inputplumber_source_events()
    if not events:
        events = input_events()
    preferred = (
        lambda event: "rsinput-gamepad" in event["phys"] or "rsinput" in event["name"].casefold(),
        lambda event: "AYANEO Controller" in event["name"],
        lambda event: event["name"] == "Microsoft X-Box 360 pad",
    )
    ignored = ("InputPlumber", "DualSense", "Keyboard", "Touchpad", "Motion Sensors", "Headset")
    for match in preferred:
        for event in events:
            if any(token in event["name"] for token in ignored):
                continue
            if match(event):
                return event
    for event in events:
        if any(token in event["name"] for token in ignored):
            continue
        if "pad" in event["name"].casefold() or "controller" in event["name"].casefold() or "gamepad" in event["name"].casefold():
            return event
    return None


def eviocgabs(code):
    return 0x80184540 + code


def read_abs(fd, code):
    data = fcntl.ioctl(fd, eviocgabs(code), b"\0" * 24)
    if len(data) != 24:
        raise OSError(f"unexpected EVIOCGABS response length for code {code}")
    value, minimum, maximum, fuzz, flat, resolution = struct.unpack("iiiiii", data)
    return {
        "value": value,
        "min": minimum,
        "max": maximum,
        "flat": flat,
        "fuzz": fuzz,
        "resolution": resolution,
    }


def read_controls(fd, event=None):
    controls = {}
    for name, code in ABS_CODES.items():
        try:
            controls[name] = read_abs(fd, code)
        except OSError:
            pass
    if "left_trigger" not in controls and "brake" in controls:
        controls["left_trigger"] = controls["brake"]
    if "right_trigger" not in controls and "gas" in controls:
        controls["right_trigger"] = controls["gas"]
    driver = matched_controller_driver(event)
    for name, code in (driver or {}).get("trigger_codes", {}).items():
        try:
            controls[name] = read_abs(fd, code)
        except OSError:
            pass
    return controls


def build_state(event, controls):
    driver = matched_controller_driver(event)
    can = driver is not None and Path(f"/sys/module/{driver['module']}/parameters").exists()
    return {
        "supported": bool(controls),
        "reason": "" if controls else "Controller has no readable analog controls",
        "controls": controls,
        "event": event,
        "canApply": can,
        "backend": driver["module"] if can else "tester",
    }


def open_session_device():
    # Resolve the controller once per modal session and hold the fd open so each
    # ~50ms poll is a couple of ioctls, not a fresh device-enumeration + open.
    global _session_device, _session_fd
    close_session_device()
    event = calibration_event()
    if not event:
        return None
    try:
        _session_fd = open(event["path"], "rb", buffering=0)
        _session_device = event
    except OSError:
        _session_fd = None
        _session_device = None
    return _session_device


def close_session_device():
    global _session_device, _session_fd
    if _session_fd is not None:
        try:
            _session_fd.close()
        except OSError:
            pass
    _session_fd = None
    _session_device = None


def controller_state():
    if _session_fd is not None and _session_device is not None:
        try:
            return build_state(_session_device, read_controls(_session_fd.fileno(), _session_device))
        except OSError:
            # Node went away (device re-registered); re-resolve once.
            if open_session_device() and _session_fd is not None:
                try:
                    return build_state(_session_device, read_controls(_session_fd.fileno(), _session_device))
                except OSError:
                    close_session_device()
    event = calibration_event()
    if not event:
        return {"supported": False, "reason": "No controller input device found", "controls": {}, "event": None}
    try:
        with open(event["path"], "rb", buffering=0) as f:
            controls = read_controls(f.fileno(), event)
    except OSError as exc:
        return {"supported": False, "reason": str(exc), "controls": {}, "event": event}
    return build_state(event, controls)


def matched_controller_driver(event=None):
    if event is None:
        event = calibration_event()
    if not event:
        return None
    for driver in CONTROLLER_DRIVERS:
        if driver["match"](event):
            return driver
    return None


def calibration_parameters_path(event=None):
    driver = matched_controller_driver(event)
    if driver is None:
        return None
    path = Path(f"/sys/module/{driver['module']}/parameters")
    return path if path.exists() else None


def calibration_can_apply(event=None):
    return calibration_parameters_path(event) is not None


def read_calibration_params():
    params = {}
    parameters = calibration_parameters_path()
    if parameters is None:
        return params
    for name in CALIBRATION_PARAMS:
        text = read_text(parameters / name)
        if text:
            try:
                params[name] = int(text)
            except ValueError:
                pass
    return params


def reset_calibration_params():
    params = {}
    for axis in ("axis_leftx", "axis_lefty", "axis_rightx", "axis_righty"):
        params[f"{axis}_min"] = -1024
        params[f"{axis}_center"] = 0
        params[f"{axis}_max"] = 1024
        params[f"{axis}_deadzone"] = 70
        params[f"{axis}_antideadzone"] = 0
    for trigger in ("trigger_left", "trigger_right"):
        params[f"{trigger}_max"] = 1552
        params[f"{trigger}_deadzone"] = 0
        params[f"{trigger}_antideadzone"] = 0
    call("write_config", name="calibration", text=json.dumps(params, indent=2, sort_keys=True) + "\n")
    return calibration_status()


def calibration_from_capture(capture, current=None):
    current = current or {}

    def axis_params(prefix, x_key, y_key):
        result = {}
        for suffix, key in (("x", x_key), ("y", y_key)):
            values = capture.get(key) or {}
            minimum = int(values.get("min", 0))
            maximum = int(values.get("max", 0))
            center = int(values.get("center", 0))
            negative = min(minimum - center, -1)
            positive = max(maximum - center, 1)
            inner = max(min(abs(negative), abs(positive)), 1)
            deadzone = max(int(inner * 0.07), 20)
            result[f"{prefix}{suffix}_min"] = -inner
            result[f"{prefix}{suffix}_center"] = int(current.get(f"{prefix}{suffix}_center", 0)) - center
            result[f"{prefix}{suffix}_max"] = inner
            result[f"{prefix}{suffix}_deadzone"] = deadzone
            result[f"{prefix}{suffix}_antideadzone"] = 0
        return result
    params = {}
    params.update(axis_params("axis_left", "left_x", "left_y"))
    params.update(axis_params("axis_right", "right_x", "right_y"))
    for name, key in (("trigger_left", "left_trigger"), ("trigger_right", "right_trigger")):
        values = capture.get(key) or {}
        minimum = int(values.get("min", 0))
        maximum = int(values.get("max", 0))
        span = max(maximum - minimum, 1)
        params[f"{name}_max"] = span
        params[f"{name}_deadzone"] = max(int(span * 0.03), 4)
        params[f"{name}_antideadzone"] = 0
    return params


def merge_capture_sample(capture, state):
    merged = copy.deepcopy(capture or {})
    for name, control in state.get("controls", {}).items():
        if name not in merged:
            continue
        value = int(control.get("value", 0))
        merged[name]["min"] = min(int(merged[name].get("min", value)), value)
        merged[name]["max"] = max(int(merged[name].get("max", value)), value)
    return merged


def calibration_status():
    state = controller_state()
    state["saved"] = INPUT_CALIBRATION_CONFIG.exists()
    state["params"] = read_calibration_params()
    known_module_present = any(Path(f"/sys/module/{d['module']}/parameters").exists() for d in CONTROLLER_DRIVERS)
    if not state.get("canApply") and known_module_present:
        state["reason"] = "Live tester only on this device"
    return state


def save_calibration(capture):
    capture = merge_capture_sample(capture, controller_state())
    params = calibration_from_capture(capture, read_calibration_params())
    call("write_config", name="calibration", text=json.dumps(params, indent=2, sort_keys=True) + "\n")
    return calibration_status()


def begin_session(token=None):
    global _calibration_session_token
    _calibration_session_token = str(token or "default")
    open_session_device()
    return begin_calibration_intercept()


def end_session(token=None):
    global _calibration_session_token
    if _calibration_session_token != str(token or "default"):
        return False
    _calibration_session_token = None
    close_session_device()
    return end_calibration_intercept()
