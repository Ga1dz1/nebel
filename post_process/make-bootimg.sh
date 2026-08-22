#!/bin/bash
# Assemble an ABL-bootable Android boot.img and stage it as /KERNEL.
set -euxo pipefail

RAW="${1:-output/image/disk.raw}"
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MKBOOTIMG="${MKBOOTIMG:-}"

# Single sources shared with the on-device regen (nebel-bootimg-update).
NEBEL_LIB="${SCRIPT_DIR}/../system_files/usr/lib/nebel"
DTB_LIST="${NEBEL_LIB}/supported-dtbs"
[[ -r "${DTB_LIST}" ]] || { echo "missing DTB list: ${DTB_LIST}"; exit 1; }
SUPPORTED_DTBS=$(cat "${DTB_LIST}")
[[ -r "${NEBEL_LIB}/bootimg-args" ]] || { echo "missing ${NEBEL_LIB}/bootimg-args"; exit 1; }
source "${NEBEL_LIB}/bootimg-args"

[[ -f "${RAW}" ]] || { echo "raw image not found: ${RAW} (run a build first)"; exit 1; }

WORK=$(mktemp -d)
LOOP=$(sudo losetup -fP --show "${RAW}")
trap 'sudo umount "${WORK}/p1" 2>/dev/null||true; sudo umount "${WORK}/p2" 2>/dev/null||true; sudo losetup -d "${LOOP}" 2>/dev/null||true; rm -rf "${WORK}"' EXIT

mkdir -p "${WORK}/p1" "${WORK}/p2"

if [[ -z "${MKBOOTIMG}" ]]; then
    MKBOOTIMG="${SCRIPT_DIR}/../build_files/vendor/mkbootimg/mkbootimg.py"
fi
[[ -x "${MKBOOTIMG}" ]] || { echo "mkbootimg not executable: ${MKBOOTIMG}"; exit 1; }

sudo mount "${LOOP}p2" "${WORK}/p2"          # /boot

DEPLOY=$(sudo ls "${WORK}/p2/ostree" | grep '^default-' | head -1)
BOOTDIR="${WORK}/p2/ostree/${DEPLOY}"
KVER=$(basename "$(sudo ls "${BOOTDIR}"/vmlinuz-* | head -1)" | sed 's/^vmlinuz-//')
# Read the raw entry lines (matching nebel-bootimg-update) so the stamp we write
# matches what it computes — a fresh install then skips first-boot regeneration.
BLS=$(sudo ls "${WORK}/p2"/loader*/entries/*.conf | head -1)
LINUX_LINE=$(sudo sed -n 's/^linux //p' "${BLS}" | head -1)
INITRD_LINE=$(sudo sed -n 's/^initrd //p' "${BLS}" | head -1)
OPTIONS_LINE=$(sudo sed -n 's/^options //p' "${BLS}" | head -1)
STAMP_ID=$(nebel_bootimg_id "${LINUX_LINE}" "${INITRD_LINE}" "${OPTIONS_LINE}" "${DTB_LIST}" "${NEBEL_LIB}/bootimg-args")
CMDLINE="${OPTIONS_LINE}"

# Fit the 512-byte cmdline: drop serial console, ostree= first, keep splash kargs.
_drop=" console=ttyS0 "
_ostree=""; _rest=""
for _t in ${CMDLINE}; do
    case "${_drop}" in *" ${_t} "*) continue ;; esac
    case "${_t}" in ostree=*) _ostree="${_t}" ;; *) _rest="${_rest} ${_t}" ;; esac
done
CMDLINE="${_ostree}${_rest}"

if [[ "${#CMDLINE}" -gt "${NEBEL_CMDLINE_MAX}" ]]; then
    echo "ERROR: cmdline is ${#CMDLINE}B, over the ${NEBEL_CMDLINE_MAX}B boot-header limit"; exit 1
fi

# ROCKNIX ABL expects gzip(Image) with DTBs appended.
sudo cat "${BOOTDIR}/vmlinuz-${KVER}" > "${WORK}/vmlinuz"
sudo cat "${BOOTDIR}/initramfs-${KVER}.img" > "${WORK}/initramfs"
gzip -c "${WORK}/vmlinuz" > "${WORK}/kernel.gz"
for _name in ${SUPPORTED_DTBS}; do
    _dtb="${BOOTDIR}/dtb/qcom/${_name}.dtb"
    sudo test -f "${_dtb}" || { echo "ERROR: supported DTB missing: ${_dtb}"; exit 1; }
    sudo cat "${_dtb}" >> "${WORK}/kernel.gz"
done

python3 "${MKBOOTIMG}" \
    --kernel "${WORK}/kernel.gz" --ramdisk "${WORK}/initramfs" \
    ${NEBEL_BOOTIMG_ARGS} --os_patch_level "$(date '+%Y-%m')" \
    --cmdline "${CMDLINE}" \
    -o "${WORK}/KERNEL"

sudo mount "${LOOP}p1" "${WORK}/p1"
sudo cp "${WORK}/KERNEL" "${WORK}/p1/KERNEL"
printf '%s' "${STAMP_ID}" | sudo tee "${WORK}/p1/.nebel-bootimg.id" >/dev/null
sudo sync

echo "Staged /KERNEL ($(du -h "${WORK}/KERNEL" | cut -f1)) on the FAT partition of ${RAW}"
echo "deploy=${DEPLOY} kver=${KVER}"
echo "cmdline=${CMDLINE}"
