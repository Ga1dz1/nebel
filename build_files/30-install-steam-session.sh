#!/bin/bash
set -euxo pipefail

# Patched Turnip includes the Mesa #14656 VM_BIND fix.
dnf5 -y install --setopt=install_weak_deps=False /packages/mesa/mesa-*.fc44.armada.*.rpm

# Patched mangohud: Adreno GPU load/clock/temp for mainline drm/msm (msm_dpu).
dnf5 -y install --setopt=install_weak_deps=False /packages/mangohud/mangohud-*.fc44.armada.*.rpm

dnf5 -y install --setopt=install_weak_deps=False \
    gamescope \
    vulkan-loader \
    vulkan-tools \
    gamemode \
    gtk2 \
    openal-soft \
    xorg-x11-server-Xwayland \
    xorg-x11-server-Xvfb

# armada-gamescope carries ROCKNIX's --use-rotation-shader patch.
dnf5 -y install --setopt=install_weak_deps=False /packages/gamescope/gamescope-[0-9]*.aarch64.rpm

# Patched InputPlumber: dpad signed-axis fix
dnf5 -y install --setopt=install_weak_deps=False /packages/inputplumber/inputplumber-*.rpm

# Patched NetworkManager: /etc/NetworkManager/ignore-sleep keeps wifi up across fake-suspend.
dnf5 -y install --setopt=install_weak_deps=False /packages/networkmanager/*.rpm

dnf5 -y install --setopt=install_weak_deps=False /packages/jupiter-hw-support/*.rpm

# Avoid gamescope-session-ogui-steam/-powerstation; Terra's aarch64 deps are broken.
dnf5 -y install --setopt=install_weak_deps=False --enable-repo=terra \
    gamescope-session \
    steam-notif-daemon

# Upstream dropped the USE_ROTATION_SHADER hook (gamescope-session-plus git
# 20260820) in favour of --force-composition-rotation; nebel's own
# sessions.d/steam builds the gamescope command itself and passes
# --use-rotation-shader directly, so the main script needs no rotation patch.

# Avoid xtrace spam during every game-mode startup.
sed -i '/^set -x$/d' /usr/share/gamescope-session-plus/gamescope-session-plus

# First gamescope startup can exceed Terra's 5s socket wait on SD.
sed -i \
    's/read -r -t 5 response_x_display response_wl_display/read -r -t 15 response_x_display response_wl_display/' \
    /usr/share/gamescope-session-plus/gamescope-session-plus

dnf5 -y install --setopt=install_weak_deps=False \
    erofs-fuse \
    erofs-utils \
    fuse-libs \
    lsb_release \
    squashfuse \
    squashfs-tools

dnf5 -y install --setopt=install_weak_deps=False /packages/fex/fex-emu-*.rpm

# Use Arch rootfs for better compatibility with Linux games targeting SteamOS.
# Unpacked (not the sqsh) into /usr/share/guestos/fex-mesa: the FEX-Emu Steam
# compat tool (fex-compat-tool) expects an OS-provided x86_64 rootfs with Mesa
# at exactly that path (Valve SteamOS ARM64 convention), with a
# graphics_provider.json manifest for pressure-vessel
# (steam-runtime-graphics-provider.json(5)). The same directory doubles as the
# system FEX RootFS (a plain directory works everywhere the sqsh did and saves
# the squashfuse mount), so the 1.1G sqsh itself is not shipped.
ARCH_ROOTFS_URL="https://rootfs.fex-emu.gg/ArchLinux/2026-01-08/ArchLinux.sqsh"
ARCH_ROOTFS_SHA256="cb059973b7953ad9165845529655189b96f9a174b14a6a149c87ec884b0c5e90"
GUESTOS_DIR=/usr/share/guestos/fex-mesa
curl --retry 3 --retry-delay 2 -fsSL -o /tmp/ArchLinux.sqsh "${ARCH_ROOTFS_URL}"
echo "${ARCH_ROOTFS_SHA256}  /tmp/ArchLinux.sqsh" | sha256sum -c -
mkdir -p "${GUESTOS_DIR}"
unsquashfs -f -d "${GUESTOS_DIR}" /tmp/ArchLinux.sqsh
rm -f /tmp/ArchLinux.sqsh

# Trim what a game runtime never touches (4.1G -> ~1.8G): dev toolchain,
# headers, docs/man, locales (graphics provider declares locales:false),
# bundled wine (Proton ships its own), python, OpenCL, Go/D runtimes.
rm -rf \
    "${GUESTOS_DIR}"/usr/include \
    "${GUESTOS_DIR}"/usr/share/locale \
    "${GUESTOS_DIR}"/usr/share/doc \
    "${GUESTOS_DIR}"/usr/share/man \
    "${GUESTOS_DIR}"/usr/share/info \
    "${GUESTOS_DIR}"/usr/share/gir-1.0 \
    "${GUESTOS_DIR}"/usr/share/clc \
    "${GUESTOS_DIR}"/usr/share/i18n \
    "${GUESTOS_DIR}"/usr/share/icons \
    "${GUESTOS_DIR}"/usr/share/perl5 \
    "${GUESTOS_DIR}"/usr/lib/perl5 \
    "${GUESTOS_DIR}"/usr/lib/wine \
    "${GUESTOS_DIR}"/usr/share/wine \
    "${GUESTOS_DIR}"/usr/lib32/wine \
    "${GUESTOS_DIR}"/usr/lib/python3.* \
    "${GUESTOS_DIR}"/usr/share/python \
    "${GUESTOS_DIR}"/usr/lib/clang \
    "${GUESTOS_DIR}"/usr/lib32/clang \
    "${GUESTOS_DIR}"/usr/lib/gcc \
    "${GUESTOS_DIR}"/usr/lib32/gcc \
    "${GUESTOS_DIR}"/chroot \
    "${GUESTOS_DIR}"/chroot.py
rm -f \
    "${GUESTOS_DIR}"/usr/lib/libclang* \
    "${GUESTOS_DIR}"/usr/lib32/libclang* \
    "${GUESTOS_DIR}"/usr/lib/libRusticlOpenCL* \
    "${GUESTOS_DIR}"/usr/lib32/libRusticlOpenCL* \
    "${GUESTOS_DIR}"/usr/lib/libgo.so.* \
    "${GUESTOS_DIR}"/usr/lib32/libgo.so.* \
    "${GUESTOS_DIR}"/usr/lib/libgphobos* \
    "${GUESTOS_DIR}"/usr/lib32/libgphobos* \
    "${GUESTOS_DIR}"/usr/bin/clang* \
    "${GUESTOS_DIR}"/usr/bin/c-index-test \
    "${GUESTOS_DIR}"/usr/bin/clangd \
    "${GUESTOS_DIR}"/usr/bin/llvm-* \
    "${GUESTOS_DIR}"/usr/bin/lld*

# pressure-vessel graphics provider manifest: rootfs layout, no locales,
# no VA-API/VDPAU (the FEX rootfs build has no mesa-vdpau package).
cat > "${GUESTOS_DIR}/graphics_provider.json" <<'EOF'
{
  "graphics_provider_v0": {
    "root": "./",
    "locales": false,
    "va_api": false,
    "vdpau": false,
    "architectures": {
      "x86_64-linux-gnu": {
        "dri": "/usr/lib/dri",
        "gbm": "/usr/lib/gbm",
        "gconv": "/usr/lib/gconv"
      },
      "i386-linux-gnu": {
        "dri": "/usr/lib32/dri",
        "gbm": "/usr/lib32/gbm",
        "fallback_library_paths": ["/usr/lib32"],
        "gconv": "/usr/lib32/gconv"
      }
    }
  }
}
EOF

# /usr/share config stays user-overridable; ~/.fex-emu would mask it.
cat > /usr/share/fex-emu/Config.json <<'EOF'
{
  "Config": {
    "RootFS": "/usr/share/guestos/fex-mesa",
    "TSOEnabled": "1",
    "X87ReducedPrecision": "1",
    "Multiblock": "0",
    "VectorTSOEnabled": "0",
    "MemcpySetTSOEnabled": "0",
    "HalfBarrierTSOEnabled": "1",
    "ThunkHostLibs": "/usr/lib64/fex-emu/HostThunks",
    "ThunkGuestLibs": "/usr/share/fex-emu/GuestThunks"
  },
  "ThunksDB": {
    "Vulkan": 1,
    "GL": 1,
    "EGL": 1,
    "drm": 1,
    "WaylandClient": 1,
    "asound": 1
  }
}
EOF

# Bypass Terra's i686-only steam dependency; nebel launches native ARM Steam.
mkdir -p /tmp/gss-rpm
dnf5 download --enable-repo=terra --destdir=/tmp/gss-rpm gamescope-session-steam
rpm -ivh --nodeps /tmp/gss-rpm/gamescope-session-steam-*.rpm
rm -rf /tmp/gss-rpm

STEAM_BOOTSTRAP_HOME=/var/home/nebel
STEAM_HOME="${STEAM_BOOTSTRAP_HOME}/.local/share/Steam"

STEAM_BOOTSTRAP_HOME="${STEAM_BOOTSTRAP_HOME}" bash /ctx/build_files/generate-steam-bootstrap.sh
rm -f /etc/steamos-oobe-image

PROTON_VER="11.0-20260703-slr"
PROTON_ARCHIVE_NAME="proton-cachyos-${PROTON_VER}-arm64"
# Keep this in sync with nebel-fixups when changing Proton major/minor lines.
PROTON_TOOL_NAME="proton-cachyos-11.0-arm64"
PROTON_TAR="${PROTON_ARCHIVE_NAME}.tar.xz"
PROTON_URL="https://github.com/CachyOS/proton-cachyos/releases/download/cachyos-${PROTON_VER}/${PROTON_TAR}"
PROTON_SHA512_URL="https://github.com/CachyOS/proton-cachyos/releases/download/cachyos-${PROTON_VER}/${PROTON_ARCHIVE_NAME}.sha512sum"

curl --retry 3 --retry-delay 2 -fsSL -o "/tmp/${PROTON_TAR}" "${PROTON_URL}"
curl --retry 3 --retry-delay 2 -fsSL -o "/tmp/${PROTON_ARCHIVE_NAME}.sha512sum" "${PROTON_SHA512_URL}"
cd /tmp
sha512sum -c "${PROTON_ARCHIVE_NAME}.sha512sum"

# Ship Proton in the image, not the user's /var home: /var is install-only on
# bootc and custom compat tools don't self-update, so a home copy would freeze.
PROTON_DIR="/usr/share/steam/compatibilitytools.d"
mkdir -p "${PROTON_DIR}"
tar -xJf "/tmp/${PROTON_TAR}" -C "${PROTON_DIR}/"
if [[ ! -d "${PROTON_DIR}/${PROTON_ARCHIVE_NAME}" ]]; then
    echo "ERROR: CachyOS Proton archive did not extract ${PROTON_ARCHIVE_NAME}" >&2
    exit 1
fi
rm -rf "${PROTON_DIR:?}/${PROTON_TOOL_NAME}"
mv "${PROTON_DIR}/${PROTON_ARCHIVE_NAME}" "${PROTON_DIR}/${PROTON_TOOL_NAME}"
# Missing runtime app makes Steam fall back to Proton 10.
sed -i '/require_tool_appid/d' "${PROTON_DIR}/${PROTON_TOOL_NAME}/toolmanifest.vdf"
python3 /ctx/build_files/set-steam-default-compat.py "${STEAM_HOME}" "${PROTON_TOOL_NAME}" "${PROTON_DIR}"
rm -f "/tmp/${PROTON_TAR}" "/tmp/${PROTON_ARCHIVE_NAME}.sha512sum"

# Pin Steam, Proton, and the FEX rootfs to their own rechunk layers (build-chunked-oci reads the
# user.component xattr) so a system_files change doesn't re-pull them every OTA.
python3 -c 'import os,sys; os.setxattr(sys.argv[1],"user.component",b"steam")' "${STEAM_HOME}"
python3 -c 'import os,sys; os.setxattr(sys.argv[1],"user.component",b"proton")' "${PROTON_DIR}/${PROTON_TOOL_NAME}"
python3 -c 'import os,sys; os.setxattr(sys.argv[1],"user.component",b"fex-rootfs")' /usr/share/guestos/fex-mesa


# Official Valve ARM64 Proton (app 4628740, "Proton 11.0 (ARM64)") - a genuine
# native-aarch64 build (confirmed via `file` on every wine/wine64 binary: ELF
# ARM aarch64, not x86_64-under-FEX like the regular "Proton 11.0" app
# 4628710 Steam also lists). nebel's launch-steam already auto-detects and
# registers this exact app as a per-game compat tool option the moment its
# StateFlags shows fully-installed (bit 4) - it only needs the depot content
# pre-staged here so a fresh install has it from first boot, same as the
# Steam client and CachyOS Proton above, instead of requiring every user to
# manually find and install it from their own Steam library first.
#
# UNVERIFIED as of this commit - could not be exercised end-to-end in the
# sandbox this was written in (no FEX/x86 emulation available there at all,
# and no existing direct-FEXInterpreter invocation anywhere in this codebase
# to confirm the exact call convention against). Specifically unconfirmed:
#   - Whether steamcmd's anonymous account actually has license to pull this
#     app/depot (Proton apps are normally free tools, but not verified here).
#   - Whether FEXInterpreter (from the fex-emu package already installed
#     above) is the right way to run steamcmd's x86 binary in this exact
#     build context, or whether it needs FEXBash / a RootFS mount tweak.
#   - Whether SteamCMD's own self-update re-exec (linux32/steamcmd bootstraps
#     itself to a newer binary on first run) round-trips through FEX cleanly.
# Needs a real build-machine test (this repo's own CI, or any ARM64 host
# with FEX already set up) before shipping - if it fails, the pre-stage
# simply won't exist and launch-steam's own detection silently no-ops,
# same as today's manual-install-required behavior, so failure here is
# not expected to break anything else in the build.
PROTON_ARM64_APPID="4628740"
PROTON_ARM64_DIR="${STEAM_HOME}/steamapps/common/Proton 11.0 (ARM64)"
STEAMCMD_DIR="/tmp/steamcmd"

set +e
mkdir -p "${STEAMCMD_DIR}"
curl --retry 3 --retry-delay 2 -fsSL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" \
    -o "${STEAMCMD_DIR}/steamcmd_linux.tar.gz" \
    && tar -xzf "${STEAMCMD_DIR}/steamcmd_linux.tar.gz" -C "${STEAMCMD_DIR}" \
    && FEXInterpreter "${STEAMCMD_DIR}/linux32/steamcmd" \
        +@sSteamCmdForcePlatformType linux \
        +force_install_dir "${STEAM_HOME}/steamapps/common/Proton 11.0 (ARM64)" \
        +login anonymous \
        +app_update "${PROTON_ARM64_APPID}" validate \
        +quit
proton_arm64_rc=$?
set -e
rm -rf "${STEAMCMD_DIR}"

if [[ ${proton_arm64_rc} -eq 0 && -d "${PROTON_ARM64_DIR}" ]]; then
    python3 -c 'import os,sys; os.setxattr(sys.argv[1],"user.component",b"proton-arm64")' "${PROTON_ARM64_DIR}"
    echo "Pre-staged: official Proton 11.0 (ARM64), app ${PROTON_ARM64_APPID}"
else
    echo "WARNING: could not pre-stage official Proton 11.0 (ARM64) (rc=${proton_arm64_rc}) - users can still install it manually from their Steam library, same as before this change" >&2
fi

echo "Pre-staged: ARM64 Steam bootstrap + CachyOS Proton 11 ${PROTON_VER}"
