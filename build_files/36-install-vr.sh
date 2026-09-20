#!/bin/bash
set -euxo pipefail

# VR groundwork for 1.4.4 (Quest 3 later; hardware-neutral now).
# WiVRn 26.x + Monado ship in Fedora 44 built for aarch64; wivrn-server is
# the OpenXR streaming server (headset connects to Nebel), Monado is the
# OpenXR runtime, opencomposite bridges OpenVR games. openvr/xr-hardware
# pull in the udev rules that tag HMD devices for the runtime.
#
# The server itself stays OFF by default: enabling is per-user from the
# nebel-control plugin (systemctl --user enable --now wivrn), so the gaming
# session pays nothing when VR is unused.

dnf5 -y install --setopt=install_weak_deps=False \
    wivrn \
    wivrn-dashboard \
    monado \
    openxr \
    opencomposite \
    xr-hardware \
    avahi \
    avahi-tools

# Baseline server config: enable the virtual display so a connected headset
# gets its own headless output (wireless screen / cinema groundwork). The
# user-level override lives in ~/.config/wivrn/config.json and wins over
# this system file.
install -Dm644 /ctx/build_files/vendor/wivrn-config.json \
    /etc/wivrn/config.json

# Do NOT systemctl --global enable wivrn.service here — the server starts
# only when the user turns VR on from the plugin (see nebel-vr target below).
