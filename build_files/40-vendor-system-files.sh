#!/bin/bash
set -euxo pipefail

cp -a /ctx/system_files/. /
install -Dpm 0755 /packages/extest/libextest.so /usr/lib/extest/libextest.so

# mkbootimg must be present for on-device /KERNEL rebuilds after OTA.
install -Dpm 0755 /ctx/build_files/vendor/mkbootimg/mkbootimg.py /usr/libexec/nebel/mkbootimg.py
install -Dpm 0755 /ctx/build_files/vendor/mkbootimg/gki/generate_gki_certificate.py /usr/libexec/nebel/gki/generate_gki_certificate.py
sha256sum -c <<'EOF'
37d84b3d162e0bc62e36c1f4e1c63c85ea0caa9f29be023eb2f8efe006ad948c  /usr/libexec/nebel/mkbootimg.py
1bb1feec68a13da18d581aa2c631798f86f6bc10b55d587b2dd31446a0f8a203  /usr/libexec/nebel/gki/generate_gki_certificate.py
EOF

chmod 0755 /usr/libexec/nebel/*
chmod 0755 /usr/libexec/os-session-select

sed -i '/const allPanels/,$d' /usr/share/plasma/layout-templates/org.kde.plasma.desktop.defaultPanel/contents/layout.js
sed -i '$r /usr/share/plasma/shells/org.kde.plasma.desktop/contents/updates/nebel-pins.js' /usr/share/plasma/layout-templates/org.kde.plasma.desktop.defaultPanel/contents/layout.js

find /etc/NetworkManager/system-connections -name '*.nmconnection' -exec chmod 0600 {} + -exec chown root:root {} + 2>/dev/null || true
chmod 0440 /etc/sudoers.d/nebel-shared-storage 2>/dev/null || true
chmod 0440 /etc/sudoers.d/nebel-session-control 2>/dev/null || true

systemctl disable getty@tty1.service || true
systemctl disable sshd.service || true
systemctl enable sddm.service
systemctl enable nebel-migrate-user.service
systemctl enable nebel-session-default.service
systemctl enable seatd.service
systemctl enable nebel-input-calibration.service
systemctl enable nebel-gamepad-autocal.service
systemctl enable nebel-controller-type.service
systemctl enable inputplumber.service
systemctl enable nebel-device-quirks.service
systemctl enable nebel-first-boot-reboot.service
systemctl enable nebel-stick-led.service
systemctl enable nebel-brightness-sync.service
systemctl enable nebel-fixups.service
systemctl enable nebel-installer-visibility.service
systemctl enable nebel-steamapps.service
systemctl enable nebel-powerd.service
systemctl enable nebel-audio-resume.service
systemctl enable nebel-audio-heal.service
systemctl enable nebel-abl-update.service
systemctl enable nebel-desktop-hotkeys.service
systemctl enable nebel-led-notify.service
systemctl enable nebel-steamui-watchdog.service
# Disabled - see git history: suspected of causing a full, unrecoverable
# system hang (not just gamescope) on Desktop <-> Gaming Mode transitions.
# An unthrottled (kernel.sched_rt_runtime_us=-1, reverted alongside this)
# SCHED_RR thread with no preemption cap can starve the whole machine,
# including networking, if anything about it doesn't behave the way a
# healthy compositor thread should during the thread churn a session
# restart causes - exactly the failure mode observed. Needs a real,
# supervised on-device A/B before re-enabling, not a blind re-add.
# systemctl enable nebel-gamescope-rt.service
systemctl enable nebel-control.service
systemctl enable nebel-steamos-manager.service
systemctl --global enable nebel-steamos-manager.service
systemctl enable nebel-bootimg-sync.service
systemctl enable nebel-flatpak-setup.service
systemctl enable nebel-shared-storage.service
systemctl enable nebel-waydroid-input.path
# waydroid-container.service would auto-start Waydroid's LXC session on
# every boot; leave it opt-in (launched by Waydroid's own UI/CLI) rather
# than always-on background overhead for people who never use it.
systemctl disable waydroid-container.service

# Updates are manual (Steam UI / steamos-update). The base image enables this
# timer, which would auto-pull multi-GB images on metered tethering. Opt in with
# `systemctl unmask --now bootc-fetch-apply-updates.timer`.
systemctl mask bootc-fetch-apply-updates.timer

# bootupd targets UEFI bootloaders.
systemctl mask bootloader-update.service

# irqbalance re-spreads IRQs across all cores, overriding Nebel's IRQ affinity policy.
systemctl mask irqbalance.service

# Only plain suspend is supported (via the suspend-dispatch drop-in); mask the rest.
systemctl mask systemd-hibernate.service systemd-hybrid-sleep.service systemd-suspend-then-hibernate.service
