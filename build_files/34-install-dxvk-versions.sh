#!/bin/bash
set -euxo pipefail

# Alternative DXVK (D3D9-11) and VKD3D-Proton (D3D12) builds for
# nebel-control's per-game "DXVK version"/"D3D12 (VKD3D) version" pickers;
# nebel-game-launch copies the chosen build's dlls into the game's prefix.
# On Adreno 6xx (Turnip) current DXVK/VKD3D releases demand Vulkan features
# the driver never exposes, so the game dies with "No adapters" - these
# older/community builds are the working fallbacks.
GFX_DIR=/usr/share/nebel
DXVK_DIR="${GFX_DIR}/dxvk"
VKD3D_DIR="${GFX_DIR}/vkd3d"
mkdir -p "${DXVK_DIR}" "${VKD3D_DIR}"

# vkd3d-proton tarballs are .tar.zst
if ! command -v zstd >/dev/null 2>&1; then
    dnf5 -y install --setopt=install_weak_deps=False \
        zstd
fi

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

# DXVK-Sarek has no fixed tag scheme; take the latest release's .tar.gz asset
# (there is only one; skip any -gplasync variant). Fall back to a pinned
# known-good release if the API is unreachable.
sarek_release="$(curl --retry 3 --retry-delay 2 -fsSL \
    https://api.github.com/repos/pythonlover02/DXVK-Sarek/releases/latest)" \
    || sarek_release=""
SAREK_URL="$(jq -r '[.assets[].browser_download_url | select(endswith(".tar.gz")) | select(contains("gplasync") | not)][0] // empty' \
    <<<"${sarek_release}")"
if [ -z "${SAREK_URL}" ]; then
    SAREK_URL="https://github.com/pythonlover02/DXVK-Sarek/releases/download/v1.12.0/dxvk-sarek-dyasync-v1.12.0.tar.gz"
fi

# unpack_layer <target-dir> <url>: download a tarball holding x64/x32 (vkd3d
# says x86) dll dirs and normalize it to <target-dir>/{x64,x32}/*.dll.
unpack_layer() {
    local target="$1" url="$2"
    local tmp="${workdir}/$(basename "${target}")"
    mkdir -p "${tmp}/unpack"
    curl --retry 3 --retry-delay 2 -fsSL -o "${tmp}/layer.tar" "${url}"
    tar -xf "${tmp}/layer.tar" -C "${tmp}/unpack" --strip-components=1
    rm "${tmp}/layer.tar"
    # vkd3d-proton names its 32-bit dir x86, dxvk says x32
    if [ -d "${tmp}/unpack/x86" ] && [ ! -d "${tmp}/unpack/x32" ]; then
        mv "${tmp}/unpack/x86" "${tmp}/unpack/x32"
    fi
    rm -rf "${target}"
    mkdir -p "${target}"
    mv "${tmp}/unpack/x64" "${tmp}/unpack/x32" "${target}/"
    rm -rf "${tmp}"
}

# require_dlls <target-dir> <dll...>: fail the build if any expected dll is missing.
require_dlls() {
    local target="$1"
    shift
    local arch dll
    for arch in x64 x32; do
        for dll in "$@"; do
            if [ ! -f "${target}/${arch}/${dll}" ]; then
                echo "34-install-dxvk-versions: missing ${target}/${arch}/${dll}" >&2
                exit 1
            fi
        done
    done
}

unpack_layer "${DXVK_DIR}/dxvk-2.7.1" \
    "https://github.com/doitsujin/dxvk/releases/download/v2.7.1/dxvk-2.7.1.tar.gz"
unpack_layer "${DXVK_DIR}/dxvk-sarek" "${SAREK_URL}"
unpack_layer "${DXVK_DIR}/dxvk-async-1.10.3" \
    "https://github.com/Sporif/dxvk-async/releases/download/1.10.3/dxvk-async-1.10.3.tar.gz"
unpack_layer "${VKD3D_DIR}/vkd3d-3.0.1" \
    "https://github.com/HansKristian-Work/vkd3d-proton/releases/download/v3.0.1/vkd3d-proton-3.0.1.tar.zst"
unpack_layer "${VKD3D_DIR}/vkd3d-3.0" \
    "https://github.com/HansKristian-Work/vkd3d-proton/releases/download/v3.0/vkd3d-proton-3.0.tar.zst"
unpack_layer "${VKD3D_DIR}/vkd3d-2.14.1" \
    "https://github.com/HansKristian-Work/vkd3d-proton/releases/download/v2.14.1/vkd3d-proton-2.14.1.tar.zst"

for build in dxvk-2.7.1 dxvk-sarek dxvk-async-1.10.3; do
    require_dlls "${DXVK_DIR}/${build}" d3d9.dll d3d10core.dll d3d11.dll dxgi.dll
done
for build in vkd3d-3.0.1 vkd3d-3.0 vkd3d-2.14.1; do
    require_dlls "${VKD3D_DIR}/${build}" d3d12.dll d3d12core.dll
done
