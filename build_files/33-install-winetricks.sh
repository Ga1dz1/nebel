#!/bin/bash
set -euxo pipefail

# Winetricks powers nebel-control's per-game "Dependencies" section (d3dx9,
# vcrun*, physx, xna40, dotnet35, flash) for Proton prefixes. Verb payloads
# download at install time, so nothing verb-specific is baked into the image.
#
# Fedora's winetricks RPM drags in wine-common, which Fedora does not build
# for aarch64 at all - so take the upstream script (a single self-contained
# shell file, which is all the RPM ships anyway) and only cabextract from
# dnf (it's what the DirectX/vcredist verbs unpack with).
WINETRICKS_TAG=20260125
curl --retry 3 --retry-delay 2 -fsSL \
    -o /usr/bin/winetricks \
    "https://raw.githubusercontent.com/Winetricks/winetricks/${WINETRICKS_TAG}/src/winetricks"
chmod 0755 /usr/bin/winetricks

dnf5 -y install --setopt=install_weak_deps=False \
    cabextract
