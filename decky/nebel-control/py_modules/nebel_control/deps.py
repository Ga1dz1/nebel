# Per-game runtime dependencies ("Dependencies" tab): installs winetricks
# verbs (d3dx*, d3dcompiler_47, xact, physx, vcrun*, dotnet*, xna40, flash) into the game's Proton
# prefix. winetricks itself is a noarch shell script shipped in the OS image
# (build_files/33-install-winetricks.sh); verb payloads download on demand,
# so an offline console surfaces a readable error instead of hanging.
#
# The plugin backend runs as root (plugin_loader.service), but prefixes live
# in the user's library - the winetricks subprocess is demoted to the nebel
# user so no root-owned files land in a prefix. x86_64 Proton's wine executes
# transparently through the FEX binfmt_misc handler (POCF flags), so the same
# code path serves ARM64 and x86_64-routed games; the game's own Proton is
# preferred, falling back to the bundled default tool.
import os
import pwd
import re
import subprocess
import threading
import time
from pathlib import Path

USER = "nebel"
WINETRICKS = "/usr/bin/winetricks"
VERBS = (
    "d3dx9", "d3dx10", "d3dx11_43", "d3dcompiler_47", "xact", "physx",
    "vcrun2005", "vcrun2008", "vcrun2010", "vcrun2012", "vcrun2013", "vcrun2022",
    "dotnet35", "dotnet40", "dotnet48", "xna40", "flash",
)
VERB_TIMEOUT_S = 30 * 60  # dotnet35 under FEX can take a long while
LOG_TAIL_LINES = 12

_states = {}
_states_lock = threading.Lock()


def _user_info():
    return pwd.getpwnam(USER)


def _steam_root():
    return Path(_user_info().pw_dir) / ".steam" / "steam"


def _read_text(path, limit=512 * 1024):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read(limit)
    except OSError:
        return ""


def _library_folders():
    roots = {_steam_root()}
    for match in re.finditer(r'"path"\s+"([^"]+)"', _read_text(_steam_root() / "config" / "libraryfolders.vdf")):
        roots.add(Path(match.group(1).replace("\\\\", "\\")))
    existing, seen = [], set()
    for root in roots:
        key = str(root)
        if key not in seen and (root / "steamapps").is_dir():
            seen.add(key)
            existing.append(root)
    return existing


def _compatdata(appid):
    for root in _library_folders():
        candidate = root / "steamapps" / "compatdata" / str(appid)
        if (candidate / "pfx").is_dir():
            return candidate
    return None


def _compat_tool_name(appid):
    text = _read_text(_steam_root() / "config" / "config.vdf")
    block_match = re.search(r'"CompatToolMapping"\s*\{', text)
    if not block_match:
        return ""
    depth, end = 0, block_match.end() - 1
    for i in range(block_match.end() - 1, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    block = text[block_match.start():end]
    match = re.search(rf'"{re.escape(str(appid))}"\s*\{{\s*"name"\s+"([^"]+)"', block)
    return match.group(1) if match else ""


def _bundled_tools():
    tools = {}
    for vdf in (_steam_root() / "compatibilitytools.d").glob("*/compatibilitytool.vdf"):
        for match in re.finditer(r'"([^"]+)"\s*\{[^{}]*"install_path"\s+"([^"]+)"',
                                 _read_text(vdf)):
            if Path(match.group(2)).is_dir():
                tools[match.group(1)] = Path(match.group(2))
    return tools


def _tool_kind(text):
    # ("experimental"|"hotfix"|"proton", major|0) from a tool name or a
    # version-file token: proton-cachyos-11.0-arm64, proton_10 and
    # proton-10.0-4b all classify as ("proton", 10/11).
    text = text.lower()
    if "experimental" in text:
        return "experimental", 0
    if "hotfix" in text:
        return "hotfix", 0
    major = re.search(r"(\d+)", text.replace("cachyos", ""))
    return "proton", int(major.group(1)) if major else 0


def _steam_proton_dirs():
    for root in _library_folders():
        common = root / "steamapps" / "common"
        try:
            entries = sorted(common.iterdir())
        except OSError:
            continue
        for entry in entries:
            if (entry / "proton").is_file() and (entry / "files").is_dir():
                token = ""
                version = _read_text(entry / "version", 4096).split()
                if len(version) >= 2:
                    token = version[1].lower()
                yield entry, token


def _tool_dir(tool_name):
    bundled = _bundled_tools()
    if tool_name in bundled:
        return bundled[tool_name]
    want_arm64 = "arm64" in tool_name.lower()
    want_kind, want_major = _tool_kind(tool_name)
    fallback = None
    for path, token in _steam_proton_dirs():
        is_arm64 = (path / "files" / "bin-arm64").is_dir()
        kind, major = _tool_kind(token)
        if is_arm64 and fallback is None:
            fallback = path  # any native ARM64 Proton beats a FEX one for this
        if is_arm64 == want_arm64 and (kind, major) == (want_kind, want_major):
            return path
    for path in bundled.values():
        if (path / "files" / "bin-arm64").is_dir():
            return path  # bundled default ARM64 Proton
    if fallback is not None:
        return fallback
    raise RuntimeError("no-proton")


def _wine_env(tool_dir, compatdata):
    files = tool_dir / "files"
    bin_dir = files / "bin-arm64" if (files / "bin-arm64" / "wine").exists() else files / "bin"
    info = _user_info()
    dll_paths = [str(p) for p in (files / "lib64" / "wine", files / "lib" / "wine") if p.is_dir()]
    lib_paths = [str(p) for p in (files / "lib64", files / "lib") if p.is_dir()]
    env = {
        "HOME": info.pw_dir,
        "USER": USER,
        "LOGNAME": USER,
        "PATH": f"{bin_dir}:/usr/local/bin:/usr/bin:/bin",
        "XDG_RUNTIME_DIR": f"/run/user/{info.pw_uid}",
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "WINE": str(bin_dir / "wine"),
        "WINESERVER": str(bin_dir / "wineserver"),
        "WINEPREFIX": str(compatdata / "pfx"),
        "STEAM_COMPAT_DATA_PATH": str(compatdata),
        "STEAM_COMPAT_CLIENT_INSTALL_PATH": str(_steam_root()),
        # winetricks.log records the installed verbs; wine noise slows FEX down.
        "WINEDEBUG": "-all",
        "WINETRICKS_LATEST_VERSION_CHECK": "disabled",
        "DXVK_HUD": "none",
    }
    if dll_paths:
        env["WINEDLLPATH"] = ":".join(dll_paths)
    if lib_paths:
        env["LD_LIBRARY_PATH"] = ":".join(lib_paths)
    return env


def _demote_fn():
    info = _user_info()
    if os.geteuid() == info.pw_uid:
        return None

    def demote():
        os.initgroups(USER, info.pw_gid)
        os.setgid(info.pw_gid)
        os.setuid(info.pw_uid)

    return demote


def _state(appid):
    return _states.setdefault(str(appid), {
        "busy": False, "currentVerb": "", "pending": [], "error": "", "log": "",
    })


def get_status(appid):
    appid = str(appid)
    compatdata = _compatdata(appid)
    installed = []
    if compatdata:
        installed = [line.strip() for line in _read_text(compatdata / "pfx" / "winetricks.log").splitlines()
                     if line.strip() in VERBS]
    with _states_lock:
        state = dict(_state(appid))
    state["logTail"] = state.pop("log", "")
    state.update({
        "appid": appid,
        "available": Path(WINETRICKS).is_file(),
        "prefixFound": compatdata is not None,
        "installed": installed,
    })
    return state


def _run_verb(appid, verb, compatdata, env):
    log_path = compatdata / ".nebel-deps.log"
    with open(log_path, "ab") as log:
        # The plugin runs as root; the log lives in the user's library, so it
        # must not stay root-owned (same reason the subprocess is demoted).
        info = _user_info()
        if os.geteuid() != info.pw_uid:
            os.fchown(log.fileno(), info.pw_uid, info.pw_gid)
        log.write(f"\n=== {time.strftime('%F %T')} {verb} ===\n".encode())
        proc = subprocess.Popen(
            [WINETRICKS, "-q", "--unattended", verb],
            env=env, stdout=log, stderr=subprocess.STDOUT,
            preexec_fn=_demote_fn(), cwd=env["HOME"],
        )
        try:
            rc = proc.wait(timeout=VERB_TIMEOUT_S)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            return "timeout"
    tail = _read_text(log_path).splitlines()[-LOG_TAIL_LINES:]
    with _states_lock:
        _state(appid)["log"] = "\n".join(tail)
    return rc


def _worker(appid, verbs):
    error = ""
    try:
        compatdata = _compatdata(appid)
        if not compatdata:
            error = "no-prefix"
        else:
            env = _wine_env(_tool_dir(_compat_tool_name(appid)), compatdata)
            for verb in verbs:
                with _states_lock:
                    _state(appid)["currentVerb"] = verb
                rc = _run_verb(appid, verb, compatdata, env)
                if rc != 0:
                    error = "timeout" if rc == "timeout" else "failed"
                    break
    except RuntimeError as exc:
        error = str(exc)
    except Exception:
        error = "failed"
    with _states_lock:
        state = _state(appid)
        state.update({"busy": False, "currentVerb": "", "pending": [], "error": error})


def install_verbs(appid, verbs):
    appid = str(appid)
    verbs = [verb for verb in verbs if verb in VERBS]
    if not verbs:
        raise ValueError("no known verbs requested")
    if not Path(WINETRICKS).is_file():
        raise RuntimeError("unavailable")
    with _states_lock:
        state = _state(appid)
        if state["busy"]:
            raise RuntimeError("busy")
        state.update({"busy": True, "currentVerb": "", "pending": list(verbs), "error": "", "log": ""})
    threading.Thread(target=_worker, args=(appid, verbs), daemon=True).start()
    return get_status(appid)


def get_log_tail(appid):
    with _states_lock:
        return _state(str(appid)).get("log", "")
