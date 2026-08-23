# Nebel OS

A SteamOS-like Linux distribution for ARM handhelds built on Fedora bootc using
device support from ROCKNIX.

Includes:
* ARM64 Steam
* Latest FEX
* CachyOS Proton 11
* Desktop mode (KDE)
* Bazaar App Store
* Waydroid (Android apps) with controller passthrough
* Heroic, ProtonPlus/ProtonUp-Qt, EmuDeck dependencies out of the box
* Real suspend (s2idle) with fast resume
* Over-the-air updates (cosign-signed, verified on-device)
* Install to internal storage (alongside Android)
* Power and fan control in the Steam UI
* Per-game FEX and Proton settings (Decky plugin)
* External display management from game mode
* RGB stick lighting studio with notification cascade
* Save & settings sync between devices (Syncthing)
* Built-in non-Steam game picker
* Ukrainian, Russian, Spanish and French UI localization

> [!WARNING]
> **Prototype software. Use at your own risk.** Nebel is under active
> development and is not stable. Booting it requires flashing an ABL which
> could brick your device or corrupt your Android partition.
>
> **Over-the-air updates are experimental.** Nebel can now update itself in
> place (see [Updating](#updating)) instead of reflashing, but the update path
> is still being validated. If an update fails, reflashing the SD card is the
> reliable recovery.
>
> **Nebel ships with a known default password.** The image ships with user
> `nebel` / password `nebel`. SSH is disabled by default, but if you enable it
> from Nebel Control, anyone on your network can log in until you change the
> password.

## About

Nebel is a standalone SteamOS-like OS for ARM64 handhelds. It grew out of
work around the [armada](https://github.com/virtudude/armada) codebase, but
the trees have diverged — different plumbing, drivers, release pipeline and
update channel — so it lives as its own project.

On top of the SM8550/SM8650/SM8750 device lineup, Nebel brings full support
for the **SM8250 Retroid family** — kernel and device trees, device profiles
(panel, gamepad, audio) — plus a stack of fixes that ended up being generally
useful beyond any single device:

- **Unified ROCKNIX-ABL boot for all supported SoCs (no GRUB).** ROCKNIX's
  [ABL](https://github.com/ROCKNIX/abl) (v1.1.6+) ships a per-device selection
  menu for SM8250 too, confirmed working on real Retroid Pocket Mini V2
  hardware, so every supported device now boots straight from the `/KERNEL`
  Android bootimg on the ESP and the ABL picks the right device tree itself.
  If you're on Mini V2, Retroid Pocket 5, or Flip 2, flash this ABL first
  (the SD image carries it under `rocknix_abl/SM8250/`).
- **A correct fix for Steam's oversized UI scale** on small high-DPI panels -
  the previous approach patched a part of Steam's config that gets recomputed
  from scratch on every launch, so it never survived a restart.
- **An InputPlumber patch** so `passthrough: true` actually works for gamepad
  source devices (upstream only wired it up for keyboards), fixing both a
  ghost/duplicate controller in Steam and enabling a second, non-exclusive
  reader of the raw device.
- **RGB stick lighting** (see [Stick RGB lighting](#stick-rgb-lighting)) - ten
  modes including a screen-color-reactive "Ambilight" mode, all configurable
  from Nebel Control.
- **SM8250 audio self-heal** — retries hard-failed LPASS probes at boot until
  the sound card assembles.
- **Boot-time stick auto-calibration** and a stable Wi-Fi MAC address
  (instead of trusting the factory "permanent" one).

The kernel/DTS side lives in
[Ga1dz1/armada-packages](https://github.com/Ga1dz1/armada-packages).

**Retroid Pocket Mini V2 (SM8250)** is tested on real hardware.
**Retroid Pocket 5 and Retroid Pocket Flip2** (both SM8250) have their device
trees ported from ROCKNIX and device profiles wired up, selectable from the
ABL's per-device menu - but are **less battle-tested**; panel orientation and
physical size in particular may need per-unit tweaks. Testing reports (and
fixes) are very welcome.

## Supported devices

| Device | SoC | Status |
|---|---|---|
| AYANEO Pocket EVO | SM8550 | ✅ Tested |
| AYN Odin 2 Portal | SM8550 | ✅ Tested |
| AYN Odin 2 Mini | SM8550 | ✅ Tested |
| AYN Odin 2 | SM8550 | ✅ Tested |
| AYN Thor | SM8550 | ✅ Tested |
| AYN Odin 3 | SM8750 | ✅ Tested |
| Retroid Pocket 6 | SM8550 | ✅ Tested |
| KONKR Pocket FIT (G3 Gen 3) | SM8650 | ✅ Tested |
| AYANEO Pocket S2 | SM8650 | ✅ Tested |
| AYANEO Pocket ACE | SM8550 | ✅ Tested |
| AYANEO Pocket DS | SM8550 | ✅ Tested |
| AYANEO Pocket DMG | SM8550 | ✅ Tested |
| AYANEO Pocket S 2K | SM8550 | ⚪ Untested |
| Retroid Pocket Mini V2 | SM8250 | ✅ Tested |
| Retroid Pocket 5 | SM8250 | 🚧 Work in progress |
| Retroid Pocket Flip 2 | SM8250 | 🚧 Work in progress |

## Flash to SD card

Nebel boots from SD card. Once it is running, you can optionally install it to
internal storage so it boots without the card (see
[Install to internal storage](#install-to-internal-storage)).

1. Flash the Nebel image to SD.

   Use Balena Etcher to flash the latest `nebel-YYYYMMDD.img.gz` image to a
   64GB or larger SD card (A2 speed for best results).

2. Flash the ROCKNIX ABL for your device.

   - Insert the SD card, boot into Android, and copy the `rocknix_abl` folder to
     the root of your internal storage.
   - Identify your SoC from the device table above (`SM8550`, `SM8650`,
     `SM8750`, or `SM8250`). Flashing the wrong SoC's ABL can brick the
     device, so match it carefully.
   - Using your device's built-in "run script as root" tool, browse to your SoC's
     subfolder (e.g. `rocknix_abl/SM8550`) and run `backup_abl.sh`.
   - Copy the backup (`abl_a.img` and `abl_b.img`, written into your SoC subfolder)
     to your PC for safekeeping.
   - Run `flash_abl.sh` the same way to flash the new ABL.

3. Boot from SD and set your device model and boot mode.

   - Reboot holding VOL- to enter the ABL menu.
   - In the ABL menu (navigate with VOL-/+, select with POWER):
     - Set your device model
     - Toggle boot mode to Linux
     - Choose Start to exit

4. Wait for Steam first-run setup.

   After the intro animation, the display may be black for up to 60 seconds
   before Steam appears. This is expected on the current SD card boot path.
   Eventually you will see Steam first-run where you can configure your
   language, timezone, and Wi-Fi. At the end Steam will restart again, and
   you may see another 60 seconds of black before the login screen appears.

## Install to internal storage

Once Nebel is running from the SD card, you can install it to the device's
internal storage so it boots without the card. Open **Desktop Mode** and launch
**Nebel Installer** from the **System** menu.

> [!WARNING]
> Installing to internal storage repartitions internal storage and can require a
> PC (`fastboot`) to recover from a failed install. In most cases your Android
> partition will need to be resized, which will cause a **factory-reset**. 

The installer checks what is already on internal storage and offers:

- **Install alongside Android** (fresh device): choose how much storage Android
  keeps; Nebel takes the rest. This **factory-resets Android** (you lose Android
  apps and data, but the Android system itself stays).
- **Reinstall / Switch to Nebel** (a ROCKNIX or Nebel install is already
  present): Nebel replaces the existing Linux install and **leaves Android
  untouched**, with no resize or wipe.
- **Remove and restore Android**: erase the Nebel/ROCKNIX install and give the
  whole disk back to Android (Android factory-resets on its next boot).

When it finishes, **power off, remove the SD card, then power on.** Internal
storage boots before the SD card.

If an install is interrupted, re-run Nebel Installer from the SD card to finish.
If the device will not boot the SD card at all, force it back to the card with
`fastboot erase ROCKNIX` (see [Uninstall](#uninstall) for the full steps).

## Uninstall / Reinstall

To remove or reinstall an internal install, run **Nebel Installer** from the
**SD card**. You cannot modify the partitions you are currently booted from, so
neither can be done from the internal install itself.

The catch is that the ABL bootloader prefers internal storage over the SD card,
so while Nebel is installed internally the device keeps booting the internal
copy even with the card inserted. You first have to erase Nebel's internal boot
partition over `fastboot` to force it back to the SD card.

1. **Enter the bootloader.** Power off, then hold **VOL-** while powering on and
   leave the device sitting in the bootloader.
2. **Erase the internal boot partition.** Connect the device to a PC and run:
   ```
   fastboot erase ROCKNIX
   ```
   Nebel's boot partition is named `ROCKNIX` so the ROCKNIX-derived ABL finds it.
3. **Boot Nebel from the SD card.** With the internal boot partition gone,
   reboot with the Nebel SD card inserted and it boots from the card.
4. **Run Nebel Installer.** Open **Desktop Mode** and launch **Nebel
   Installer**. It detects the existing internal install and offers two choices:
   - **Reinstall Nebel** (or **Switch to Nebel** if ROCKNIX is installed)
     replaces the Linux install and leaves your Android untouched.
   - **Remove & Restore Android** erases the install and gives the whole disk
     back to Android, which factory-resets on its next boot.

## Using Nebel

FEX (x86 translation) and CachyOS Proton 11 are set up out of the box, so for most
games you can just install from Steam and press play, with no extra setup. The
rest of Nebel works like SteamOS, and the Nebel-specific controls live in
**Nebel Control**, a Decky plugin in the Quick Access Menu, for tuning and the
occasional game that needs it.

### Quick Access Menu and Nebel Control

Press the **Steam** button to open the Quick Access Menu (on AYANEO devices the
QAM is unmapped, so use **Home + A**), then open **Nebel Control**. Every
section has a simplified view in the QAM; the full set of controls lives on
the fullscreen page (open it via **Open full screen** at the top):

- **Home.** System monitor (CPU/GPU temps, fan, battery) and quick toggles:
  FPS overlay, stick-LED notification flash.
- **Games.** Per-game compatibility: ARM64-native or x86_64 via FEX, FEX
  preset, resolution override, Proton selection. Add non-Steam games with the
  built-in file browser.
- **Display.** Internal/external display: primary display, resolution.
- **Power.** Fan curve, CPU/GPU clock limits, CPU underclock.
- **Lighting.** Stick lighting studio — see
  [Stick RGB lighting](#stick-rgb-lighting).
- **Sync.** Save/settings sync between devices over Syncthing: pairing,
  folder presets, custom folders.
- **System.** Controller emulation type (**Xbox 360**, **Steam Deck**, or
  **DualSense**), stick/trigger **calibration**, SSH, shared storage.

### Desktop mode

From the Steam power menu, choose **Switch to Desktop** for a full KDE Plasma
desktop. The **Bazaar** app store and the **Nebel Installer**
([Install to internal storage](#install-to-internal-storage)) live here. Use the
**Return to Gaming Mode** shortcut on the desktop to switch back.

### Power button and sleep

On SM8250 devices (Retroid Pocket Mini V2, 5, Flip 2) Nebel uses **real
s2idle suspend**: the power button puts the device to sleep and wakes it
quickly, with stick lighting and audio handled across the transition. Other
devices fall back to a "fake suspend" (inspired by ROCKNIX): it blanks the
screen and freezes the session, and the same press wakes it. Because those
devices do not truly sleep, their idle battery drain is higher.

### Stick RGB lighting

On devices whose analog sticks have addressable RGB (Retroid Pocket Mini V2,
Retroid Pocket 6), **Nebel Control > Lighting** controls them:

| Mode | Behavior |
|---|---|
| Static | A fixed color. |
| Breathing | The saved color, pulsing. |
| Rainbow | Hue cycles continuously. |
| Wave | The rainbow spread around each stick's LED ring. |
| Starlight | Zones twinkle at random. |
| Spin | A lit zone travels around the ring. |
| Reactive | Stick deflection and button presses drive the light; per-button flash colors. |
| Multidot | Three colored dots (red/green/blue) chase each other around the zones. |
| Ambilight | Each stick tracks the average color of the screen near its own side. |
| Duotone | Two-color split of the ring (horizontal/vertical/diagonal), with optional "seesaw" breathing between the groups. |

Extras: **Battery level** as a color source (red → yellow → green) with an
optional spinning charging indicator, **Compass** (lit zones follow the stick's
push direction), per-stick independent configuration, a 180° ring flip for
upside-down stick variants, and a **notification cascade** — incoming
notifications flash the sticks top-pair then bottom-pair. A **Follow screen
brightness** toggle scales everything by the display's backlight level.

## Updating

> [!NOTE]
> Over-the-air updates are new and still being validated. You may need to reflash
> if an update fails.

Nebel can update itself in place, with no reflash and no need to redownload
games. Images are cosign-signed and verified on-device before they can boot.
Choose an update channel and trigger the update from Steam's system settings:

- **Stable** is recommended for normal use. It receives builds after they have
  been through release testing.
- **Testing** is the bleeding edge channel. It follows the latest commits on
  `main` and may contain changes that are incomplete or have received little
  on device testing.

## Known issues

- **Black screen during Steam launch.** Sometimes there is a 30-60s black screen
  before Steam becomes fully visible, often following an update or restart.
- **Compiling shaders message during gameplay.** This was a change made in a
  recent version of CachyOS Proton 11 (ARM) that will be disabled in a future
  Nebel release.
- **Red tint.** Some devices show a red tint on the panel after Steam
  restart. It is intermittent and a reboot clears it.
- **QAM is unmapped on Ayaneo devices.** Use Home+A to open the Quick Access Menu.
- **No audio after resume on some devices.** Sometimes audio is silent after
  waking from sleep until the device is restarted. A known cause on SM8250
  devices (Retroid Pocket Mini V2, 5, Flip2) has a targeted fix (bouncing
  PipeWire's graph quantum post-resume); not yet confirmed to cover every
  device or every case.

## Community

Join the Discord: [discord.gg/HdmdSxTD5S](https://discord.gg/HdmdSxTD5S)

## Credits

- **[armada](https://github.com/virtudude/armada):** the codebase Nebel grew
  out of; large parts of the device enablement and image structure started
  there.
- **[ROCKNIX](https://github.com/ROCKNIX):** bootloader, device support,
  input mappings, audio profiles, and more.
- **[Bazzite](https://github.com/ublue-os/bazzite)** and the
  **[Universal Blue](https://github.com/ublue-os)** ecosystem: the bootc/image
  build structure, the [image-template](https://github.com/ublue-os/image-template)
  this repo is built from, and Steam/Gamescope session patterns.
- **Fedora** and the **[bootc](https://github.com/bootc-dev/bootc)** project: the
  base image and tooling.

## License

Nebel's own code is **GPL-2.0-or-later**. If you modify and distribute it, your
changes stay open under the same terms. Bundled components keep their upstream
licenses. See [`LICENSE.md`](LICENSE.md).
