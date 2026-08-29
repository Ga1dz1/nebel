from .privileged import call


def get_state():
    return call("get_supporter_state")


def set_key(key):
    return call("set_supporter_key", key=str(key))


def clear_key():
    return call("clear_supporter_key")
