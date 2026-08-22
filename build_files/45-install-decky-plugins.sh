#!/bin/bash
set -euxo pipefail

install -d -m 0755 /usr/share/decky-plugins/nebel-control
# Copy dist from the image build stage, not the source tree.
src=/ctx/decky/nebel-control
cp -a "${src}/plugin.json" "${src}/package.json" "${src}/main.py" /usr/share/decky-plugins/nebel-control/
cp -a "${src}/py_modules" /usr/share/decky-plugins/nebel-control/
cp -a /packages/decky-dist /usr/share/decky-plugins/nebel-control/dist
rm -f /usr/share/decky-plugins/nebel-control/dist/*.map
find /usr/share/decky-plugins/nebel-control -name __pycache__ -type d -prune -exec rm -rf {} +
chmod 0755 /usr/lib/decky-loader/nebel-decky-sync

decky_release="$(
    curl --retry 3 --retry-delay 2 -fsSL \
        https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases |
        jq -r 'first(.[])'
)"
decky_version="$(jq -r '.tag_name' <<<"${decky_release}")"
decky_url="$(jq -r '.assets[].browser_download_url | select(endswith("PluginLoader"))' <<<"${decky_release}")"
decky_service_url=https://raw.githubusercontent.com/SteamDeckHomebrew/decky-loader/main/dist/plugin_loader-prerelease.service

[[ -n "${decky_version}" && "${decky_version}" != "null" ]]
[[ -n "${decky_url}" && "${decky_url}" != "null" ]]

install -d -m 0755 /usr/share/decky-loader
curl --retry 3 --retry-delay 2 -fL -o /usr/share/decky-loader/PluginLoader "${decky_url}"
chmod 0755 /usr/share/decky-loader/PluginLoader
printf '%s\n' "${decky_version}" > /usr/share/decky-loader/.loader.version
decky_service_tmp="$(mktemp)"
curl --retry 3 --retry-delay 2 -fsSL "${decky_service_url}" |
    sed 's#${HOMEBREW_FOLDER}#/var/home/nebel/homebrew#g' \
        >"${decky_service_tmp}"
# Ship the unit under /usr/lib/systemd/system (the read-only, versioned OS
# tree) like every other nebel unit, not /etc/systemd/system: a unit *file*
# living in /etc puts its content through ostree's per-boot /etc 3-way merge
# on every update, not just the enable-state symlink. Confirmed to go missing
# after an OTA in practice - the enable symlink alone in /etc is the
# well-trodden, reliable path the rest of this codebase already uses.
install -D -m 0644 "${decky_service_tmp}" /usr/lib/systemd/system/plugin_loader.service
rm -f "${decky_service_tmp}"

systemctl enable nebel-decky-sync.service
systemctl enable plugin_loader.service
systemctl enable nebel-decky-watchdog.timer
