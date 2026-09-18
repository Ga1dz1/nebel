# Nebel OS — Changelog

## Unreleased (после 1.4.2)

### Steam-клиент 2026-09-18 (критично, вторая волна)
- **nebel-control:** прямая инъекция нативных секций настроек — клиент 18.09
  сломал `routerHook.addPatch` у Decky 3.2.9 (патчи молча игнорируются).
  Плагин теперь пробует регистрацию и при no-op переключается на собственный
  механизм: патч webpack-фабрики pages-навигации (якоря по структуре, не по
  именам минимайзера). Секции настроек работают независимо от Decky и
  автоматически вернутся на штатный путь, когда loader починят (ff408a3).
- **decky:** homebrew-дерево всегда chown'ится юзеру после старта loader'а —
  root-owned плагин больше не убивает hot-reload (d2134b1).

### Новое
- **USB debug-гаджет** (opt-in): `systemctl enable --now nebel-usb-debug` —
  RNDIS+serial по USB-C, `ssh nebel@10.66.0.1` без WiFi (адаптация из
  thorch-os). Выключен по умолчанию: гаджет-режим может конфликтовать с
  USB-OTG/доками (652497f).

## 1.4.2 (2026-09-17)

Hotfix release: восстановление после обновления Steam-клиента 2026-09-16 +
доработки duo, питания и ROM-библиотеки.

### Steam-клиент 2026-09-16 (критично)
- **nebel-control:** бутстрап системного stdlib для питона бэкенда под FEX —
  после обновления клиента плагин не стартовал (`ModuleNotFoundError:
  configparser/glob`): FEX подменяет `/usr/bin/python3` гостевым rootfs, а
  loader не мог достать системные пути. Бэкенд теперь сам добавляет
  `/usr/lib{,64}/python3.x` в `sys.path` (32c41f0).
- **dualscreen:** regex-якоря для патча свитчера окон — новый билд клиента
  переминимировал steamui, строчные якоря перестали совпадать и пропала
  кнопка «Y = на внутренний экран». Патчеры (дисковый и runtime) матчат
  структуру, а не имена переменных, и сканируют все webpack-модули вместо
  захардкоженного id 15821 (новый билд — 71702) (3fa772f).
- Совместимость с Decky Loader 3.2.9 (обновлён на устройствах автоматически).

### Duo (двухэкранный режим)
- Duo second-screen опции на странице Экран (контент внутреннего экрана:
  card/qam/pause/off + полный Steam на нём) (28564f6).
- Патч gamescope: геометрия seat и scatter-вращения выводятся из панели
  устройства; фикс цикла пересоздания вотчдога и модель вращения внешнего
  экрана (00f717d, e0098b1).

### Питание / сон
- powerd: потолок GPU из заводских профилей для SM8550-класса, ручной
  разгон — опцией; лестница потолка по VBAT для SM8250 (hard reset от
  просадки батареи) (be12b48, b02711a, a478169, f055524).
- Сон: лог разряда батареи за цикл сна; dwc3 USB role=none через сон;
  USB autosuspend для DDR low-power тиров (c14e046, a3e27ce, f055524).
- wireplumber: soft-mixer для карты SM8250 RetroidPocket (6d7264d).

### Ввод / устройства
- RP6: gpio-keys напрямую в InputPlumber, splitter-демон удалён; фикс парса
  bitmap кнопок (BTN_C/BTN_Z, paddles, VolUp) (4353f12, 3db4a59).
- Dracut: ADSP/CDSP firmware в initramfs — remoteproc может подняться до
  switch-root (6e33ce7).

### ROM-библиотека
- Импорт из любой папки (не только по системным подпапкам); сниффинг zip
  (магия дисков GC/Wii), подсказки по имени папки; +saturn/segacd/gamegear/
  pcengine/atari2600/32x; обложки для loose-folder импорта (6584e4b, bc3e590,
  bf2b1b6).

### Загрузка / обновление
- ABL: безопасный каталог-based обновлятор (порт из upstream armada),
  payload ABL стейджится в билд (7b76e66, dceca02).
- bootimg: срез karg 'gpt' для MBR-носителей; flash-sd.sh чистит хвостовой
  бэкап GPT (f680e52, e21a657).
- game-launch: AppImage PATH фикс; вычистка чужих RootFS/thunk путей из FEX
  конфига (50af740).

### Известные острые края (в работе / на radar)
- DXVK 3.x в proton-cachyos-11: на Adreno a6xx (SM8250) возможен отказ
  8-bit storage — мониторинг, кандидат: per-game выбор dxvk/dxvk-sarek
  (прототип идеи из pocknix-os).
- scx_lavd (sched-ext) — кандидат на включение после доводки; gamescope на
  SCHED_RR остаётся ОТКЛЮЧЁН (полный hang, см. SCHEDULER_NOTES.md).
- UHS-I SDR104 для sdhci-msm (порт из Armbian) — на рассмотрении.

## 1.4.1 (2026-09-08)
Hotfix: dual-desktop игры сжимались после DP-флапа, game touch scale, застревавший
focus fade, Azahar попапы, seatA guards.

## 1.4 (2026-09-05)
Duo userspace: второе steamui окно + seat bridge + switcher patch watchdog;
режимы дисплея internal/external/duo; ROM-библиотека в нативных настройках;
LSFG для всех; per-game флаги запуска.
