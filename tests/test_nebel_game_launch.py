#!/usr/bin/env python3
"""Tests for nebel-game-launch's DXVK/VKD3D override install/rollback.

Builds a fake prefix and fake compat-tool dir tree under a temp dir and
exercises apply_dxvk_override() directly: install, version switch, rollback
to the tool's stock dlls, and cleanup of dlls only the old build carried.
"""
import importlib.machinery
import importlib.util
import json
import os
import pathlib
import tempfile

LAUNCHER = pathlib.Path(__file__).resolve().parent.parent / \
    "system_files/usr/libexec/nebel/nebel-game-launch"

loader = importlib.machinery.SourceFileLoader("nebel_game_launch", str(LAUNCHER))
spec = importlib.util.spec_from_loader(loader.name, loader)
ngl = importlib.util.module_from_spec(spec)
loader.exec_module(ngl)

DXVK_DLLS = ["d3d9.dll", "d3d10core.dll", "d3d11.dll", "dxgi.dll"]
VKD3D_DLLS = ["d3d12.dll", "d3d12core.dll"]


def make_dlls(root, names, content):
    root.mkdir(parents=True, exist_ok=True)
    for name in names:
        (root / name).write_text(f"{content}:{name}", encoding="utf-8")


def make_prefix(root):
    pfx = root / "pfx"
    (pfx / "drive_c/windows/system32").mkdir(parents=True)
    (pfx / "drive_c/windows/syswow64").mkdir(parents=True)
    return pfx


def make_tool(root):
    """Fake Proton tool with stock dxvk/vkd3d-proton dll dirs."""
    tool = root / "proton-tool"
    for libdir, tag in (("lib64", "stock64"), ("lib", "stock32")):
        make_dlls(tool / "files" / libdir / "wine" / "dxvk", DXVK_DLLS, tag)
        make_dlls(tool / "files" / libdir / "wine" / "vkd3d-proton", VKD3D_DLLS, tag)
    return tool


def make_bundles(root):
    """Fake /usr/share/nebel/{dxvk,vkd3d} build dirs."""
    dxvk_root = root / "share" / "dxvk"
    vkd3d_root = root / "share" / "vkd3d"
    for build in ("dxvk-2.7.1", "dxvk-sarek"):
        for arch in ("x64", "x32"):
            make_dlls(dxvk_root / build / arch, DXVK_DLLS, f"{build}-{arch}")
    # dxvk-sarek also ships ddraw.dll, which stock and 2.7.1 do not
    for arch in ("x64", "x32"):
        make_dlls(dxvk_root / "dxvk-sarek" / arch, ["ddraw.dll"], f"sarek-{arch}")
    for arch in ("x64", "x32"):
        make_dlls(vkd3d_root / "vkd3d-2.10" / arch, VKD3D_DLLS, f"vkd3d-2.10-{arch}")
    return dxvk_root, vkd3d_root


def dest_dll(pfx, arch, name):
    sub = "system32" if arch == "x64" else "syswow64"
    return pfx / "drive_c" / "windows" / sub / name


def dll_text(pfx, arch, name):
    return dest_dll(pfx, arch, name).read_text(encoding="utf-8")


def read_state(pfx):
    path = pfx / ngl.GFX_STATE_NAME
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def main():
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        pfx = make_prefix(root)
        tool = make_tool(root)
        dxvk_root, vkd3d_root = make_bundles(root)
        ngl.GFX_LAYER_ROOT = {"dxvk": dxvk_root, "vkd3d": vkd3d_root}
        os.environ["STEAM_COMPAT_TOOL_PATHS"] = str(tool)

        # stock dir resolution
        stock = ngl.stock_gfx_dirs("dxvk")
        assert stock["x64"] == tool / "files/lib64/wine/dxvk", stock
        assert stock["x32"] == tool / "files/lib/wine/dxvk", stock
        stock_v = ngl.stock_gfx_dirs("vkd3d")
        assert stock_v["x64"] == tool / "files/lib64/wine/vkd3d-proton", stock_v

        # 1) install an override
        ngl.apply_dxvk_override(pfx, {"dxvkVersion": "dxvk-2.7.1",
                                      "vkd3dVersion": "vkd3d-2.10"})
        assert dll_text(pfx, "x64", "d3d11.dll") == "dxvk-2.7.1-x64:d3d11.dll"
        assert dll_text(pfx, "x32", "dxgi.dll") == "dxvk-2.7.1-x32:dxgi.dll"
        assert dll_text(pfx, "x64", "d3d12core.dll") == "vkd3d-2.10-x64:d3d12core.dll"
        assert read_state(pfx) == {"dxvk": "dxvk-2.7.1", "vkd3d": "vkd3d-2.10"}

        # 2) no-op launch keeps state, doesn't touch dlls
        marker = dest_dll(pfx, "x64", "d3d11.dll")
        mtime = marker.stat().st_mtime_ns
        ngl.apply_dxvk_override(pfx, {"dxvkVersion": "dxvk-2.7.1",
                                      "vkd3dVersion": "vkd3d-2.10"})
        assert read_state(pfx) == {"dxvk": "dxvk-2.7.1", "vkd3d": "vkd3d-2.10"}
        assert marker.stat().st_mtime_ns == mtime

        # 3) version switch copies the new build over, extra dll appears
        ngl.apply_dxvk_override(pfx, {"dxvkVersion": "dxvk-sarek"})
        assert dll_text(pfx, "x64", "d3d11.dll") == "dxvk-sarek-x64:d3d11.dll"
        assert dll_text(pfx, "x64", "ddraw.dll") == "sarek-x64:ddraw.dll"
        assert read_state(pfx) == {"dxvk": "dxvk-sarek"}

        # 4) back to default: stock dlls restored, sarek-only dll removed
        ngl.apply_dxvk_override(pfx, {})
        assert dll_text(pfx, "x64", "d3d11.dll") == "stock64:d3d11.dll"
        assert dll_text(pfx, "x32", "d3d11.dll") == "stock32:d3d11.dll"
        assert not dest_dll(pfx, "x64", "ddraw.dll").exists()
        assert read_state(pfx) == {}
        assert not (pfx / ngl.GFX_STATE_NAME).exists()

        # 5) missing build id keeps previous state and dlls untouched
        ngl.apply_dxvk_override(pfx, {"vkd3dVersion": "vkd3d-2.10"})
        ngl.apply_dxvk_override(pfx, {"vkd3dVersion": "vkd3d-does-not-exist"})
        assert dll_text(pfx, "x64", "d3d12.dll") == "vkd3d-2.10-x64:d3d12.dll"
        assert read_state(pfx) == {"vkd3d": "vkd3d-2.10"}

        # 6) no stock dirs -> override stays in place, state kept
        del os.environ["STEAM_COMPAT_TOOL_PATHS"]
        ngl.apply_dxvk_override(pfx, {})
        assert dll_text(pfx, "x64", "d3d12.dll") == "vkd3d-2.10-x64:d3d12.dll"
        assert read_state(pfx) == {"vkd3d": "vkd3d-2.10"}

    print("test_nebel_game_launch: all checks passed")


if __name__ == "__main__":
    main()
