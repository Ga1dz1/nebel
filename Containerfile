# Qualified package carrier exists locally; publish this exact digest before CI.
# Local image qualification overrides FEX_PKG with the local carrier reference.
ARG FEX_PKG=ghcr.io/ga1dz1/armada-packages/fex@sha256:85668eb6548e127ad60f647e6b42f5af37807884c7639324a6454156dc85b0d6
ARG MESA_PKG=ghcr.io/ga1dz1/nebel-components/mesa@sha256:92671c342739231428f3f4e45504d54a1b2cc8c5a8976e462f0d1df14548d95f
# Qualified package exists locally with source RPM and bundled source archives.
# Publish this exact private carrier before remote builds; override locally.
ARG MANGOHUD_PKG=ghcr.io/ga1dz1/nebel-components/mangohud@sha256:a60fa69b630f828a2959d89905357392e9e4fcc4675a746d050f8fc647bca269
# Candidate verified locally; publish this exact carrier before remote builds.
# Local qualification overrides GAMESCOPE_PKG with localhost/nebel-packages/gamescope.
ARG GAMESCOPE_PKG=ghcr.io/ga1dz1/armada-packages/gamescope-nebel@sha256:45033d0e0c07776cdfba9e57d899395ccb4f974e75385b7db3e55188cfbe3043
# Candidate exists locally; publish this exact carrier before remote builds.
# Local qualification overrides GRAPHICS_PKG with the local digest reference.
ARG GRAPHICS_PKG=ghcr.io/ga1dz1/armada-packages/graphics@sha256:e40a52496b08a6e326876b7640cb1b950711674c3ecefcb3920f7e58dcc25ece
ARG POWERDEVIL_PKG=ghcr.io/virtudude/armada-packages/powerdevil@sha256:996937f85b561eccfd006ac1c5e7dbd0a0a1b21846ca518fdb5938c215878d81
# Local qualification overrides this with localhost/nebel-packages/kernel.
# Publish the exact carrier (including corresponding sources) before remote builds.
ARG KERNEL_PKG=ghcr.io/ga1dz1/nebel-components/kernel@sha256:edcd480ba4601d29c4d4fdc812b34ef4b5e55a9430fa787ef358c7a02390db60
ARG INPUTPLUMBER_PKG=ghcr.io/ga1dz1/armada-packages/inputplumber@sha256:ce87f64eaeab2ed05a31b7ef035429dac5bf6fc842c4ecdb92d3075c4c7b6564
ARG EXTEST_PKG=ghcr.io/virtudude/armada-packages/extest@sha256:bdd44824ebbff167e007fd44df794713e2340e8fe94247d9e231f3ce10ff1844
ARG NETWORKMANAGER_PKG=ghcr.io/virtudude/armada-packages/networkmanager@sha256:ed0b1c9877fbeba38067f3b0de663c9483000019e0a0a968740f231bcfe3d095
ARG JUPITER_HW_SUPPORT_PKG=ghcr.io/virtudude/armada-packages/jupiter-hw-support@sha256:3d555f9d9ac79e7fbca2e59a45df97782fb5bee7ce3f65613703122b93b8a866
# Private implementation inputs; the public build context contains no overlay
# or Control sources. Qualify locally with the matching localhost carrier.
ARG COMPONENTS_PKG=ghcr.io/ga1dz1/nebel-components@sha256:c3b397a4b95cc6e4db1e9d9b6969b5eb5f13c315a04085099e6f519ee7786336

FROM ${FEX_PKG} AS fex
FROM ${MESA_PKG} AS mesa
FROM ${MANGOHUD_PKG} AS mangohud
FROM ${GAMESCOPE_PKG} AS gamescope
FROM ${GRAPHICS_PKG} AS graphics
FROM ${POWERDEVIL_PKG} AS powerdevil
FROM ${KERNEL_PKG} AS kernel
FROM ${INPUTPLUMBER_PKG} AS inputplumber
FROM ${NETWORKMANAGER_PKG} AS networkmanager
FROM ${JUPITER_HW_SUPPORT_PKG} AS jupiter-hw-support
FROM ${EXTEST_PKG} AS extest
FROM ${COMPONENTS_PKG} AS components

FROM docker.io/library/node:22-slim AS decky-build
WORKDIR /build
COPY --from=components /decky/nebel-control/package.json /decky/nebel-control/package-lock.json ./
RUN npm ci
COPY --from=components /decky/nebel-control/ ./
RUN npm run build

FROM ${COMPONENTS_PKG} AS ctx
COPY --from=components /tools/graphics-qualification/verify-payload.py /build_files/verify-graphics-payload.py

FROM quay.io/fedora/fedora-bootc:44
ARG NEBEL_VERSION=unknown
# Human release version for Settings -> System (VERSION_ID in os-release);
# NEBEL_VERSION (date.sha) stays as BUILD_ID. Bump NEBEL_RELEASE per release.
ARG NEBEL_RELEASE=1.4.8
ARG NEBEL_CODENAME=Aurora
LABEL org.opencontainers.image.version="${NEBEL_VERSION}"
LABEL io.nebel.release.version="${NEBEL_RELEASE}"
# The Fedora base label describes its removed kernel, not Nebel's replacement.
LABEL ostree.linux="7.2.6"
COPY --chmod=0644 licenses/GLM.txt licenses/STB.txt licenses/README.txt /usr/share/licenses/nebel-bundled/

RUN --mount=type=bind,from=ctx,source=/,target=/ctx \
    --mount=type=bind,from=fex,source=/rpms,target=/packages/fex \
    --mount=type=bind,from=mesa,source=/rpms,target=/packages/mesa \
    --mount=type=bind,from=mangohud,source=/rpms,target=/packages/mangohud \
    --mount=type=bind,from=gamescope,source=/rpms,target=/packages/gamescope \
    --mount=type=bind,from=graphics,source=/,target=/packages/graphics \
    --mount=type=bind,from=powerdevil,source=/rpms,target=/packages/powerdevil \
    --mount=type=bind,from=kernel,source=/kernel,target=/packages/kernel \
    --mount=type=bind,from=inputplumber,source=/rpms,target=/packages/inputplumber \
    --mount=type=bind,from=networkmanager,source=/rpms,target=/packages/networkmanager \
    --mount=type=bind,from=jupiter-hw-support,source=/rpms,target=/packages/jupiter-hw-support \
    --mount=type=bind,from=extest,source=/,target=/packages/extest \
    --mount=type=bind,from=decky-build,source=/build/dist,target=/packages/decky-dist \
    --mount=type=secret,id=gh_api_token,dst=/run/secrets/gh_api_token,required=false \
    --mount=type=cache,dst=/var/cache \
    --mount=type=cache,dst=/var/log \
    --mount=type=tmpfs,dst=/tmp \
    mkdir -p /usr/lib/nebel && \
    printf '%s\n' "${NEBEL_VERSION}" >/usr/lib/nebel/version && \
    /ctx/build_files/build.sh

# Nebel identity for the Steam Settings -> System page (and anything else
# reading /etc/os-release): show our version/channel instead of plain Fedora.
# VARIANT/VARIANT_ID here are the stable defaults; at boot
# nebel-release-channel.service rewrites /etc/os-release with the channel of
# the actually-booted OTA image tag (stable/beta/testing).
RUN printf '%s\n' \
    'NAME="Nebel"' \
    'PRETTY_NAME="Nebel OS '"${NEBEL_RELEASE}"'"' \
    'VERSION="'"${NEBEL_RELEASE}"' ('"${NEBEL_CODENAME}"')"' \
    'VERSION_ID="'"${NEBEL_RELEASE}"'"' \
    'VERSION_CODENAME="'"${NEBEL_CODENAME}"'"' \
    'BUILD_ID="'"${NEBEL_VERSION}"'"' \
    'VARIANT="Stable"' \
    'VARIANT_ID=stable' \
    'ID=nebel' \
    'ID_LIKE="fedora"' \
    'HOME_URL="https://github.com/Ga1dz1/nebel"' \
    > /usr/lib/os-release

RUN --mount=type=bind,from=ctx,source=/,target=/ctx \
    bash /ctx/build_files/check-runtime-access.sh && bootc container lint
