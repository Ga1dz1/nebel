# Nebel OS

A SteamOS-like Linux distribution for ARM handhelds built on Fedora bootc.

Includes:
* ARM64 Steam
* x86/x86_64 game emulation
* CachyOS Proton 11
* Desktop mode (KDE)
* Bazaar App Store
* Waydroid (Android apps) with controller passthrough
* Heroic, ProtonPlus/ProtonUp-Qt, EmuDeck dependencies out of the box
* Real suspend with fast resume
* Over-the-air updates (signed and verified on-device)
* Install to internal storage (alongside Android)
* Power and fan control in the Steam UI
* Per-game compatibility and Proton settings built into Steam
* External display management from game mode
* RGB stick lighting studio with notification cascade
* Save & settings sync between devices
* Built-in non-Steam game picker
* Ukrainian, Spanish and French UI localization

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
- **SM8250 audio self-heal** — the sound card is brought up reliably at
  every boot, no manual intervention.
- **Stick auto-calibration** at boot and a stable Wi-Fi MAC address.

The kernel/DTS side lives in
[Ga1dz1/armada-packages](https://github.com/Ga1dz1/armada-packages).

**Retroid Pocket Mini V2 (SM8250)** is tested on real hardware.
**Retroid Pocket 5, Retroid Pocket Flip2 and Retroid Pocket Mini** (all
SM8250) have their device trees ported from ROCKNIX and device profiles
wired up, selectable from the ABL's per-device menu - but are **less
battle-tested**; panel orientation and physical size in particular may need
per-unit tweaks. Testing reports (and fixes) are very welcome.

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
| Retroid Pocket Mini | SM8250 | 🚧 Work in progress |
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

x86/x86_64 emulation and CachyOS Proton 11 are set up out of the box, so for
most games you can just install from Steam and press play, with no extra setup. The
rest of Nebel works like SteamOS, and the Nebel-specific controls live in
**Nebel Control**, built into Steam's own menus, for tuning and the
occasional game that needs it.

### Quick Access Menu and Nebel Control

Press the **Back** button to open the Quick Access Menu (on AYANEO devices the
QAM is unmapped, so use **Home + A**), then open **Nebel Control**. Every
section has a simplified view in the QAM; the full set of controls lives on
the fullscreen page (open it via **Open full screen** at the top):

- **Home.** System monitor (CPU/GPU temps, fan, battery) and quick toggles:
  FPS overlay, stick-LED notification flash.
- **Games.** Per-game compatibility: ARM64-native or x86_64, emulation
  preset, per-game graphics-layer versions, resolution override, Proton
  selection. Add non-Steam games with the built-in file browser.
- **Display.** Internal/external display: primary display, resolution.
- **Power.** Fan curve, CPU/GPU clock limits, CPU underclock.
- **Lighting.** Stick lighting studio — see
  [Stick RGB lighting](#stick-rgb-lighting).
- **Sync.** Save/settings sync between devices: pairing,
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
suspend**: the power button puts the device to sleep and wakes it
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
games. Images are signed and verified on-device before they can boot.
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

## ☕ Support the Project

Nebel is completely free and open-source. If you enjoy this custom OS and want to support further development (or just buy me a coffee for the late-night coding sessions), feel free to drop a tip!

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/gaidzi)

Huge thanks to everyone who helps keep the project moving forward!

---

**Nebel OS** — операційна система для ARM-портативок у дусі SteamOS, збудована
на Fedora bootc.

До складу входять:
* Повноцінний ARM64 Steam
* Емуляція x86/x86_64-ігор
* CachyOS Proton 11
* Режим робочого столу (KDE)
* Крамниця застосунків Bazaar
* Waydroid (Android-застосунки) із пробросом ґеймпада
* Heroic, ProtonPlus/ProtonUp-Qt, залежності EmuDeck — з коробки
* Справжній сон із блискавичним пробудженням
* Оновлення «по повітрю» (підписані, перевіряються на пристрої)
* Встановлення у внутрішню пам'ять — поруч із Android
* Керування живленням і вентилятором просто в інтерфейсі Steam
* Повігорні налаштування сумісності й Proton, вбудовані в Steam
* Керування зовнішнім екраном із ігрового режиму
* Студія RGB-підсвітки стіків із каскадом сповіщень
* Синхронізація збережень і налаштувань між пристроями
* Вбудований засіб додавання сторонніх ігор

> [!WARNING]
> **Прототип. Використовуйте на власний ризик.** Nebel перебуває в активній
> розробці й не є стабільною. Для завантаження потрібно прошити ABL — помилка
> може «цеглинити» пристрій або пошкодити розділ Android.
>
> **Оновлення «по повітрю» експериментальні.** Nebel вже вміє оновлюватися на
> місці (див. [Оновлення](#оновлення)), без перепрошивки, проте цей шлях іще
> випробовується. Якщо оновлення зірветься — надійне відновлення: перезаписати
> SD-карту.
>
> **Nebel постачається з відомим типовим паролем.** Користувач `nebel`, пароль
> `nebel`. SSH типово вимкнений, але якщо ви ввімкнете його в Nebel Control —
> будь-хто у вашій мережі зможе увійти, доки ви не зміните пароль.

## Про проєкт

Nebel — самостійна операційна система для ARM64-портативок у дусі SteamOS.
Вона виросла з роботи довкола кодової бази [armada](https://github.com/virtudude/armada),
та дерева розійшлися — власна обв'язка, драйвери, конвеєр релізів і канал
оновлень — тому проєкт живе сам по собі.

Окрім лінійки пристроїв на SM8550/SM8650/SM8750, Nebel приносить повну
підтримку **родини SM8250 Retroid** — ядро й дерева пристроїв, профілі
(панель, ґеймпад, звук) — а також низку виправлень, які виявилися корисними
далеко поза межами одного пристрою:

- **Єдине завантаження через ROCKNIX-ABL для всіх підтримуваних SoC (без
  GRUB).** [ABL](https://github.com/ROCKNIX/abl) від ROCKNIX (v1.1.6+) має меню
  вибору пристрою й для SM8250 — перевірено на справжньому Retroid Pocket
  Mini V2, — тож кожен підтримуваний пристрій стартує просто з Android
  bootimg `/KERNEL` на ESP, а ABL сам обирає правильне дерево. Якщо у вас
  Mini V2, Retroid Pocket 5 або Flip 2 — спершу прошийте цей ABL (на
  SD-образі він лежить у `rocknix_abl/SM8250/`).
- **Правильне виправлення завеликого масштабу Steam UI** на малих
  високощільних панелях — попередній підхід латав ту частину конфіґурації
  Steam, яку той перераховує наново при кожному запуску, тож після
  перезапуску все поверталося.
- **Патч InputPlumber**: `passthrough: true` нарешті справді працює для
  ґеймпадів як джерел (в апстрімі це було зведено лише для клавіатур) — це
  прибрало «примарний» дубль контролера в Steam й дало змогу другому,
  неексклюзивному читачеві працювати з сирим пристроєм.
- **RGB-підсвітка стіків** (див. [Підсвітка стіків](#підсвітка-стіків)) —
  десять режимів, включно з «Ambilight», що слідкує за кольорами екрана; усе
  налаштовується з Nebel Control.
- **Самозцілення звуку на SM8250** — звукова карта надійно підводиться при
  кожному завантаженні, без ручного втручання.
- **Автокалібрування стіків** та стабільна MAC-адреса Wi-Fi.

Ядро й дерева пристроїв живуть у
[Ga1dz1/armada-packages](https://github.com/Ga1dz1/armada-packages).

**Retroid Pocket Mini V2 (SM8250)** випробувано на справжньому залізі.
**Retroid Pocket 5, Retroid Pocket Flip2 і Retroid Pocket Mini** (усі SM8250)
мають портовані з ROCKNIX дерева пристроїв і під'єднані профілі, доступні з
меню ABL, — проте **менш обстріляні**; зокрема, орієнтація панелі та її
фізичний розмір можуть потребувати підлаштування під конкретний екземпляр.
Звіти з випробувань (і виправлення) дуже вітаються.

## Підтримувані пристрої

| Пристрій | SoC | Статус |
|---|---|---|
| AYANEO Pocket EVO | SM8550 | ✅ Випробувано |
| AYN Odin 2 Portal | SM8550 | ✅ Випробувано |
| AYN Odin 2 Mini | SM8550 | ✅ Випробувано |
| AYN Odin 2 | SM8550 | ✅ Випробувано |
| AYN Thor | SM8550 | ✅ Випробувано |
| AYN Odin 3 | SM8750 | ✅ Випробувано |
| Retroid Pocket 6 | SM8550 | ✅ Випробувано |
| KONKR Pocket FIT (G3 Gen 3) | SM8650 | ✅ Випробувано |
| AYANEO Pocket S2 | SM8650 | ✅ Випробувано |
| AYANEO Pocket ACE | SM8550 | ✅ Випробувано |
| AYANEO Pocket DS | SM8550 | ✅ Випробувано |
| AYANEO Pocket DMG | SM8550 | ✅ Випробувано |
| AYANEO Pocket S 2K | SM8550 | ⚪ Не випробувано |
| Retroid Pocket Mini V2 | SM8250 | ✅ Випробувано |
| Retroid Pocket Mini | SM8250 | 🚧 У роботі |
| Retroid Pocket 5 | SM8250 | 🚧 У роботі |
| Retroid Pocket Flip 2 | SM8250 | 🚧 У роботі |

## Запис на SD-карту

Nebel завантажується з SD-карти. Коли система вже працює, її можна за бажанням
встановити у внутрішню пам'ять, щоб вона завантажувалася без карти (див.
[Встановлення у внутрішню пам'ять](#встановлення-у-внутрішню-память)).

1. Запишіть образ Nebel на SD.

   Скористайтеся Balena Etcher, щоб записати найсвіжіший образ
   `nebel-YYYYMMDD.img.gz` на SD-карту від 64 ГБ (клас A2 дасть найкращу
   швидкість).

2. Прошийте ROCKNIX ABL для свого пристрою.

   - Вставте SD-карту, завантажтеся в Android і скопіюйте теку `rocknix_abl` у
     корінь внутрішньої пам'яті.
   - Визначте свій SoC за таблицею вище (`SM8550`, `SM8650`, `SM8750` або
     `SM8250`). Прошивка чужого ABL може «цеглинити» пристрій — звірте
     уважно.
   - Штатним інструментом пристрою «запустити скрипт від root» відкрийте теку
     свого SoC (наприклад, `rocknix_abl/SM8550`) і запустіть `backup_abl.sh`.
   - Скопіюйте бекап (`abl_a.img` та `abl_b.img`, вони з'являться у теці вашого
     SoC) на ПК для сховку.
   - Так само запустіть `flash_abl.sh`, щоб прошити новий ABL.

3. Завантажтеся з SD і виберіть модель пристрою та режим.

   - Перезавантажтеся із затиснутою VOL-, щоб увійти в меню ABL.
   - У меню ABL (навігація VOL-/+, вибір — POWER):
     - Вкажіть модель пристрою
     - Перемкніть режим завантаження на Linux
     - Виберіть Start для виходу

4. Дочекайтеся першого запуску Steam.

   Після вступної анімації екран може лишатися чорним до 60 секунд, перш ніж
   з'явиться Steam. Це очікувано на нинішньому шляху завантаження з SD. Згодом
   ви побачите перший запуск Steam, де можна вибрати мову, часовий пояс і
   Wi-Fi. Наприкінці Steam перезапуститься, і може бути ще до 60 секунд
   чорного екрана перед екраном входу.

## Встановлення у внутрішню пам'ять

Коли Nebel уже працює з SD-карти, його можна встановити у внутрішню пам'ять
пристрою, щоб він завантажувався без карти. Відкрийте **режим робочого столу**
й запустіть **Nebel Installer** з меню **System**.

> [!WARNING]
> Встановлення у внутрішню пам'ять перерозмічує її, й у разі невдачі може
> знадобитися ПК (`fastboot`) для відновлення. У більшості випадків розділ
> Android доведеться стиснути, що спричинить **скидання до заводських**.

Інсталятор перевіряє, що вже є у внутрішній пам'яті, і пропонує:

- **Встановити поруч із Android** (чистий пристрій): виберіть, скільки місця
  лишити Android; решту забере Nebel. Це **скидає Android до заводських**
  (застосунки й дані Android зникнуть, але сама система Android лишиться).
- **Перевстановити / Перейти на Nebel** (ROCKNIX або Nebel уже встановлені):
  Nebel заміщує наявну Linux-установку й **не чіпає Android** — без
  перерозмітки й стирання.
- **Видалити й повернути Android**: стерти установку Nebel/ROCKNIX і віддати
  весь диск Android (Android скинеться до заводських при наступному
  завантаженні).

Наприкінці **вимкніть пристрій, вийміть SD-карту, потім увімкніть.** Внутрішня
пам'ять завантажується раніше за SD-карту.

Якщо встановлення перервалося, запустіть Nebel Installer із SD-карти ще раз,
щоб довести до кінця. Якщо пристрій узагалі не завантажує SD, поверніть його
на карту через `fastboot erase ROCKNIX` (повні кроки — у
[Видаленні](#видалення--перевстановлення)).

## Видалення / Перевстановлення

Щоб видалити чи перевстановити внутрішню установку, запустіть **Nebel
Installer** з **SD-карти**. Розділи, з яких ви зараз завантажені, змінювати
не можна — тож зі внутрішньої установки цього не зробити.

Заковика в тому, що завантажувач ABL надає перевагу внутрішній пам'яті над
SD-картою: поки Nebel встановлений внутрішньо, пристрій завантажує внутрішню
копію, навіть якщо карта вставлена. Тож спершу треба стерти внутрішній
завантажувальний розділ Nebel через `fastboot`, щоб повернутися на SD.

1. **Увійдіть у завантажувач.** Вимкніть пристрій, тоді затисніть **VOL-**
   під час вмикання й лишіть його в завантажувачі.
2. **Стерить внутрішній завантажувальний розділ.** Під'єднайте пристрій до ПК
   й виконайте:
   ```
   fastboot erase ROCKNIX
   ```
   Завантажувальний розділ Nebel зветься `ROCKNIX`, щоб його знаходив
   похідний від ROCKNIX ABL.
3. **Завантажте Nebel із SD-карти.** Коли внутрішнього розділу немає,
   перезавантажтеся зі вставленою картою Nebel — і він стартує з неї.
4. **Запустіть Nebel Installer.** Відкрийте **режим робочого столу** й
   запустіть **Nebel Installer**. Він побачить наявну внутрішню установку й
   запропонує два варіанти:
   - **Перевстановити Nebel** (або **Перейти на Nebel**, якщо встановлений
     ROCKNIX) — заміщує Linux-установку й не чіпає ваш Android.
   - **Видалити й повернути Android** — стирає установку й віддає весь диск
     Android, який скинеться до заводських при наступному завантаженні.

## Як користуватися Nebel

Емуляція x86/x86_64 і CachyOS Proton 11 налаштовані з коробки, тож для
більшості ігор достатньо встановити гру в Steam і натиснути «грати», без
жодного додаткового налаштування. Решта Nebel працює як SteamOS, а
специфічні для Nebel регулятори живуть у **Nebel Control** — вбудованому в
меню швидкого доступу — для тонкого налаштування й поодиноких ігор, які цього
потребують.

### Меню швидкого доступу й Nebel Control

Натисніть кнопку **Назад**, щоб відкрити меню швидкого доступу (на пристроях
AYANEO QAM не призначене, тож використовуйте **Home + A**), тоді відкрийте
**Nebel Control**. Кожен розділ має спрощений вигляд у QAM; повний набір
регуляторів живе на повноекранній сторінці (відкрийте її через **Open full
screen** угорі):

- **Home.** Системний монітор (температури CPU/GPU, вентилятор, батарея) і
  швидкі перемикачі: накладення FPS, спалах підсвітки стіків для сповіщень.
- **Games.** Сумісність повігорно: ARM64-нативно або x86_64, пресет
  емуляції, версії графічних прошарків для гри, примусова роздільна
  здатність, вибір Proton. Додавання сторонніх ігор
  вбудованим файловим оглядачем.
- **Display.** Внутрішній/зовнішній екран: основний екран, роздільна
  здатність.
- **Power.** Крива вентилятора, обмеження частот CPU/GPU, даунклок CPU.
- **Lighting.** Студія підсвітки стіків — див.
  [Підсвітка стіків](#підсвітка-стіків).
- **Sync.** Синхронізація збережень/налаштувань між пристроями:
  спарювання, пресети тек, власні теки.
- **System.** Тип емуляції контролера (**Xbox 360**, **Steam Deck** або
  **DualSense**), **калібрування** стіків/тригерів, SSH, спільне сховище.

### Режим робочого столу

У меню живлення Steam виберіть **Switch to Desktop**, щоб отримати повноцінний
стіл KDE Plasma. Тут живуть крамниця застосунків **Bazaar** і **Nebel
Installer** ([Встановлення у внутрішню пам'ять](#встановлення-у-внутрішню-память)).
Щоб повернутися, скористайтеся ярликом **Return to Gaming Mode** на столі.

### Кнопка живлення й сон

На пристроях SM8250 (Retroid Pocket Mini V2, 5, Flip 2) Nebel використовує
**справжній сон**: кнопка живлення вкладає пристрій спати й швидко
будить, а підсвітка стіків і звук коректно переживають перехід. Інші пристрої
вдаються до «уданого сну» (за мотивами ROCKNIX): він гасить екран і
заморожує сесію, а те саме натискання будить пристрій. Оскільки ці пристрої
не сплять по-справжньому, їхнє споживання в простої вище.

### Підсвітка стіків

На пристроях, чиї аналогові стіки мають адресне RGB (Retroid Pocket Mini V2,
Retroid Pocket 6), ними керує **Nebel Control > Lighting**:

| Режим | Поведінка |
|---|---|
| Static | Незмінний колір. |
| Breathing | Збережений колір, що пульсує. |
| Rainbow | Безперервний цикл відтінків. |
| Wave | Веселка, розподілена навколо кільця світлодіодів стіка. |
| Starlight | Зони мерехтів навмання. |
| Spin | Освітлена зона мандрує кільцем. |
| Reactive | Відхилення стіка й натискання кнопок керують світлом; окремі кольори спалаху для кожної кнопки. |
| Multidot | Три кольорові цятки (червона/зелена/синя) женуться одна за одною зонами. |
| Ambilight | Кожен стік слідкує за усередненим кольором екрана біля власного боку. |
| Duotone | Двоколірний поділ кільця (горизонтальний/вертикальний/діагональний), із необов'язковим «гойдалковим» диханням між групами. |

Додатково: **рівень батареї** як джерело кольору (червоний → жовтий →
зелений) із необов'язковим крутящим індикатором заряджання, **Compass**
(освітлені зони слідкують за напрямком натискання стіка), незалежне
налаштування кожного стіка, переворот кільця на 180° для перевернутих
варіантів стіків і **каскад сповіщень** — вхідні сповіщення спалахують стіки
спершу верхньою парою, тоді нижньою. Перемикач **Follow screen brightness**
масштабує все за рівнем підсвітки екрана.

## Оновлення

> [!NOTE]
> Оновлення «по повітрю» — новина, що іще випробовується. Якщо оновлення
> зірветься, може знадобитися перепрошивка.

Nebel вміє оновлюватися на місці — без перепрошивки й без повторного
завантаження ігор. Образи підписані й перевіряються на пристрої, перш
ніж їм можна буде завантажитися. Виберіть канал оновлень і запустіть
оновлення з системних налаштувань Steam:

- **Stable** — рекомендований для звичайного користування. Сюди потрапляють
  збірки, що пройшли релізне випробування.
- **Testing** — найсвіжіший край. Іде за останніми комітами `main` і може
  містити незавершені чи мало випробувані на пристрої зміни.

## Відомі проблеми

- **Чорний екран під час запуску Steam.** Іноді 30-60 секунд чорного екрана
  перед тим, як Steam цілком з'явиться, часто після оновлення чи
  перезапуску.
- **Повідомлення про компіляцію шейдерів під час гри.** Це зміна в недавній
  версії CachyOS Proton 11 (ARM); у майбутньому релізі Nebel її буде
  вимкнено.
- **Червоний відтінок.** Деякі пристрої показують червоний відтінок панелі
  після перезапуску Steam. Явище випадкове, перезавантаження його прибирає.
- **QAM не призначене на пристроях Ayaneo.** Використовуйте Home+A, щоб
  відкрити меню швидкого доступу.
- **Немає звуку після пробудження на деяких пристроях.** Іноді звук мовчить
  після виходу зі сну аж до перезавантаження. Відома причина на пристроях
  SM8250 (Retroid Pocket Mini V2, 5, Flip2) має цільове виправлення (підкидання
  кванту графа PipeWire після пробудження); ще не підтверджено, що воно
  покриває кожен пристрій і кожен випадок.

  ## ☕ Підтримати проєкт

Nebel — це абсолютно безкоштовна прошивка з відкритим кодом. Якщо вам зайшла ця ОС і є бажання підтримати її розвиток (або просто закинути на каву за нічні посиденьки над кодом) — буду дуже вдячний!

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/gaidzi)

Величезне дякую всім, хто допомагає проєкту рухатися далі!


## Спільнота

Питання й звіти про вади — у
[GitHub Issues](https://github.com/Ga1dz1/nebel/issues).

## Подяки

- **[armada](https://github.com/virtudude/armada):** кодова база, з якої виріс
  Nebel; чимала частина підтримки пристроїв і структури образу почалася там.
- **[ROCKNIX](https://github.com/ROCKNIX):** завантажувач, підтримка
  пристроїв, звукові профілі й багато іншого.
- **[Bazzite](https://github.com/ublue-os/bazzite)** та екосистема
  **[Universal Blue](https://github.com/ublue-os)**: структура збірки
  bootc-образу, [image-template](https://github.com/ublue-os/image-template),
  на якому збудовано цей репозиторій, і патерни сесій Steam/Gamescope.
- **Fedora** й проєкт **[bootc](https://github.com/bootc-dev/bootc)**: базовий
  образ і інструментарій.

## Ліцензія

Власний код Nebel — **GPL-2.0-or-later**: якщо ви змінюєте й розповсюджуєте
його, ваші зміни лишаються відкритими на тих самих умовах. Вбудовані
компоненти зберігають свої апстрімні ліцензії. Див. [`LICENSE.md`](LICENSE.md).

## Community

Questions and bug reports:
[GitHub Issues](https://github.com/Ga1dz1/nebel/issues).

## Credits

- **[armada](https://github.com/virtudude/armada):** the codebase Nebel grew
  out of; large parts of the device enablement and image structure started
  there.
- **[ROCKNIX](https://github.com/ROCKNIX):** bootloader, device support,
  audio profiles, and more.
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
