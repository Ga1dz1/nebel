from .privileged import call

ORIENTATIONS = ("normal", "left", "right", "upsidedown")


def display_state():
    listing = call("list_displays")
    config = call("get_display_config")
    connectors = listing.get("connectors") or []
    remembered = config.get("remembered")
    return {
        "connectors": connectors,
        "primaryConnector": listing.get("primaryConnector", ""),
        "useExternal": bool(config.get("useExternal")),
        "mode": config.get("mode") or ("external" if config.get("useExternal") else "internal"),
        "autoDuo": bool(config.get("autoDuo", True)),
        "connector": config.get("connector", ""),
        "width": config.get("width", 0),
        "height": config.get("height", 0),
        "orientation": config.get("orientation") or "normal",
        "remembered": remembered if isinstance(remembered, dict) else {},
        "internalTouchpad": int(call("get_internal_touchpad").get("mode", 0)),
    }


def set_display_config(use_external, connector, width, height, orientation, mode=None, auto_duo=None):
    if orientation not in ORIENTATIONS:
        orientation = "normal"
    payload = {"useExternal": bool(use_external)}
    if mode is not None:
        payload["mode"] = str(mode)
    if auto_duo is not None:
        payload["autoDuo"] = bool(auto_duo)
    effective_mode = payload.get("mode") or ("external" if use_external else "internal")
    if effective_mode == "external":
        payload.update(
            {
                "connector": str(connector or ""),
                "width": int(width or 0),
                "height": int(height or 0),
                "orientation": orientation,
            }
        )
    call("set_display_config", **payload)
    return display_state()


def restart_gamescope_session():
    call("restart_gamescope_session")
    return {"ok": True}


def set_internal_touchpad(mode):
    result = call("set_internal_touchpad", mode=int(mode))
    return int(result.get("mode", 0))
