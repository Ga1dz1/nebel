#!/bin/bash
set -euxo pipefail

PCSX2_VER="dbb7eade6"
PCSX2_TARBALL="/packages/pcsx2/armada-pcsx2-${PCSX2_VER}.tar.zst"
[ -f "${PCSX2_TARBALL}" ] || { echo "ERROR: pcsx2 tarball missing at ${PCSX2_TARBALL}"; exit 1; }
( cd /packages/pcsx2 && sha256sum -c "armada-pcsx2-${PCSX2_VER}.tar.zst.sha256" )
tar --extract --zstd -f "${PCSX2_TARBALL}" -C /usr/share
chmod 755 /usr/share/pcsx2/bin/yaps2-qt
echo "nebel pcsx2 (yaps2) installed at /usr/share/pcsx2/"

EDEN_VER="0.2.1"
EDEN_TARBALL="/packages/eden/armada-eden-${EDEN_VER}.tar.zst"
[ -f "${EDEN_TARBALL}" ] || { echo "ERROR: eden tarball missing at ${EDEN_TARBALL}"; exit 1; }
( cd /packages/eden && sha256sum -c "armada-eden-${EDEN_VER}.tar.zst.sha256" )
tar --extract --zstd -f "${EDEN_TARBALL}" -C /usr/share
chmod 755 /usr/share/eden/Eden.AppImage
echo "nebel eden installed at /usr/share/eden/"
