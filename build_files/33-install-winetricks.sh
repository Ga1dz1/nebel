#!/bin/bash
set -euxo pipefail

# Winetricks powers nebel-control's per-game "Dependencies" section (d3dx9,
# vcrun*, physx, xna40, dotnet35, flash) for Proton prefixes. It's a noarch
# shell script; cabextract is what the DirectX/vcredist verbs unpack with.
# Verb payloads download at install time, so nothing verb-specific is baked
# into the image.
dnf5 -y install --setopt=install_weak_deps=False \
    winetricks \
    cabextract
