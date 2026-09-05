#!/bin/bash
# Flash a nebel SD image and wipe the stale backup-GPT at the END of the card.
#
# Why the tail wipe: our SD images are MBR (see finalize-nebel-image.sh), but the
# kernel cmdline carries the `gpt` token. If the card was previously GPT-partitioned,
# its backup GPT survives at the physical end of a larger card; the kernel then picks
# that stale table up, builds the OLD partitions, and boot dies in the dracut
# emergency shell with "/dev/disk/by-uuid/<root> does not exist".
set -euo pipefail

IMG="${1:?usage: flash-sd.sh <image.img.gz> </dev/sdX>}"
DEV="${2:?usage: flash-sd.sh <image.img.gz> </dev/sdX>}"

[[ -b "${DEV}" ]] || { echo "ERROR: ${DEV} is not a block device"; exit 1; }
[[ "${DEV}" == /dev/sd* || "${DEV}" == /dev/mmcblk* || "${DEV}" == /dev/nvme* ]] \
    || { echo "ERROR: refusing unusual target ${DEV}"; exit 1; }

echo "Target: ${DEV} ($(lsblk -dn -o SIZE,MODEL "${DEV}" | tr -s ' '))"
lsblk -o NAME,SIZE,FSTYPE,LABEL "${DEV}" || true
echo

# Unmount anything auto-mounted off the target.
for part in $(lsblk -ln -o NAME "${DEV}" | tail -n +2); do
    sudo umount "/dev/${part}" 2>/dev/null || true
done

echo "==> Writing ${IMG}"
if [[ "${IMG}" == *.gz ]]; then
    pigz -dc "${IMG}" | sudo dd of="${DEV}" bs=4M conv=fsync status=progress
else
    sudo dd if="${IMG}" of="${DEV}" bs=4M conv=fsync status=progress
fi

echo "==> Wiping stale backup GPT (last 33 sectors)"
SECTORS=$(sudo blockdev --getsz "${DEV}")
sudo dd if=/dev/zero of="${DEV}" bs=512 seek=$((SECTORS - 33)) count=33 status=none
sudo sync

echo "==> Result:"
sudo wipefs -n "${DEV}"
lsblk -o NAME,SIZE,FSTYPE,LABEL "${DEV}"
echo "Done. Safe to remove the card."
