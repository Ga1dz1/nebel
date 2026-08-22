#!/bin/bash
# Stage ROCKNIX ABL images into /usr/share/armada/abl so devices can self-update
# their ABL via armada-abl-update (needed for the unified no-GRUB /KERNEL boot
# path — installs predating ROCKNIX ABL v1.1.6+ can't pick a per-device DTB).
set -euxo pipefail

ABL_VERSION="v1.1.7"

mkdir -p /usr/share/armada/abl
cd /tmp
curl --retry 3 -fsSL -o abl.tar.gz \
    "https://github.com/ROCKNIX/abl/releases/download/${ABL_VERSION}/rocknix-abl-${ABL_VERSION}.tar.gz"
tar -xzf abl.tar.gz
for soc in SM8250 SM8550 SM8650 SM8750; do
    src=$(ls -d rocknix-abl-*)
    cp "${src}/abl_signed-${soc}.elf" "${src}/abl_signed-${soc}.elf.sha256" /usr/share/armada/abl/
    (cd /usr/share/armada/abl && sha256sum -c "abl_signed-${soc}.elf.sha256")
done
rm -rf /tmp/abl.tar.gz /tmp/rocknix-abl-*
echo "${ABL_VERSION}" > /usr/share/armada/abl/VERSION
