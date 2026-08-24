#!/bin/bash
set -euxo pipefail

cd /ctx/build_files

./10-base-packages.sh
./15-steamdeck-theme.sh
./20-install-kernel.sh
./30-install-steam-session.sh
./33-install-winetricks.sh
./35-install-emulators.sh
./40-vendor-system-files.sh
./45-install-decky-plugins.sh
./50-create-user.sh
./60-set-default-target.sh
./70-cleanup.sh
./80-finalize-update-state.sh
