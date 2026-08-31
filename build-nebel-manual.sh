#!/usr/bin/env bash
# Manual equivalent of `just build-nebel-image` that skips the rootless
# podman copy (image already in rootful storage; disk is too tight to hold
# both copies). BIB scratch goes straight into ./output (Unreal-backed).
set -euxo pipefail
cd /home/parallels/armada-work/armada

sudo rm -rf /var/tmp/podman[0-9]* /var/tmp/buildah-cache-[0-9]* || true

BUILDTMP=$(mktemp -p "${PWD}/output" -d -t _build-bib.XXXXXXXXXX)

EXTRA_MOUNTS=()
if [ -d /etc/containers/containers.conf.d ]; then
    EXTRA_MOUNTS+=("-v" "/etc/containers/containers.conf.d:/etc/containers/containers.conf.d:ro")
fi
if [ -f /tmp/nebel-runc/runc-arm64 ]; then
    EXTRA_MOUNTS+=("-v" "/tmp/nebel-runc/runc-arm64:/usr/bin/runc:ro")
fi

sudo podman run \
  --rm \
  --privileged \
  --pull=never \
  --net=host \
  --platform linux/arm64 \
  --security-opt label=type:unconfined_t \
  --security-opt apparmor=unconfined \
  --cap-add=CAP_MKNOD \
  -v "${PWD}/disk_config/disk.toml:/config.toml:ro" \
  -v "${BUILDTMP}:/output" \
  -v /var/lib/containers/storage:/var/lib/containers/storage \
  "${EXTRA_MOUNTS[@]}" \
  quay.io/centos-bootc/bootc-image-builder:latest \
  --type raw --use-librepo=True --rootfs=btrfs --target-arch arm64 \
  localhost/nebel:latest

sudo chown -R "$(id -u):$(id -g)" "$BUILDTMP"
mv -f "$BUILDTMP"/* output/
rmdir "$BUILDTMP"

sudo podman image prune -f || true

version=$(sudo podman inspect -t image localhost/nebel:latest \
            | jq -r '.[0].Config.Labels["org.opencontainers.image.version"] // empty')

./post_process/preseed-flatpaks.sh output/image/disk.raw
./post_process/make-bootimg.sh output/image/disk.raw
if [[ -n "$version" && "$version" != unknown ]]; then
    export OUT="output/nebel-${version}.img.gz"
fi
./post_process/finalize-nebel-image.sh output/image/disk.raw
echo "BUILD_DONE"
