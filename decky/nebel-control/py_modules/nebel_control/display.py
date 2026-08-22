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
        "connector": config.get("connector", ""),
        "width": config.get("width", 0),
        "height": config.get("height", 0),
        "orientation": config.get("orientation") or "normal",
        "remembered": remembered if isinstance(remembered, dict) else {},
    }


def set_display_config(use_external, connector, width, height, orientation):
    if orientation not in ORIENTATIONS:
        orientation = "normal"
    payload = {"useExternal": bool(use_external)}
    if use_external:
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
