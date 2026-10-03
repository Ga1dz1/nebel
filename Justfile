export image_name := env("IMAGE_NAME", "nebel")
export default_tag := env("DEFAULT_TAG", "testing")

default:
    @just --list

check:
    just --unstable --fmt --check -f Justfile

build $target_image=image_name $tag=default_tag:
    #!/usr/bin/env bash
    set -euo pipefail
    VERSION="${NEBEL_VERSION:-$(date -u +%Y%m%d).$(git rev-parse --short HEAD)}"
    # Private carriers require an authenticated registry session.
    podman build --platform linux/arm64 --build-arg "NEBEL_VERSION=$VERSION" \
        --tag "${target_image}:${tag}" .
