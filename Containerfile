ARG FEX_PKG=ghcr.io/virtudude/armada-packages/fex@sha256:5efff7dd05124e0653fd31a62bba78a68c87bd28f54ad12f6d0079acb3f07f7e
ARG MESA_PKG=ghcr.io/virtudude/armada-packages/mesa@sha256:00f45355cd5259413ec7463c9accaf69858e8472558441095883fc5ad71fd1a9
ARG MANGOHUD_PKG=ghcr.io/virtudude/armada-packages/mangohud@sha256:685ec69671d23188cfaf93a9d898da2356eca2ee80d3205a7445b200c6774c47
ARG GAMESCOPE_PKG=ghcr.io/ga1dz1/armada-packages/gamescope@sha256:8364ddc548b966ee37022e62d9d734d6d2fb0f162b87a6ee7d5b9965fb63682c
ARG POWERDEVIL_PKG=ghcr.io/virtudude/armada-packages/powerdevil@sha256:996937f85b561eccfd006ac1c5e7dbd0a0a1b21846ca518fdb5938c215878d81
ARG KERNEL_PKG=ghcr.io/ga1dz1/armada-packages/kernel@sha256:a44a70f33826b5848d3add0a54deb695240abe7738c61c95bfdb6305dd672140
ARG INPUTPLUMBER_PKG=ghcr.io/ga1dz1/armada-packages/inputplumber@sha256:540bff64dd9c909fce5e42295b925c597950a79dde1d883176504f76d21d7354
ARG EXTEST_PKG=ghcr.io/virtudude/armada-packages/extest@sha256:bdd44824ebbff167e007fd44df794713e2340e8fe94247d9e231f3ce10ff1844
ARG NETWORKMANAGER_PKG=ghcr.io/virtudude/armada-packages/networkmanager@sha256:ed0b1c9877fbeba38067f3b0de663c9483000019e0a0a968740f231bcfe3d095
ARG JUPITER_HW_SUPPORT_PKG=ghcr.io/virtudude/armada-packages/jupiter-hw-support@sha256:3d555f9d9ac79e7fbca2e59a45df97782fb5bee7ce3f65613703122b93b8a866
ARG PCSX2_PKG=ghcr.io/ga1dz1/armada-packages/pcsx2@sha256:9de73aed34730e51207dc4b789aea14dae7759482cc69ce91147acefdd0bf4d8
ARG EDEN_PKG=ghcr.io/ga1dz1/armada-packages/eden@sha256:c4182ca0b3a3ea1db3a523444aa37d7dc10d2e755e71df14e8bc887aa4bb8fbc

FROM ${FEX_PKG} AS fex
FROM ${MESA_PKG} AS mesa
FROM ${MANGOHUD_PKG} AS mangohud
FROM ${GAMESCOPE_PKG} AS gamescope
FROM ${POWERDEVIL_PKG} AS powerdevil
FROM ${KERNEL_PKG} AS kernel
FROM ${INPUTPLUMBER_PKG} AS inputplumber
FROM ${NETWORKMANAGER_PKG} AS networkmanager
FROM ${JUPITER_HW_SUPPORT_PKG} AS jupiter-hw-support
FROM ${EXTEST_PKG} AS extest
FROM ${PCSX2_PKG} AS pcsx2
FROM ${EDEN_PKG} AS eden

FROM docker.io/library/node:22-slim AS decky-build
WORKDIR /build
COPY decky/nebel-control/package.json decky/nebel-control/package-lock.json ./
RUN npm ci
COPY decky/nebel-control/ ./
RUN npm run build

FROM scratch AS ctx
COPY build_files /build_files/
COPY decky /decky/
COPY system_files /system_files/

FROM quay.io/fedora/fedora-bootc:44
ARG NEBEL_VERSION=unknown
LABEL org.opencontainers.image.version="${NEBEL_VERSION}"

RUN --mount=type=bind,from=ctx,source=/,target=/ctx \
    --mount=type=bind,from=fex,source=/rpms,target=/packages/fex \
    --mount=type=bind,from=mesa,source=/rpms,target=/packages/mesa \
    --mount=type=bind,from=mangohud,source=/rpms,target=/packages/mangohud \
    --mount=type=bind,from=gamescope,source=/rpms,target=/packages/gamescope \
    --mount=type=bind,from=powerdevil,source=/rpms,target=/packages/powerdevil \
    --mount=type=bind,from=kernel,source=/kernel,target=/packages/kernel \
    --mount=type=bind,from=inputplumber,source=/rpms,target=/packages/inputplumber \
    --mount=type=bind,from=networkmanager,source=/rpms,target=/packages/networkmanager \
    --mount=type=bind,from=jupiter-hw-support,source=/rpms,target=/packages/jupiter-hw-support \
    --mount=type=bind,from=extest,source=/,target=/packages/extest \
    --mount=type=bind,from=pcsx2,source=/pcsx2,target=/packages/pcsx2 \
    --mount=type=bind,from=eden,source=/eden,target=/packages/eden \
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
RUN printf '%s\n' \
    'NAME="Nebel"' \
    'PRETTY_NAME="Nebel '"${NEBEL_VERSION}"'"' \
    'VERSION="'"${NEBEL_VERSION}"'"' \
    'VERSION_ID="'"${NEBEL_VERSION}"'"' \
    'ID=nebel' \
    'ID_LIKE="fedora"' \
    'HOME_URL="https://github.com/Ga1dz1/nebel"' \
    > /usr/lib/os-release

RUN bootc container lint
