# Shared storage between Nebel and Android userdata

## Goal
Allow files (ROMs, media, downloads, saves) to be used from both Android and
Nebel without duplicating them.

## Why Android `userdata` cannot be shared as `/home`

Android encrypts `/data` (the `userdata` partition) with **File-Based Encryption
(FBE)**. The encryption keys are:
- Tied to the Android user's lock-screen credentials.
- Stored in Android's Keymaster / vold, not available to a generic Linux OS.
- Bound to the device-binding keys introduced in modern Android versions.

When Nebel boots, it sees `userdata` as a raw encrypted block device. It cannot
mount it, cannot read it, and cannot use it as `/home`. This is not a missing
driver or configuration — it is by design.

## Why `userdata` cannot simply be formatted as ext4/exFAT

- Android expects `userdata` to be a valid FBE-capable filesystem (usually
  ext4/f2fs with encryption flags). Reformatting it would break Android boot and
  all installed apps/data.
- The current installer already shrinks `userdata` to create the Nebel root
  partition. The remaining `userdata` must stay Android-compatible.

## Practical options

### Option A — Shared exFAT partition (recommended for media/ROMs)

Shrink Android `userdata` by an additional amount (e.g. 32–128 GiB) and create a
new primary partition formatted as **exFAT** in the free space.

- Android mounts exFAT out of the box (modern Android + Linux both support it).
- Nebel can mount it at boot, e.g. `/mnt/shared`, and symlink into user home.
- **Limitation**: Steam cannot put its library here. Steam requires a POSIX
  filesystem with executable permissions, symlinks, and proper ownership
  (ext4/btrfs). exFAT lacks these. Use this partition only for media, ROMs,
  documents, non-Steam downloads, and save-file backups.

Implementation sketch for the installer:

```bash
# After creating the Nebel partition, from remaining free space next to userdata:
parted /dev/block/mmcblk0 -- mkpart shared fat32 <start> <end>
mkfs.exfat -L ARMADA_SHARED /dev/block/mmcblk0pX
```

Nebel side (persistent `/etc/fstab` entry):

```
UUID=<shared-part-uuid> /mnt/shared exfat defaults,uid=1000,gid=1000,umask=000 0 0
```

Then in the `armada` user's session:

```bash
mkdir -p /var/home/armada/Shared
mount --bind /mnt/shared /var/home/armada/Shared
```

### Option B — ext4/btrfs shared partition (better for Linux, worse for Android)

Same as Option A but format the shared partition as **ext4** or **btrfs**.

- Nebel works with it natively; Steam could even keep compatibility tools here
  (though SteamOS-style library still prefers POSIX).
- Android can read ext4 but only with root or special apps; ordinary Android
  file managers and games will not see it. This defeats the "common usage"
  goal unless the user is comfortable with root on Android.

### Option C — Leave Android `userdata` untouched, use SD card

If the device has a microSD slot, use a large SD card formatted exFAT or ext4.

- No repartitioning risk.
- Android and Nebel both see it.
- Same exFAT POSIX limitations as Option A.

### Option D — Mount Android `userdata` (not viable)

Attempting to mount the encrypted `userdata` from Nebel fails at the
encryption layer. The only way to make it work is to disable FBE in Android,
which is not supported on production devices and would factory-reset the device.

## Recommendation

Implement **Option A** in the installer: shrink `userdata` a little more and
add an exFAT "Shared" partition labeled `ARMADA_SHARED`. Expose it in the
armada user's home as `~/Shared` and document that Steam libraries must stay
on the Nebel root filesystem.

A runtime service (`nebel-shared-storage.service`) is provided: at boot it
looks for `/dev/disk/by-label/ARMADA_SHARED`, mounts it at `/mnt/shared`, and
bind-mounts it to `/var/home/armada/Shared` with `uid=1000,gid=1000,umask=000`
so both Android and the armada user can read/write media, ROMs, and downloads.
If the partition is absent, the service silently does nothing.

The Nebel Installer GUI asks for the shared partition size during a fresh
internal install.  Choose `0` to skip it entirely.  For an existing internal
install, boot from the SD card and run `nebel-installer add-shared` to shrink
the Nebel root partition and create `ARMADA_SHARED` without losing data.

This gives the user the "common usage" they asked for without breaking Android,
without requiring root on Android, and without trying to use an encrypted
partition as `/home`.
