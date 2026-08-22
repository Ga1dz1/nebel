#!/bin/bash
set -euxo pipefail

# useradd misses groups defined in /usr/lib/group.
systemd-sysusers
for group in wheel video render input audio seat gamemode; do
    gid=$(getent group "$group" | cut -d: -f3)
    [[ -n "$gid" ]] || { echo "ERROR: missing group: $group" >&2; exit 1; }
    if ! grep -q "^${group}:" /etc/group; then
        echo "${group}:x:${gid}:nebel" >> /etc/group
    elif ! id -nG nebel | grep -qw "$group"; then
        gpasswd -a nebel "$group"
    fi
done

install -d -m 0700 -o nebel -g nebel /var/home/nebel
# Seed the home dir from /etc/skel (the Vapor KDE defaults live there);
# plain `install -d` alone leaves the home empty and Plasma falls back to
# its own Breeze Twilight default instead of our theme.
cp -a /etc/skel/. /var/home/nebel/
chown -R nebel:nebel /var/home/nebel
chmod 0700 /var/home/nebel
install -Dpm 0755 -o nebel -g nebel \
    /usr/share/applications/nebel-return-to-gamemode.desktop \
    /var/home/nebel/Desktop/nebel-return-to-gamemode.desktop

echo 'nebel:nebel' | chpasswd

cat > /etc/sudoers.d/nebel-user <<'EOF'
%wheel ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart sddm
%wheel ALL=(ALL) NOPASSWD: /usr/bin/systemctl start sddm
%wheel ALL=(ALL) NOPASSWD: /usr/bin/systemctl stop sddm
%wheel ALL=(ALL) NOPASSWD: /usr/bin/systemctl poweroff
%wheel ALL=(ALL) NOPASSWD: /usr/bin/systemctl reboot
%wheel ALL=(ALL) NOPASSWD: /usr/libexec/nebel/session-control switch-desktop
%wheel ALL=(ALL) NOPASSWD: /usr/libexec/nebel/session-control switch-gamemode
%wheel ALL=(ALL) NOPASSWD: /usr/libexec/nebel/session-control default-gamemode
%wheel ALL=(ALL) NOPASSWD: /usr/libexec/nebel/nebel-installer *
EOF
chmod 0440 /etc/sudoers.d/nebel-user
