#!/bin/bash
set -euxo pipefail

# Gaming optimizations (1.4.4).
#
# scx_lavd: sched-ext BPF scheduler (lineage: pocknix/ROCKNIX/Bazzite) for
# frame pacing on big.LITTLE ARM. The unit that runs it
# (nebel-scx.service) is OFF by default and gated behind a UI toggle + a
# ConditionPathExists on the binary - installing the package here only
# makes the opt-in possible, it changes nothing at runtime.
#
# scx-scheds is not in Fedora proper; Terra (repos.fyralabs.com, already
# enabled system-wide by 10-base-packages.sh) ships it for aarch64.

dnf5 -y install --setopt=install_weak_deps=False scx-scheds

# Sanity: the UI toggle and nebel-scx.service key off /usr/bin/scx_lavd.
command -v scx_lavd
