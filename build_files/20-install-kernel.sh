#!/bin/bash
set -euxo pipefail

KVER="7.0.11"
TARBALL="/packages/kernel/armada-kernel-${KVER}.tar.zst"

# bootc expects exactly one kernel under /usr/lib/modules.
dnf5 -y remove kernel kernel-core kernel-modules kernel-modules-core 2>/dev/null || true
rm -rf /usr/lib/modules/*

# Verify the shipped checksum.
[ -f "${TARBALL}" ] || { echo "ERROR: kernel tarball missing at ${TARBALL}"; exit 1; }
( cd /packages/kernel && sha256sum -c "armada-kernel-${KVER}.tar.zst.sha256" )

tar --extract --zstd -f "${TARBALL}" -C /usr/
depmod -a "${KVER}" -b /

# dracut MODULE_FIRMWARE introspection needs firmware at the build-time path.
mkdir -p /usr/lib/firmware
cp -a /ctx/system_files/usr/lib/firmware/. /usr/lib/firmware/

# Plymouth theme must exist before dracut bakes the splash into initramfs.
mkdir -p /usr/share/plymouth/themes
cp -a /ctx/system_files/usr/share/plymouth/themes/nebel /usr/share/plymouth/themes/

plymouth-set-default-theme nebel

dracut \
    --force \
    --no-hostonly \
    --reproducible \
    --kver "${KVER}" \
    --add ostree \
    --add plymouth \
    "/usr/lib/modules/${KVER}/initramfs.img" "${KVER}"

echo "nebel kernel ${KVER} installed at /usr/lib/modules/${KVER}/"
ls -la "/usr/lib/modules/${KVER}/" | head -10
