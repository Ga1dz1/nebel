# Armada

A SteamOS-like Linux distribution for ARM handhelds built on Fedora bootc using
device support from ROCKNIX.

Includes:
* ARM64 Steam
* Latest FEX
* CachyOS Proton 11
* Desktop mode (KDE)
* Bazaar App Store
* Over-the-air updates
* Install to internal storage (alongside Android)
* Power and fan control in the Steam UI
* Per-game FEX and Proton settings (Decky plugin)

> [!WARNING]
> **Prototype software. Use at your own risk.** Armada is under active
> development and is not stable. Booting it requires flashing an ABL which
> could brick your device or corrupt your Android partition.
>
> **Over-the-air updates are experimental.** Armada can now update itself in
> place (see [Updating](#updating)) instead of reflashing, but the update path
> is still being validated. If an update fails, reflashing the SD card is the
> reliable recovery.
>
> **Armada ships with a known default password.** The image ships with user
> `armada` / password `armada`. SSH is disabled by default, but if you enable it
> from Armada Control, anyone on your network can log in until you change the
> password.

## About this fork

This fork adds **Retroid Pocket Mini V2 (SM8250)** support on top of upstream
[virtudude/armada](https://github.com/virtudude/armada): kernel/device-tree
support for the SM8250 SoC, a device profile (panel, gamepad, audio), and a
few fixes that ended up being generally useful beyond just this one device:

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
  from Armada Control.

The kernel/DTS side lives in
[Ga1dz1/armada-packages](https://github.com/Ga1dz1/armada-packages), also a
fork of virtudude's own
[armada-packages](https://github.com/virtudude/armada-packages).

**Retroid Pocket 5 and Retroid Pocket Flip2** (both SM8250) have their device
trees ported from ROCKNIX and device profiles wired up, selectable from the
ABL's per-device menu - but **completely
unverified**, with no hardware to test any of it on yet. Panel orientation
and physical size in particular are first guesses, not measured values;
audio is assumed to work off the same generic UCM2 profile Mini V2 uses,
also unconfirmed. If you have one of these devices, testing reports (and
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

Armada boots from SD card. Once it is running, you can optionally install it to
internal storage so it boots without the card (see
[Install to internal storage](#install-to-internal-storage)).

1. Flash the Armada image to SD.

   Use Balena Etcher to flash the latest `armada-YYYYMMDD.img.gz` image to a
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

Once Armada is running from the SD card, you can install it to the device's
internal storage so it boots without the card. Open **Desktop Mode** and launch
**Armada Installer** from the **System** menu.

> [!WARNING]
> Installing to internal storage repartitions internal storage and can require a
> PC (`fastboot`) to recover from a failed install. In most cases your Android
> partition will need to be resized, which will cause a **factory-reset**. 

The installer checks what is already on internal storage and offers:

- **Install alongside Android** (fresh device): choose how much storage Android
  keeps; Armada takes the rest. This **factory-resets Android** (you lose Android
  apps and data, but the Android system itself stays).
- **Reinstall / Switch to Armada** (a ROCKNIX or Armada install is already
  present): Armada replaces the existing Linux install and **leaves Android
  untouched**, with no resize or wipe.
- **Remove and restore Android**: erase the Armada/ROCKNIX install and give the
  whole disk back to Android (Android factory-resets on its next boot).

When it finishes, **power off, remove the SD card, then power on.** Internal
storage boots before the SD card.

If an install is interrupted, re-run Armada Installer from the SD card to finish.
If the device will not boot the SD card at all, force it back to the card with
`fastboot erase ROCKNIX` (see [Uninstall](#uninstall) for the full steps).

## Uninstall / Reinstall

To remove or reinstall an internal install, run **Armada Installer** from the
**SD card**. You cannot modify the partitions you are currently booted from, so
neither can be done from the internal install itself.

The catch is that the ABL bootloader prefers internal storage over the SD card,
so while Armada is installed internally the device keeps booting the internal
copy even with the card inserted. You first have to erase Armada's internal boot
partition over `fastboot` to force it back to the SD card.

1. **Enter the bootloader.** Power off, then hold **VOL-** while powering on and
   leave the device sitting in the bootloader.
2. **Erase the internal boot partition.** Connect the device to a PC and run:
   ```
   fastboot erase ROCKNIX
   ```
   Armada's boot partition is named `ROCKNIX` so the ROCKNIX-derived ABL finds it.
3. **Boot Armada from the SD card.** With the internal boot partition gone,
   reboot with the Armada SD card inserted and it boots from the card.
4. **Run Armada Installer.** Open **Desktop Mode** and launch **Armada
   Installer**. It detects the existing internal install and offers two choices:
   - **Reinstall Armada** (or **Switch to Armada** if ROCKNIX is installed)
     replaces the Linux install and leaves your Android untouched.
   - **Remove & Restore Android** erases the install and gives the whole disk
     back to Android, which factory-resets on its next boot.

## Using Armada

FEX (x86 translation) and CachyOS Proton 11 are set up out of the box, so for most
games you can just install from Steam and press play, with no extra setup. The
rest of Armada works like SteamOS, and the Armada-specific controls live in
**Armada Control**, a Decky plugin in the Quick Access Menu, for tuning and the
occasional game that needs it.

### Quick Access Menu and Armada Control

Press the **Steam** button to open the Quick Access Menu (on AYANEO devices the
QAM is unmapped, so use **Home + A**), then open **Armada Control**. It has three
tabs:

- **Power.** Pick a profile: **Eco**, **Balanced**, or **Performance**. Each sets
  a fan curve, CPU underclock, and a GPU clock range. Profiles are editable in
  **Armada Control**.
- **Compatibility.** Per-game resolution and FEX settings. Pick a FEX preset
  (**Default**, **Fast**, **Compatible**, or **Custom**). The defaults work for
  most titles; change these only if a game misbehaves. Settings are saved per game.
- **Settings.** Choose the controller emulation type (**Xbox 360**, **Steam
  Deck**, or **DualSense**), launch stick and trigger **calibration**, adjust
  system options, and (on devices with RGB analog sticks, currently Retroid
  Pocket Mini V2) configure **Stick Lighting** - see
  [Stick RGB lighting](#stick-rgb-lighting).

### Desktop mode

From the Steam power menu, choose **Switch to Desktop** for a full KDE Plasma
desktop. The **Bazaar** app store and the **Armada Installer**
([Install to internal storage](#install-to-internal-storage)) live here. Use the
**Return to Gaming Mode** shortcut on the desktop to switch back.

### Power button and sleep

Pressing the power button does a "fake suspend" (inspired by ROCKNIX) rather than
real S3 sleep: it blanks the screen and freezes the session, and the same press
wakes it. Because the device does not truly sleep, idle battery drain is higher
than it would be with real suspend.

### Stick RGB lighting

On devices whose analog sticks have addressable RGB (currently Retroid Pocket
Mini V2), **Armada Control > Settings > Stick Lighting** controls them:

| Mode | Behavior |
|---|---|
| Static | A fixed color. |
| Breathing | The saved color, pulsing. |
| Battery | Color follows battery level (red → yellow → green), solid green while charging. |
| Battery + Breathing | Battery color, pulsing. |
| Rainbow | Hue cycles continuously. |
| Chase | A lit zone with a fading tail travels around each stick's 4 zones. |
| Alternating | Breathing, but the left and right sticks are 180° out of phase. |
| Reactive | Each stick's own deflection drives its brightness and hue (centered = off); each button press flashes both sticks in that button's own color. |
| Multidot | Three colored dots (red/green/blue) chase each other around each stick's zones. |
| Ambilight | Each stick tracks the average color of the screen near its own side. |

Most modes have per-mode **Speed**, **Intensity**, and/or **Size** sliders, and
Reactive lets you set a different flash color per button. A **Follow screen
brightness** toggle scales all of the above by the display's current backlight
level.

## Updating

> [!NOTE]
> Over-the-air updates are new and still being validated. You may need to reflash
> if an update fails.

Armada can update itself in place, with no reflash and no need to redownload
games. Choose an update channel and trigger the update from Steam's system
settings:

- **Beta** is recommended for normal use. It receives builds after they have
  been through release testing.
- **Preview** is the bleeding edge channel. It follows the latest commits on
  `main` and may contain changes that are incomplete or have received little
  on device testing.

## Known issues

- **Black screen during Steam launch.** Sometimes there is a 30-60s black screen
  before Steam becomes fully visible, often following an update or restart.
- **Compiling shaders message during gameplay.** This was a change made in a
  recent version of CachyOS Proton 11 (ARM) that will be disabled in a future
  Armada release.
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

- **[ROCKNIX](https://github.com/ROCKNIX):** bootloader, device support,
  input mappings, audio profiles, and more.
- **[Bazzite](https://github.com/ublue-os/bazzite)** and the
  **[Universal Blue](https://github.com/ublue-os)** ecosystem: the bootc/image
  build structure, the [image-template](https://github.com/ublue-os/image-template)
  this repo is built from, and Steam/Gamescope session patterns.
- **Fedora** and the **[bootc](https://github.com/bootc-dev/bootc)** project: the
  base image and tooling.

## License

Armada's own code is **GPL-2.0-or-later**. If you modify and distribute it, your
changes stay open under the same terms. Bundled components keep their upstream
licenses. See [`LICENSE.md`](LICENSE.md).
