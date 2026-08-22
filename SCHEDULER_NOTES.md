# Scheduler tuning — from `pocknix-os` research (2026-07-23)

Found via `shuuri-labs/pocknix-os`, a third-party Arch-based OS on the same
Retroid hardware family (RP5/RP6/Flip2) built on ROCKNIX's kernel - and,
confirmed via its own code comments, directly derived from our
`nebel-control` Decky plugin (`pocknix_control` mirrors our module
structure/naming almost 1:1, several files literally say "ported from
nebel's X.py"). Two scheduler-related things they carry that we don't.

## gamescope compositor on SCHED_RR — DISABLED, suspected of a full system hang (2026-07-23)

Shortly after this shipped via OTA, a real device hung completely (not
just gamescope - unresponsive to ping, not just SSH) specifically on a
Desktop <-> Gaming Mode transition, which restarts gamescope and causes
exactly the kind of thread churn that would matter here. Device access
wasn't available to confirm live at time of writing, but the mechanism
fits precisely: `kernel.sched_rt_runtime_us=-1` removes the RT throttle
that would otherwise cap a misbehaving SCHED_RR thread's CPU share, and
this device's `nmi_watchdog`/`soft_watchdog`/`watchdog` are all *already*
off (pre-existing, not from this change) - so a runaway RT thread has
nothing capping it and nothing to recover the system if it locks up a
core. Reverted both the service enable and the sysctl pending a real,
supervised on-device investigation - don't re-enable blind.

## gamescope compositor on SCHED_RR — originally shipped

Ported as `nebel-gamescope-rt` (`system_files/usr/libexec/nebel/`), a
root helper that polls for gamescope/gamescope-wl and promotes its normal
(non-batch) threads to `SCHED_RR` priority 40 via
`chrt -r --reset-on-fork -p 40 "$tid"`. `--reset-on-fork` is load-bearing:
without it, SCHED_RR is inherited across fork/clone, and gamescope's own
process tree forks the *entire* session (steam -> proton -> wine -> game)
- pocknix-os's own commit history documents omitting the flag reproducing
a priority-inversion hang (GPU usage collapsing to 0%, hitching) on
2026-07-03.

Paired with `kernel.sched_rt_runtime_us=-1` (RT throttle disabled) in
`system_files/usr/lib/sysctl.d/60-nebel-gaming.conf` - without it the
kernel's default 95%-per-period RT cap throttles the RR threads under
load, reproducing the exact stall this exists to prevent. Safe to disable
globally since no rtprio grant exists for the `armada` user
(`limits.d/60-nebel-gaming.conf`), so this doesn't open RT abuse from
unprivileged processes generally - only gamescope's own threads actually
run RT, and only because this helper explicitly puts them there.

pocknix-os's own on-device A/B: **"forcing RR did NOT change FPS - this is
for parity with ROCKNIX and frame-pacing, not a measured throughput win."**
Shipped anyway on the strength of their documented incident + the
`--reset-on-fork` safeguard; still wants a live A/B on our own hardware to
confirm no regression before calling it fully validated.

## scx_lavd (sched_ext BPF scheduler) — kernel prereqs now unblocked

`overlay/etc/systemd/system/pocknix-lavd.service` runs `scx_lavd`
(big.LITTLE/latency-aware) in `--autopilot` mode by default, chosen over
`--performance` for battery/heat/fan noise at idle.

Kernel-side blocker is now resolved. `CONFIG_SCHED_CLASS_EXT=y` and
`CONFIG_DEBUG_INFO_BTF=y` failed to survive Kconfig dependency resolution
twice before the real cause was found: plain arm64 `defconfig` sets
`CONFIG_DEBUG_INFO_REDUCED=y`, and `DEBUG_INFO_BTF` explicitly
`depends on !DEBUG_INFO_REDUCED` - a bool independent of the "Debug
information" DWARF-version choice, easy to miss since the build's own
validation only reports "not in final .config" with no hint of *which*
unmet dependency is the actual blocker. Confirmed via a direct
defconfig+merge probe run in the same builder container (no full kernel
build needed to iterate). Fix, now in
`armada-packages/kernel/config/armada-kernel.config.overrides`:
`CONFIG_BPF_JIT=y`, `CONFIG_DEBUG_INFO_DWARF5=y` (a real prompted choice
member, unlike bare `CONFIG_DEBUG_INFO=y` which has no prompt and is a
no-op on its own), `CONFIG_DEBUG_INFO_REDUCED` explicitly unset,
`CONFIG_SCHED_CLASS_EXT=y`, `CONFIG_DEBUG_INFO_BTF=y`. Kernel built clean
with these and is what's pinned in `Containerfile`'s `KERNEL_PKG` as of
this note.

Remaining work, not done yet: the `scx_lavd` binary itself (sched-ext/scx
project, Rust-based) isn't packaged - `/sys/kernel/sched_ext` now exists
but nothing loads a scheduler onto it. Their own service unit is worth
copying verbatim when this gets picked up - it's defensive by design:
`ConditionPathExists` guards on the sysfs paths so it no-ops cleanly if
they're ever missing, plus `StartLimitBurst` so a BPF load failure doesn't
crash-loop. Do this as its own pass with device access - a bad BPF
scheduler load is a different, less contained failure mode than the
gamescope RT change above.
