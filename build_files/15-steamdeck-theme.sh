#!/bin/bash
# Install the Steam Deck / SteamOS 3 Plasma theme presets.
#
# The upstream package is architecture-independent (any.pkg.tar.zst), so the
# same x86_64 SteamOS mirror tarball works on aarch64 as long as we only
# extract art/theme/config files (no binaries).
set -euxo pipefail

STEAMOS_PKG_URL="https://steamdeck-packages.steamos.cloud/archlinux-mirror/jupiter-main/os/x86_64/steamdeck-kde-presets-0.29-1-any.pkg.tar.zst"
PKG="/tmp/steamdeck-kde-presets.pkg.tar.zst"
EXTRACT="/tmp/steamdeck-kde-presets-extract"

curl --retry 3 -fsSL -o "${PKG}" "${STEAMOS_PKG_URL}"

mkdir -p "${EXTRACT}"
zstd -d "${PKG}" -o "${EXTRACT}/steamdeck-kde-presets.pkg.tar"
cd "${EXTRACT}"

# Only extract the theme assets and default configs.  We deliberately skip
# SteamOS-specific daemons, autostarts, and xorg.conf snippets that would
# conflict with Nebel's own session management.
tar -xf "steamdeck-kde-presets.pkg.tar" \
    usr/share/color-schemes/Vapor.colors \
    usr/share/color-schemes/VGUI.colors \
    usr/share/plasma/desktoptheme/Vapor \
    usr/share/plasma/look-and-feel/com.valve.vapor.desktop \
    usr/share/plasma/look-and-feel/com.valve.vapor.deck.desktop \
    usr/share/themes/Vapor \
    usr/share/wallpapers/"Steam Deck Logo Default.jpg" \
    usr/share/icons/hicolor/scalable/actions/gaming-return.svg \
    usr/share/icons/hicolor/scalable/actions/steam-gaming-return.svg \
    usr/share/icons/hicolor/scalable/actions/steamdeck-gaming-return.svg \
    usr/share/icons/hicolor/scalable/apps/install-firefox.svg \
    usr/share/icons/hicolor/scalable/places/distributor-logo-steamdeck.svg \
    usr/share/icons/hicolor/scalable/places/distributor-logo.svg \
    etc/xdg/gtk-2.0/gtkrc \
    etc/xdg/gtk-3.0/settings.ini \
    etc/xdg/kcm-about-distrorc \
    etc/xdg/kcminputrc \
    etc/xdg/kscreenlockerrc \
    etc/xdg/kwinrulesrc \
    etc/xdg/powerdevilrc \
    etc/sddm.conf.d/steamdeck.conf

# Merge into the root filesystem.
cp -a etc usr /

# Clean up.
cd /
rm -rf "${EXTRACT}" "${PKG}"
