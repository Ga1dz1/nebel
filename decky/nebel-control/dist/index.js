const manifest = {"name":"Nebel Control"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const call = api.call;
const routerHook = api.routerHook;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

const getConfig = () => call("get_config");
const getInstalledGames = () => call("get_installed_games");
const savePowerConfig = (data) => call("save_power_config", data);
const saveTweaks = (data) => call("save_tweaks", data);
const getCompatApplied = () => call("get_compat_applied");
let compatAppliedSaveChain = Promise.resolve(undefined);
const saveCompatApplied = (appids) => {
    const snapshot = [...appids];
    const request = compatAppliedSaveChain
        .catch(() => { })
        .then(() => call("save_compat_applied", snapshot));
    compatAppliedSaveChain = request;
    return request;
};
const setSshEnabled = (enabled) => call("set_ssh_enabled", enabled);
const setControllerType = (value) => call("set_controller_type", value);
const setSharedStorageEnabled = (enabled) => call("set_shared_storage_enabled", enabled);
const listDir = (path) => call("list_dir", path);
const heroicShortcut = (appid) => call("heroic_shortcut", appid);
const getHeroicConfig = (appName) => call("heroic_config", appName);
const setHeroicConfig = (appName, patch) => call("heroic_set_config", appName, patch);
const listHeroicVersions = () => call("heroic_versions");
const getDepsStatus = (appid) => call("deps_status", appid);
const installDeps = (appid, verbs) => call("deps_install", appid, verbs);
const setStickLedColor = (side, value) => call("set_stick_led_color", side, value);
const setStickLedMode = (side, mode) => call("set_stick_led_mode", side, mode);
const setStickLedScreenLink = (enabled) => call("set_stick_led_screen_link", enabled);
const setStickLedParam = (side, param, mode, value) => call("set_stick_led_param", side, param, mode, value);
const setStickLedFlashColor = (button, value) => call("set_stick_led_flash_color", button, value);
const setStickLedDuotoneColor = (side, slot, value) => call("set_stick_led_duotone_color", side, slot, value);
const setStickLedDuotoneOrientation = (side, orientation) => call("set_stick_led_duotone_orientation", side, orientation);
const setStickLedColorSource = (side, source) => call("set_stick_led_color_source", side, source);
const setStickLedChargingIndicator = (side, enabled) => call("set_stick_led_charging_indicator", side, enabled);
const setStickLedChase = (side, enabled) => call("set_stick_led_chase", side, enabled);
const setStickLedCompass = (side, enabled) => call("set_stick_led_compass", side, enabled);
const setStickLedSeesaw = (side, enabled) => call("set_stick_led_seesaw", side, enabled);
const setStickLedFlip = (side, enabled) => call("set_stick_led_flip", side, enabled);
const setStickLedEnabled = (enabled) => call("set_stick_led_enabled", enabled);
const setStickLedNotify = (enabled) => call("set_stick_led_notify", enabled);
const setStickLedNotifyColor = (value) => call("set_stick_led_notify_color", value);
const getSystemMonitor = () => call("get_system_monitor");
const setOverlayEnabled = (enabled) => call("set_overlay_enabled", enabled);
const setStickLedMaxBrightness = (value) => call("set_stick_led_max_brightness", value);
const getControllerState = () => call("get_controller_state");
const saveCalibration = (capture) => call("save_calibration", capture);
const resetCalibration = () => call("reset_calibration");
const beginCalibrationSession = (token) => call("begin_calibration_session", token);
const endCalibrationSession = (token) => call("end_calibration_session", token);
const getDisplayState = () => call("get_display_state");
const setDisplayConfig = (useExternal, connector, width, height, orientation) => call("set_display_config", useExternal, connector, width, height, orientation);
const restartGamescopeSession = () => call("restart_gamescope_session");
const setInternalTouchpad = (enabled) => call("set_internal_touchpad", enabled);
const getSyncState = () => call("get_sync_state");
const setSyncServiceEnabled = (enabled) => call("set_sync_service_enabled", enabled);
const syncAddDevice = (deviceId, name) => call("sync_add_device", deviceId, name);
const syncDiscoveredDevices = () => call("sync_discovered_devices");
const syncRemoveDevice = (deviceId) => call("sync_remove_device", deviceId);
const syncSetFolderEnabled = (presetId, enabled) => call("sync_set_folder_enabled", presetId, enabled);
const syncAddCustomFolder = (path, label) => call("sync_add_custom_folder", path, label);
const syncRemoveCustomFolder = (folderId) => call("sync_remove_custom_folder", folderId);
const syncDismissDevice = (deviceId) => call("sync_dismiss_device", deviceId);
const syncAcceptFolder = (folderId) => call("sync_accept_folder", folderId);
const syncDismissFolder = (folderId, deviceId) => call("sync_dismiss_folder", folderId, deviceId);

function useDebouncedSave(options) {
    const { config, field, snapshot, save, setConfig, onError, delay = 900 } = options;
    const value = config ? config[field] : undefined;
    SP_REACT.useEffect(() => {
        if (!config || !snapshot.current)
            return;
        const current = JSON.stringify(value);
        if (current === snapshot.current)
            return;
        const timer = window.setTimeout(async () => {
            try {
                const saved = current;
                const next = await save(value);
                snapshot.current = JSON.stringify(next[field]);
                setConfig((stored) => {
                    if (!stored)
                        return next;
                    if (JSON.stringify(stored[field]) !== saved)
                        return stored;
                    return { ...stored, [field]: next[field] };
                });
            }
            catch (error) {
                onError?.(error);
            }
        }, delay);
        return () => window.clearTimeout(timer);
    }, [value]);
}

const uk = {
    "Loading": "Завантаження",
    "Default": "За замовчуванням",
    "Reset to Default": "Скинути до типових",
    "Cancel": "Скасувати",
    "Status": "Стан",
    "Error": "Помилка",
    "Remove": "Видалити",
    "Accept": "Прийняти",
    "Dismiss": "Відхилити",
    "Close": "Закрити",
    "Edit Game Profile": "Редагування профілю гри",
    "Profile Settings": "Налаштування профілю",
    "Advanced": "Додатково",
    "Compatibility changes apply on next launch": "Зміни сумісності застосуються під час наступного запуску",
    "Compatibility Mode": "Режим сумісності",
    "ARM64 (native, recommended)": "ARM64 (нативний, рекомендовано)",
    "x86_64 (emulated via FEX)": "x86_64 (емуляція через FEX)",
    "Default Proton": "Типовий Proton",
    "Apply to New Games": "Застосовувати до нових ігор",
    "Game Resolution": "Роздільна здатність гри",
    "Native": "Нативна",
    "Performance Overlay": "Оверлей продуктивності",
    "FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart": "Оверлей FPS/ЦП/ГП/температур через вбудований --mangoapp у gamescope — застосовується після перезапуску сеансу",
    "Compatibility Tool": "Інструмент сумісності",
    "Use Default": "Використовувати типовий",
    "Follow Steam": "Як у Steam",
    "FEX Preset": "Пресет FEX",
    "Custom": "Власний",
    "CPU Cores": "Ядра ЦП",
    "Default (any core)": "Типово (будь-яке ядро)",
    "Big cores only (cpu4-7)": "Лише великі ядра (cpu4-7)",
    "Little cores only (cpu0-3)": "Лише малі ядра (cpu0-3)",
    "Single core (cpu4)": "Одне ядро (cpu4)",
    "Two cores (cpu4-5)": "Два ядра (cpu4-5)",
    "Game Era": "Епоха гри",
    "Old-school (Windows XP)": "Олдскульна (Windows XP)",
    "Modern (Windows 10/11)": "Сучасна (Windows 10/11)",
    "XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced": "Епоха XP задає версію Windows, рендер старих DirectX і два ядра ЦП — точне налаштування в розділі «Додатково»",
    "Auto": "Автоматично",
    "Windows 10/11 (default)": "Windows 10/11 (типово)",
    "Auto (on for XP era)": "Автоматично (увімкнено для епохи XP)",
    "Off": "Вимкнено",
    "Old games (legacy Windows)": "Старі ігри (старі версії Windows)",
    "Windows Version (reported)": "Версія Windows (яку бачить гра)",
    "Old DirectX renderer": "Рендер старих DirectX",
    "Virtual Desktop": "Віртуальний робочий стіл",
    "Memory Limit": "Обмеження пам’яті",
    "Caps memory the game can allocate - last resort for very old titles; can crash modern games": "Обмежує пам’ять, доступну грі, — останній засіб для дуже старих ігор; може спричинити збої сучасних",
    "GPU Spoof": "Підміна відеокарти",
    "DXVK version": "Версія DXVK",
    "D3D12 (VKD3D) version": "Версія D3D12 (VKD3D)",
    "Launch flags": "Прапорці запуску",
    "D3D12 feature level 12_1": "Рівень функцій D3D12 12_1",
    "Disable DirectX 12": "Вимкнути DirectX 12",
    "WineD3D instead of DXVK": "WineD3D замість DXVK",
    "Old OpenGL compatibility": "Сумісність зі старим OpenGL",
    "Large address aware (32-bit games)": "Великий адресний простір (32-бітні ігри)",
    "Mod/launcher DLL override": "Підміна DLL для модів і лаунчерів",
    "Disable fsync": "Вимкнути fsync",
    "Disable esync": "Вимкнути esync",
    "For DirectX 12 games that black-screen or refuse to start": "Для ігор на DirectX 12 з чорним екраном або відмовою запускатися",
    "For games whose DirectX 12 mode crashes - they fall back to DX11": "Для ігор, де режим DirectX 12 падає - буде перехід на DX11",
    "For old DirectX 9-11 games that won't start on DXVK": "Для старих ігор на DirectX 9-11, що не стартують на DXVK",
    "For old OpenGL games that misdetect the graphics driver": "Для старих ігор на OpenGL, що невірно визначають драйвер",
    "For 32-bit era games crashing with out-of-memory errors": "Для 32-бітних ігор, що падають з помилками нестачі пам'яті",
    "Needed by mod loaders and third-party launchers (winhttp)": "Потрібно завантажувачам модів і стороннім лаунчерам (winhttp)",
    "For games that hang at startup or in anti-cheat init": "Для ігор, що зависають при запуску або в античиті",
    "Launch switches applied to the game's environment - variables set directly in Launch Options take precedence": "Прапорці, що застосовуються до середовища гри - змінні, задані напряму в параметрах запуску, мають пріоритет",
    "Default (Proton's built-in)": "Типова (вбудована в Proton)",
    "Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version": "Старіші збірки можуть допомогти на відеокартах Adreno, де новіші DXVK/VKD3D не запускаються, — типово використовується версія, вбудована в Proton",
    "Dependencies": "Залежності",
    ".NET 3.5 (slow)": ".NET 3.5 (повільно)",
    "Install": "Встановити",
    "Installed": "Встановлено",
    "Installing...": "Встановлення...",
    "Install recommended (DirectX 9 + VC++ 2005)": "Встановити рекомендовані (DirectX 9 + VC++ 2005)",
    "Recommended for Windows XP-era games": "Рекомендовано для ігор епохи Windows XP",
    "Installing dependencies needs an internet connection": "Для встановлення залежностей потрібне з’єднання з інтернетом",
    "Game prefix not found - launch the game once first": "Префікс гри не знайдено — спочатку запустіть гру хоча раз",
    "Dependency installer (winetricks) is missing in this OS build": "У цій збірці ОС немає інсталятора залежностей (winetricks)",
    "Another installation is already running": "Інше встановлення уже триває",
    "Installation timed out": "Час встановлення минув",
    "Installation failed - check the network connection": "Не вдалося встановити — перевірте з’єднання з мережею",
    "Host Thunks": "Проміжний шар хоста (thunks)",
    "Hide Host Thunks": "Сховати проміжний шар хоста",
    "Reset All Games": "Скинути всі ігри",
    "Resetting...": "Скидання...",
    "This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.": "Це видалить усі налаштування Nebel для окремих ігор, скине власні значення роздільної здатності, застосує типовий Proton там, де Steam обирає Proton, і залишить нативні Linux-ігри на розсуд Steam.",
    "Resolution override is unavailable": "Власна роздільна здатність недоступна",
    "Failed to set resolution override": "Не вдалося застосувати власну роздільну здатність",
    "Failed to set default resolution": "Не вдалося встановити типову роздільну здатність",
    "Edit Power Profile": "Редагування профілю живлення",
    "Fan Curve": "Крива вентилятора",
    "CPU Underclock": "Зниження частоти ЦП",
    "None": "Немає",
    "Small": "Мале",
    "Medium": "Середнє",
    "Large": "Велике",
    "CPU Max (%)": "Макс. ЦП (%)",
    "GPU Min (%)": "Мін. ГП (%)",
    "GPU Max (%)": "Макс. ГП (%)",
    "Display": "Дисплей",
    "External Display": "Зовнішній дисплей",
    "Internal Screen": "Вбудований екран",
    "{connector} (disconnected)": "{connector} (від’єднано)",
    "Primary Display": "Основний дисплей",
    "Resolution": "Роздільна здатність",
    "Rotation": "Поворот",
    "Normal": "Нормальна",
    "90°": "90°",
    "180°": "180°",
    "270°": "270°",
    "This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.": "Це портретна панель — оберіть поворот, за якого зображення стає рівним. Застосовується після перезапуску ігрового режиму.",
    "Internal screen as touchpad": "Вбудований екран як тачпад",
    "While an external display is primary, the dark internal touchscreen works as a trackpad (correct orientation, tap = click). Off: it is disabled entirely.": "Поки основним є зовнішній дисплей, темний вбудований тачскрін працює як тачпад (правильна орієнтація, дотик = клік). Вимкнено: він повністю деактивований.",
    "No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.": "Зовнішній дисплей не виявлено. Під’єднайте його (док/USB-C/HDMI), щоб обрати тут.",
    "This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.": "Цей дисплей зараз не під’єднано — ігровий режим працює на вбудованому екрані, доки його не буде під’єднано знову. Налаштування збережено.",
    "Error: {message}": "Помилка: {message}",
    "Apply & Restart Game Mode": "Застосувати й перезапустити ігровий режим",
    "Stick Lighting": "Підсвітка стіків",
    "No addressable stick lighting hardware detected on this device.": "На цьому пристрої не виявлено адресної підсвітки стіків.",
    "Enable": "Увімкнути",
    "Turn both sticks off entirely, without losing the mode/color settings below": "Повністю вимкнути підсвітку обох стіків, не втрачаючи налаштування режиму й кольору нижче",
    "Sticks are off - settings below are kept, not applied.": "Підсвітку вимкнено — налаштування нижче збережено, але не застосовуються.",
    "Follow screen brightness": "Слідкувати за яскравістю екрана",
    "Dim both sticks along with the display backlight": "Затемнювати обидва стіки разом із підсвіткою дисплея",
    "Max Brightness": "Макс. яскравість",
    "Configure each stick separately": "Налаштовувати кожен стік окремо",
    "Off: changes below apply to both sticks at once. On: pick a stick and edit just that one.": "Вимкнено: зміни нижче застосовуються до обох стіків одночасно. Увімкнено: оберіть стік і редагуйте лише його.",
    "Stick": "Стік",
    "Left Stick": "Лівий стік",
    "Right Stick": "Правий стік",
    "Mode": "Режим",
    "Static": "Статичний",
    "Breathing": "Дихання",
    "Rainbow": "Веселка",
    "Wave (rainbow spread around the ring)": "Хвиля (веселка розтікається кільцем)",
    "Starlight (random zone twinkle)": "Зоряне світло (випадкове мерехтіння зон)",
    "Spin": "Обертання",
    "Reactive (sticks + buttons)": "Реактивний (стіки + кнопки)",
    "Multidot (RGB chase)": "Мультиточка (RGB-перегони)",
    "Ambilight (matches screen)": "Ambilight (за кольором екрана)",
    "Duotone (two-color split)": "Дуетон (поділ на два кольори)",
    "Speed": "Швидкість",
    "Intensity (min brightness)": "Інтенсивність (мін. яскравість)",
    "Size": "Розмір",
    "Soft trail": "М’який шлейф",
    "Trailing fade (uses Size below) instead of a single hard-edged dot": "Згасаючий шлейф (використовує «Розмір» нижче) замість однієї чіткої точки",
    "Compass": "Компас",
    "Point the lit zone(s) at the stick's push direction instead of lighting evenly": "Спрямовувати світлі зони в бік нахилу стіка замість рівномірного світла",
    "Seesaw": "Гойдалка",
    "Breathe the two color groups against each other instead of a static split": "Дві групи кольорів «дихають» назустріч одна одній замість статичного поділу",
    "Color Source": "Джерело кольору",
    "Custom color": "Власний колір",
    "Battery level": "Рівень заряду",
    "Random (unpredictable color shift)": "Випадковий (непередбачувана зміна кольору)",
    "Shimmer (pale/cool to rich/warm)": "Мерехтіння (від блідого холодного до насиченого теплого)",
    "Charging indicator": "Індикатор заряджання",
    "Spin a blue dot around the stick while charging (when the stick color follows the battery level)": "Обертати синю точку навколо стіка під час заряджання (коли колір стіка відображає рівень заряду)",
    "Custom color (advanced)": "Власний колір (розширено)",
    "Hide custom color": "Сховати власний колір",
    "Button": "Кнопка",
    "Split": "Поділ",
    "Horizontal": "Горизонтальний",
    "Vertical": "Вертикальний",
    "Diagonal": "Діагональний",
    "Color A": "Колір A",
    "Color B": "Колір B",
    "Flip stick ring": "Перевернути кільце стіка",
    "Rotate the left stick's LED ring 180° - on some units the left ring is wired upside-down": "Повернути LED-кільце лівого стіка на 180° - на деяких пристроях ліве кільце підключено догори ногами",
    "Rotate the LED ring 180° for stick variants wired upside-down (fixes compass/direction on some RP6 units)": "Повернути LED-кільце на 180° для стіків, розпаяних догори ногами (виправляє компас/напрямок на деяких RP6)",
    "Blue": "Синій",
    "Cyan": "Блакитний",
    "Purple": "Фіолетовий",
    "Pink": "Рожевий",
    "Red": "Червоний",
    "Orange": "Помаранчевий",
    "Yellow": "Жовтий",
    "Green": "Зелений",
    "White": "Білий",
    "L3 (left stick click)": "L3 (натискання лівого стіка)",
    "R3 (right stick click)": "R3 (натискання правого стіка)",
    "L4 (left paddle)": "L4 (ліва пелюстка)",
    "R4 (right paddle)": "R4 (права пелюстка)",
    "D-Pad Up": "Хрестовина вгору",
    "D-Pad Down": "Хрестовина вниз",
    "D-Pad Left": "Хрестовина вліво",
    "D-Pad Right": "Хрестовина вправо",
    "Other buttons": "Інші кнопки",
    "Controller": "Контролер",
    "Emulation": "Емуляція",
    "Launch Calibration": "Запустити калібрування",
    "System": "Система",
    "Enable SSH": "Увімкнути SSH",
    "Mount shared storage": "Монтувати спільне сховище",
    "Mount NEBEL_SHARED partition at ~/Shared": "Монтувати розділ NEBEL_SHARED у ~/Shared",
    "OS Version": "Версія ОС",
    "unknown": "невідомо",
    "Sync": "Синхронізація",
    "Syncthing is not installed in this OS image": "Syncthing не встановлено в цьому образі ОС",
    "Sync service": "Служба синхронізації",
    "Running": "Працює",
    "Stopped": "Зупинено",
    "This device ID": "ID цього пристрою",
    "{connected} of {total} device(s) connected": "Під’єднано пристроїв: {connected} з {total}",
    "Requests": "Запити",
    "Device \"{name}\" wants to pair": "Пристрій «{name}» хоче під’єднатися",
    "Folder \"{name}\" was shared with you": "З вами поділилися папкою «{name}»",
    "Devices": "Пристрої",
    "(connected)": "(під’єднано)",
    "Folders": "Папки",
    "Add a device first - folders sync only to paired devices": "Спочатку додайте пристрій — папки синхронізуються лише з під’єднаними пристроями",
    "syncing…": "синхронізація…",
    "in sync": "синхронізовано",
    "Add device": "Додати пристрій",
    "Add folder": "Додати папку",
    "Add custom folder": "Додати власну папку",
    "Device ID of the other console (shown on its Sync tab)": "ID іншої консолі (показано на її вкладці «Синхронізація»)",
    "Devices found on this network": "Пристрої в цій мережі",
    "Scanning...": "Сканування...",
    "Nothing found - check Sync is on at the other console": "Нічого не знайдено — перевірте, що синхронізацію ввімкнено на іншій консолі",
    "Rescan": "Сканувати ще раз",
    "Or enter the Device ID by hand (shown on its Sync tab)": "Або введіть ID пристрою вручну (показано на його вкладці «Синхронізація»)",
    "Name (e.g. Mini V2)": "Назва (напр., Mini V2)",
    "Folder to sync (under ~ or /run/media)": "Папка для синхронізації (у ~ або /run/media)",
    "Label (optional)": "Назва (необов’язково)",
    "Checking controller...": "Перевірка контролера...",
    "This device can't save calibration, but you can check stick and trigger response here.": "Цей пристрій не може зберігати калібрування, але тут можна перевірити відгук стіків і тригерів.",
    "Move both sticks in full circles and fully press both triggers, then Save.": "Покрутіть обидва стіки по повному колу та натисніть обидва тригери до кінця, потім торкніться «Зберегти».",
    "Press Start, then move sticks and triggers through full range.": "Натисніть Start, потім проведіть стіки й тригери по всьому ходу.",
    "Save Calibration": "Зберегти калібрування",
    "Start Calibration": "Почати калібрування",
    "Reset to Defaults": "Скинути до типових",
    "TabHome": "Головна",
    "TabGames": "Ігри",
    "TabPower": "Живлення",
    "TabDisplay": "Екран",
    "TabLighting": "Світло",
    "TabSync": "Синк",
    "TabSystem": "Система",
    "Quick toggles": "Швидкі перемикачі",
    "Open full screen": "Відкрити на весь екран",
    "Control Center": "Центр керування",
    "Storage": "Сховище",
    "SSH": "SSH",
    "Overlay": "Оверлей",
    "Open Control Center": "Відкрити центр керування",
    "Power Profile": "Профіль живлення",
    "Add non-Steam game": "Додати сторонню гру",
    "Select the game's executable": "Виберіть виконуваний файл гри",
    "Added to Steam library": "Додано до бібліотеки Steam",
    "Added to Steam library (launches via Heroic)": "Додано до бібліотеки Steam (запуск через Heroic)",
    "Heroic games": "Ігри Heroic",
    "Heroic game": "Гра Heroic",
    "This shortcut goes through the Heroic client - in game mode the game may not appear on screen": "Цей ярлик запускається через клієнт Heroic - в ігровому режимі гра може не з'явитися на екрані",
    "Fix shortcut": "Полагодити ярлик",
    "Fixing...": "Лагодження...",
    "Shortcut fixed - the game now launches directly, without the Heroic client": "Ярлик полагоджено - гра тепер запускається напряму, без клієнта Heroic",
    "Failed to fix shortcut": "Не вдалося полагодити ярлик",
    "Proton/Wine build (Heroic)": "Збірка Proton/Wine (Heroic)",
    "A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found": "Встановлено збірку Sarek (старіший DXVK) - оберіть її для ігор із чорним екраном або помилкою «no adapters found»",
    "WoW64 mode": "Режим WoW64",
    "Force Heroic launch settings": "Примусово використовувати налаштування запуску Heroic",
    "Overrides the game's Heroic launch configuration from here": "Заміщує конфігурацію запуску гри з Heroic звідси",
    "Heroic configuration not found - launch the game once from Heroic first": "Конфігурацію Heroic не знайдено - спочатку запустіть гру з Heroic хоча б раз",
    ".NET 4.8 (slow)": ".NET 4.8 (повільно)",
    "SD card": "Карта SD",
    "Internal storage": "Внутрішня пам’ять",
    "Monitor": "Монітор",
    "Fan": "Вентилятор",
    "Battery": "Акумулятор",
    "Charging": "Заряджається",
    "Discharging": "Розряджається",
    "Full": "Заряджено",
    "Not charging": "Не заряджається",
    "Unknown": "Невідомо",
    "FPS overlay (all games)": "FPS-оверлей (усі ігри)",
    "Shows FPS in every game, incl. non-Steam. Applies after reboot.": "Показує FPS в усіх іграх, включно зі сторонніми. Застосується після перезавантаження.",
    "Notification flash": "Спалах сповіщень",
    "Stick LEDs flash on notifications": "Підсвітка стіків спалахує на сповіщення",
    "Flash color": "Колір спалаху",
    "Failed to add shortcut": "Не вдалося додати ярлик",
    "On-screen keyboard": "Екранна клавіатура",
    "Hotkeys": "Гарячі клавіші",
    "Show hotkeys": "Показати гарячі клавіші",
    "Game mode": "Ігровий режим",
    "Desktop mode": "Режим робочого столу",
    "Quick Access Menu": "Меню швидкого доступу",
    "Screenshot": "Знімок екрана",
    "Overview / activities": "Огляд / активності",
    "Escape": "Escape",
    "Volume": "Гучність",
    "Brightness": "Яскравість",
    "Menu key": "Клавіша меню",
};
const ru = {
    "Loading": "Загрузка",
    "Default": "По умолчанию",
    "Reset to Default": "Сбросить к настройкам по умолчанию",
    "Cancel": "Отмена",
    "Status": "Статус",
    "Error": "Ошибка",
    "Remove": "Удалить",
    "Accept": "Принять",
    "Dismiss": "Отклонить",
    "Close": "Закрыть",
    "Edit Game Profile": "Редактирование профиля игры",
    "Profile Settings": "Настройки профиля",
    "Advanced": "Дополнительно",
    "Compatibility changes apply on next launch": "Изменения совместимости применятся при следующем запуске",
    "Compatibility Mode": "Режим совместимости",
    "ARM64 (native, recommended)": "ARM64 (нативный, рекомендуется)",
    "x86_64 (emulated via FEX)": "x86_64 (эмуляция через FEX)",
    "Default Proton": "Proton по умолчанию",
    "Apply to New Games": "Применять к новым играм",
    "Game Resolution": "Разрешение игры",
    "Native": "Нативное",
    "Performance Overlay": "Оверлей производительности",
    "FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart": "Оверлей FPS/ЦП/ГП/температур через встроенный --mangoapp в gamescope — применяется после перезапуска сессии",
    "Compatibility Tool": "Инструмент совместимости",
    "Use Default": "Использовать по умолчанию",
    "Follow Steam": "Как в Steam",
    "FEX Preset": "Пресет FEX",
    "Custom": "Свой",
    "CPU Cores": "Ядра ЦП",
    "Default (any core)": "По умолчанию (любое ядро)",
    "Big cores only (cpu4-7)": "Только большие ядра (cpu4-7)",
    "Little cores only (cpu0-3)": "Только маленькие ядра (cpu0-3)",
    "Single core (cpu4)": "Одно ядро (cpu4)",
    "Two cores (cpu4-5)": "Два ядра (cpu4-5)",
    "Game Era": "Эпоха игры",
    "Old-school (Windows XP)": "Олдскульная (Windows XP)",
    "Modern (Windows 10/11)": "Современная (Windows 10/11)",
    "XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced": "Эпоха XP задаёт версию Windows, рендер старых DirectX и два ядра ЦП — точная настройка в разделе «Дополнительно»",
    "Auto": "Автоматически",
    "Windows 10/11 (default)": "Windows 10/11 (по умолчанию)",
    "Auto (on for XP era)": "Автоматически (вкл. для эпохи XP)",
    "Off": "Выкл.",
    "Old games (legacy Windows)": "Старые игры (старые версии Windows)",
    "Windows Version (reported)": "Версия Windows (видимая игре)",
    "Old DirectX renderer": "Рендер старых DirectX",
    "Virtual Desktop": "Виртуальный рабочий стол",
    "Memory Limit": "Ограничение памяти",
    "Caps memory the game can allocate - last resort for very old titles; can crash modern games": "Ограничивает память, доступную игре, — крайняя мера для очень старых игр; может ломать современные",
    "GPU Spoof": "Подмена видеокарты",
    "DXVK version": "Версия DXVK",
    "D3D12 (VKD3D) version": "Версия D3D12 (VKD3D)",
    "Launch flags": "Ключи запуска",
    "D3D12 feature level 12_1": "Уровень функций D3D12 12_1",
    "Disable DirectX 12": "Отключить DirectX 12",
    "WineD3D instead of DXVK": "WineD3D вместо DXVK",
    "Old OpenGL compatibility": "Совместимость со старым OpenGL",
    "Large address aware (32-bit games)": "Большое адресное пространство (32-битные игры)",
    "Mod/launcher DLL override": "Подмена DLL для модов и лаунчеров",
    "Disable fsync": "Отключить fsync",
    "Disable esync": "Отключить esync",
    "For DirectX 12 games that black-screen or refuse to start": "Для игр на DirectX 12 с чёрным экраном или отказом запускаться",
    "For games whose DirectX 12 mode crashes - they fall back to DX11": "Для игр, где режим DirectX 12 падает - будет переход на DX11",
    "For old DirectX 9-11 games that won't start on DXVK": "Для старых игр на DirectX 9-11, не стартующих на DXVK",
    "For old OpenGL games that misdetect the graphics driver": "Для старых игр на OpenGL, неверно определяющих драйвер",
    "For 32-bit era games crashing with out-of-memory errors": "Для 32-битных игр, падающих с ошибками нехватки памяти",
    "Needed by mod loaders and third-party launchers (winhttp)": "Нужно загрузчикам модов и сторонним лаунчерам (winhttp)",
    "For games that hang at startup or in anti-cheat init": "Для игр, зависающих при запуске или в античите",
    "Launch switches applied to the game's environment - variables set directly in Launch Options take precedence": "Ключи, применяемые к окружению игры - переменные, заданные напрямую в параметрах запуска, имеют приоритет",
    "Default (Proton's built-in)": "По умолчанию (встроенная в Proton)",
    "Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version": "Старые сборки могут помочь на GPU Adreno, где новые DXVK/VKD3D не запускаются, — по умолчанию используется версия, встроенная в Proton",
    "Dependencies": "Зависимости",
    ".NET 3.5 (slow)": ".NET 3.5 (медленно)",
    "Install": "Установить",
    "Installed": "Установлено",
    "Installing...": "Установка...",
    "Install recommended (DirectX 9 + VC++ 2005)": "Установить рекомендованные (DirectX 9 + VC++ 2005)",
    "Recommended for Windows XP-era games": "Рекомендовано для игр эпохи Windows XP",
    "Installing dependencies needs an internet connection": "Для установки зависимостей нужно подключение к интернету",
    "Game prefix not found - launch the game once first": "Префикс игры не найден — сначала запустите игру хотя бы раз",
    "Dependency installer (winetricks) is missing in this OS build": "В этой сборке ОС нет установщика зависимостей (winetricks)",
    "Another installation is already running": "Другая установка уже идёт",
    "Installation timed out": "Время установки истекло",
    "Installation failed - check the network connection": "Не удалось установить — проверьте подключение к сети",
    "Host Thunks": "Прослойки хоста (thunks)",
    "Hide Host Thunks": "Скрыть прослойки хоста",
    "Reset All Games": "Сбросить все игры",
    "Resetting...": "Сброс...",
    "This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.": "Это удалит все настройки Nebel для отдельных игр, сбросит переопределения разрешения, применит Proton по умолчанию там, где Steam выбирает Proton, и оставит нативные Linux-игры на усмотрение Steam.",
    "Resolution override is unavailable": "Переопределение разрешения недоступно",
    "Failed to set resolution override": "Не удалось установить переопределение разрешения",
    "Failed to set default resolution": "Не удалось установить разрешение по умолчанию",
    "Edit Power Profile": "Редактирование профиля питания",
    "Fan Curve": "Кривая вентилятора",
    "CPU Underclock": "Снижение частоты ЦП",
    "None": "Нет",
    "Small": "Малое",
    "Medium": "Среднее",
    "Large": "Большое",
    "CPU Max (%)": "Макс. ЦП (%)",
    "GPU Min (%)": "Мин. ГП (%)",
    "GPU Max (%)": "Макс. ГП (%)",
    "Display": "Дисплей",
    "External Display": "Внешний дисплей",
    "Internal Screen": "Встроенный экран",
    "{connector} (disconnected)": "{connector} (отключён)",
    "Primary Display": "Основной дисплей",
    "Resolution": "Разрешение",
    "Rotation": "Поворот",
    "Normal": "Обычная",
    "90°": "90°",
    "180°": "180°",
    "270°": "270°",
    "This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.": "Это портретная панель — выберите поворот, при котором изображение будет ровным. Применяется после перезапуска игрового режима.",
    "Internal screen as touchpad": "Встроенный экран как тачпад",
    "While an external display is primary, the dark internal touchscreen works as a trackpad (correct orientation, tap = click). Off: it is disabled entirely.": "Пока основной — внешний дисплей, тёмный встроенный тачскрин работает как тачпад (правильная ориентация, касание = клик). Выкл: он полностью отключён.",
    "No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.": "Внешний дисплей не обнаружен. Подключите его (док/USB-C/HDMI), чтобы выбрать здесь.",
    "This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.": "Этот дисплей сейчас не подключён — игровой режим работает на встроенном экране, пока его не подключат снова. Настройки сохранены.",
    "Error: {message}": "Ошибка: {message}",
    "Apply & Restart Game Mode": "Применить и перезапустить игровой режим",
    "Stick Lighting": "Подсветка стиков",
    "No addressable stick lighting hardware detected on this device.": "На этом устройстве не обнаружена адресная подсветка стиков.",
    "Enable": "Включить",
    "Turn both sticks off entirely, without losing the mode/color settings below": "Полностью выключить подсветку обоих стиков, не теряя настройки режима и цвета ниже",
    "Sticks are off - settings below are kept, not applied.": "Подсветка выключена — настройки ниже сохранены, но не применяются.",
    "Follow screen brightness": "Следовать яркости экрана",
    "Dim both sticks along with the display backlight": "Затемнять оба стика вместе с подсветкой дисплея",
    "Max Brightness": "Макс. яркость",
    "Configure each stick separately": "Настраивать каждый стик отдельно",
    "Off: changes below apply to both sticks at once. On: pick a stick and edit just that one.": "Выкл: изменения ниже применяются к обоим стикам сразу. Вкл: выберите стик и редактируйте только его.",
    "Stick": "Стик",
    "Left Stick": "Левый стик",
    "Right Stick": "Правый стик",
    "Mode": "Режим",
    "Static": "Статичный",
    "Breathing": "Дыхание",
    "Rainbow": "Радуга",
    "Wave (rainbow spread around the ring)": "Волна (радуга растекается по кольцу)",
    "Starlight (random zone twinkle)": "Звёздный свет (случайное мерцание зон)",
    "Spin": "Вращение",
    "Reactive (sticks + buttons)": "Реактивный (стики + кнопки)",
    "Multidot (RGB chase)": "Мультиточка (RGB-погоня)",
    "Ambilight (matches screen)": "Ambilight (под цвет экрана)",
    "Duotone (two-color split)": "Дуотон (разделение на два цвета)",
    "Speed": "Скорость",
    "Intensity (min brightness)": "Интенсивность (мин. яркость)",
    "Size": "Размер",
    "Soft trail": "Мягкий шлейф",
    "Trailing fade (uses Size below) instead of a single hard-edged dot": "Затухающий шлейф (использует «Размер» ниже) вместо одной чёткой точки",
    "Compass": "Компас",
    "Point the lit zone(s) at the stick's push direction instead of lighting evenly": "Направлять светящиеся зоны в сторону наклона стика вместо равномерного свечения",
    "Seesaw": "Качели",
    "Breathe the two color groups against each other instead of a static split": "Две группы цветов «дышат» навстречу друг другу вместо статичного разделения",
    "Color Source": "Источник цвета",
    "Custom color": "Свой цвет",
    "Battery level": "Уровень заряда",
    "Random (unpredictable color shift)": "Случайный (непредсказуемая смена цвета)",
    "Shimmer (pale/cool to rich/warm)": "Мерцание (от бледного холодного к насыщенному тёплому)",
    "Charging indicator": "Индикатор зарядки",
    "Spin a blue dot around the stick while charging (when the stick color follows the battery level)": "Во время зарядки вокруг стика вращается синяя точка (когда цвет стика отражает уровень заряда)",
    "Custom color (advanced)": "Свой цвет (расширенно)",
    "Hide custom color": "Скрыть свой цвет",
    "Button": "Кнопка",
    "Split": "Разделение",
    "Horizontal": "Горизонтально",
    "Vertical": "Вертикально",
    "Diagonal": "Диагонально",
    "Color A": "Цвет A",
    "Color B": "Цвет B",
    "Flip stick ring": "Перевернуть кольцо стика",
    "Rotate the left stick's LED ring 180° - on some units the left ring is wired upside-down": "Повернуть LED-кольцо левого стика на 180° - на некоторых устройствах левое кольцо подключено вверх ногами",
    "Rotate the LED ring 180° for stick variants wired upside-down (fixes compass/direction on some RP6 units)": "Повернуть LED-кольцо на 180° для стиков, распаянных вверх ногами (исправляет компас/направление на некоторых RP6)",
    "Blue": "Синий",
    "Cyan": "Голубой",
    "Purple": "Фиолетовый",
    "Pink": "Розовый",
    "Red": "Красный",
    "Orange": "Оранжевый",
    "Yellow": "Жёлтый",
    "Green": "Зелёный",
    "White": "Белый",
    "L3 (left stick click)": "L3 (нажатие левого стика)",
    "R3 (right stick click)": "R3 (нажатие правого стика)",
    "L4 (left paddle)": "L4 (левый лепесток)",
    "R4 (right paddle)": "R4 (правый лепесток)",
    "D-Pad Up": "Крестовина вверх",
    "D-Pad Down": "Крестовина вниз",
    "D-Pad Left": "Крестовина влево",
    "D-Pad Right": "Крестовина вправо",
    "Other buttons": "Другие кнопки",
    "Controller": "Контроллер",
    "Emulation": "Эмуляция",
    "Launch Calibration": "Запустить калибровку",
    "System": "Система",
    "Enable SSH": "Включить SSH",
    "Mount shared storage": "Монтировать общее хранилище",
    "Mount NEBEL_SHARED partition at ~/Shared": "Монтировать раздел NEBEL_SHARED в ~/Shared",
    "OS Version": "Версия ОС",
    "unknown": "неизвестно",
    "Sync": "Синхронизация",
    "Syncthing is not installed in this OS image": "Syncthing не установлен в этом образе ОС",
    "Sync service": "Служба синхронизации",
    "Running": "Работает",
    "Stopped": "Остановлено",
    "This device ID": "ID этого устройства",
    "{connected} of {total} device(s) connected": "Подключено устройств: {connected} из {total}",
    "Requests": "Запросы",
    "Device \"{name}\" wants to pair": "Устройство «{name}» хочет подключиться",
    "Folder \"{name}\" was shared with you": "С вами поделились папкой «{name}»",
    "Devices": "Устройства",
    "(connected)": "(подключено)",
    "Folders": "Папки",
    "Add a device first - folders sync only to paired devices": "Сначала добавьте устройство — папки синхронизируются только с сопряжёнными устройствами",
    "syncing…": "синхронизация…",
    "in sync": "синхронизировано",
    "Add device": "Добавить устройство",
    "Add folder": "Добавить папку",
    "Add custom folder": "Добавить свою папку",
    "Device ID of the other console (shown on its Sync tab)": "ID другой консоли (показан на её вкладке «Синхронизация»)",
    "Devices found on this network": "Устройства в этой сети",
    "Scanning...": "Сканирование...",
    "Nothing found - check Sync is on at the other console": "Ничего не найдено — проверьте, что синхронизация включена на другой консоли",
    "Rescan": "Сканировать ещё раз",
    "Or enter the Device ID by hand (shown on its Sync tab)": "Или введите ID устройства вручную (показан на его вкладке «Синхронизация»)",
    "Name (e.g. Mini V2)": "Имя (напр., Mini V2)",
    "Folder to sync (under ~ or /run/media)": "Папка для синхронизации (в ~ или /run/media)",
    "Label (optional)": "Метка (необязательно)",
    "Checking controller...": "Проверка контроллера...",
    "This device can't save calibration, but you can check stick and trigger response here.": "Это устройство не может сохранять калибровку, но здесь можно проверить отклик стиков и триггеров.",
    "Move both sticks in full circles and fully press both triggers, then Save.": "Покрутите оба стика по полному кругу и полностью нажмите оба триггера, затем нажмите «Сохранить».",
    "Press Start, then move sticks and triggers through full range.": "Нажмите Start, затем проведите стики и триггеры через полный диапазон.",
    "Save Calibration": "Сохранить калибровку",
    "Start Calibration": "Начать калибровку",
    "Reset to Defaults": "Сбросить к настройкам по умолчанию",
    "TabHome": "Главная",
    "TabGames": "Игры",
    "TabPower": "Питание",
    "TabDisplay": "Экран",
    "TabLighting": "Свет",
    "TabSync": "Синк",
    "TabSystem": "Система",
    "Quick toggles": "Быстрые переключатели",
    "Open full screen": "Открыть на весь экран",
    "Control Center": "Центр управления",
    "Storage": "Хранилище",
    "SSH": "SSH",
    "Overlay": "Оверлей",
    "Open Control Center": "Открыть центр управления",
    "Power Profile": "Профиль питания",
    "Add non-Steam game": "Добавить стороннюю игру",
    "Select the game's executable": "Выберите исполняемый файл игры",
    "Added to Steam library": "Добавлено в библиотеку Steam",
    "Added to Steam library (launches via Heroic)": "Добавлено в библиотеку Steam (запуск через Heroic)",
    "Heroic games": "Игры Heroic",
    "Heroic game": "Игра Heroic",
    "This shortcut goes through the Heroic client - in game mode the game may not appear on screen": "Этот ярлык запускается через клиент Heroic - в игровом режиме игра может не появиться на экране",
    "Fix shortcut": "Починить ярлык",
    "Fixing...": "Починка...",
    "Shortcut fixed - the game now launches directly, without the Heroic client": "Ярлык исправлен - игра теперь запускается напрямую, без клиента Heroic",
    "Failed to fix shortcut": "Не удалось починить ярлык",
    "Proton/Wine build (Heroic)": "Сборка Proton/Wine (Heroic)",
    "A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found": "Установлена сборка Sarek (устаревший DXVK) - выберите её для игр с чёрным экраном или ошибкой «no adapters found»",
    "WoW64 mode": "Режим WoW64",
    "Force Heroic launch settings": "Принудительно использовать настройки запуска Heroic",
    "Overrides the game's Heroic launch configuration from here": "Замещает конфигурацию запуска игры из Heroic отсюда",
    "Heroic configuration not found - launch the game once from Heroic first": "Конфигурация Heroic не найдена - сначала запустите игру из Heroic хотя бы раз",
    ".NET 4.8 (slow)": ".NET 4.8 (медленно)",
    "SD card": "Карта SD",
    "Internal storage": "Встроенная память",
    "Monitor": "Монитор",
    "Fan": "Вентилятор",
    "Battery": "Батарея",
    "Charging": "Заряжается",
    "Discharging": "Разряжается",
    "Full": "Заряжена",
    "Not charging": "Не заряжается",
    "Unknown": "Неизвестно",
    "FPS overlay (all games)": "FPS-оверлей (все игры)",
    "Shows FPS in every game, incl. non-Steam. Applies after reboot.": "Показывает FPS во всех играх, включая сторонние. Применится после перезагрузки.",
    "Notification flash": "Вспышка уведомлений",
    "Stick LEDs flash on notifications": "Подсветка стиков вспыхивает при уведомлениях",
    "Flash color": "Цвет вспышки",
    "Failed to add shortcut": "Не удалось добавить ярлык",
    "On-screen keyboard": "Экранная клавиатура",
    "Hotkeys": "Горячие клавиши",
    "Show hotkeys": "Показать горячие клавиши",
    "Game mode": "Игровой режим",
    "Desktop mode": "Режим рабочего стола",
    "Quick Access Menu": "Меню быстрого доступа",
    "Screenshot": "Снимок экрана",
    "Overview / activities": "Обзор / активности",
    "Escape": "Escape",
    "Volume": "Громкость",
    "Brightness": "Яркость",
    "Menu key": "Клавиша меню",
};
const es = {
    "Loading": "Cargando",
    "Default": "Predeterminado",
    "Reset to Default": "Restablecer valores predeterminados",
    "Cancel": "Cancelar",
    "Status": "Estado",
    "Error": "Error",
    "Remove": "Eliminar",
    "Accept": "Aceptar",
    "Dismiss": "Descartar",
    "Close": "Cerrar",
    "Edit Game Profile": "Editar perfil de juego",
    "Profile Settings": "Ajustes del perfil",
    "Advanced": "Avanzado",
    "Compatibility changes apply on next launch": "Los cambios de compatibilidad se aplicarán en el próximo inicio",
    "Compatibility Mode": "Modo de compatibilidad",
    "ARM64 (native, recommended)": "ARM64 (nativo, recomendado)",
    "x86_64 (emulated via FEX)": "x86_64 (emulado mediante FEX)",
    "Default Proton": "Proton predeterminado",
    "Apply to New Games": "Aplicar a juegos nuevos",
    "Game Resolution": "Resolución del juego",
    "Native": "Nativa",
    "Performance Overlay": "Superposición de rendimiento",
    "FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart": "Superposición de FPS/CPU/GPU/temperaturas mediante --mangoapp integrado en gamescope: se aplica tras reiniciar la sesión",
    "Compatibility Tool": "Herramienta de compatibilidad",
    "Use Default": "Usar predeterminado",
    "Follow Steam": "Seguir a Steam",
    "FEX Preset": "Preajuste de FEX",
    "Custom": "Personalizado",
    "CPU Cores": "Núcleos de CPU",
    "Default (any core)": "Predeterminado (cualquier núcleo)",
    "Big cores only (cpu4-7)": "Solo núcleos grandes (cpu4-7)",
    "Little cores only (cpu0-3)": "Solo núcleos pequeños (cpu0-3)",
    "Single core (cpu4)": "Un núcleo (cpu4)",
    "Two cores (cpu4-5)": "Dos núcleos (cpu4-5)",
    "Game Era": "Época del juego",
    "Old-school (Windows XP)": "Clásica (Windows XP)",
    "Modern (Windows 10/11)": "Moderna (Windows 10/11)",
    "XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced": "La época XP ajusta la versión de Windows, el renderizador de DirectX antiguo y dos núcleos de CPU; ajuste fino en Avanzado",
    "Auto": "Automático",
    "Windows 10/11 (default)": "Windows 10/11 (predeterminado)",
    "Auto (on for XP era)": "Automático (activo en la época XP)",
    "Off": "Desactivado",
    "Old games (legacy Windows)": "Juegos antiguos (Windows heredado)",
    "Windows Version (reported)": "Versión de Windows (visible para el juego)",
    "Old DirectX renderer": "Renderizador de DirectX antiguo",
    "Virtual Desktop": "Escritorio virtual",
    "Memory Limit": "Límite de memoria",
    "Caps memory the game can allocate - last resort for very old titles; can crash modern games": "Limita la memoria que el juego puede asignar: último recurso para títulos muy antiguos; puede bloquear juegos modernos",
    "GPU Spoof": "Suplantación de GPU",
    "DXVK version": "Versión de DXVK",
    "D3D12 (VKD3D) version": "Versión de D3D12 (VKD3D)",
    "Launch flags": "Opciones de lanzamiento",
    "D3D12 feature level 12_1": "Nivel de características D3D12 12_1",
    "Disable DirectX 12": "Desactivar DirectX 12",
    "WineD3D instead of DXVK": "WineD3D en lugar de DXVK",
    "Old OpenGL compatibility": "Compatibilidad con OpenGL antiguo",
    "Large address aware (32-bit games)": "Espacio de direcciones amplio (juegos de 32 bits)",
    "Mod/launcher DLL override": "Sustitución de DLL para mods y launchers",
    "Disable fsync": "Desactivar fsync",
    "Disable esync": "Desactivar esync",
    "For DirectX 12 games that black-screen or refuse to start": "Para juegos DirectX 12 con pantalla negra o que no arrancan",
    "For games whose DirectX 12 mode crashes - they fall back to DX11": "Para juegos cuyo modo DirectX 12 falla - vuelven a DX11",
    "For old DirectX 9-11 games that won't start on DXVK": "Para juegos antiguos de DirectX 9-11 que no arrancan con DXVK",
    "For old OpenGL games that misdetect the graphics driver": "Para juegos OpenGL antiguos que detectan mal el controlador",
    "For 32-bit era games crashing with out-of-memory errors": "Para juegos de la era 32 bits que fallan por falta de memoria",
    "Needed by mod loaders and third-party launchers (winhttp)": "Necesario para cargadores de mods y launchers de terceros (winhttp)",
    "For games that hang at startup or in anti-cheat init": "Para juegos que se cuelgan al arrancar o en el anticheat",
    "Launch switches applied to the game's environment - variables set directly in Launch Options take precedence": "Interruptores aplicados al entorno del juego - las variables definidas directamente en las opciones de lanzamiento tienen prioridad",
    "Default (Proton's built-in)": "Predeterminada (integrada en Proton)",
    "Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version": "Las versiones antiguas pueden ayudar en GPU Adreno donde las nuevas DXVK/VKD3D no arrancan; la predeterminada es la integrada en Proton",
    "Dependencies": "Dependencias",
    ".NET 3.5 (slow)": ".NET 3.5 (lento)",
    "Install": "Instalar",
    "Installed": "Instalado",
    "Installing...": "Instalando...",
    "Install recommended (DirectX 9 + VC++ 2005)": "Instalar recomendados (DirectX 9 + VC++ 2005)",
    "Recommended for Windows XP-era games": "Recomendado para juegos de la época de Windows XP",
    "Installing dependencies needs an internet connection": "La instalación de dependencias necesita conexión a internet",
    "Game prefix not found - launch the game once first": "No se encontró el prefijo del juego: ejecútalo una vez primero",
    "Dependency installer (winetricks) is missing in this OS build": "El instalador de dependencias (winetricks) no está en esta versión del SO",
    "Another installation is already running": "Ya hay otra instalación en curso",
    "Installation timed out": "La instalación agotó el tiempo de espera",
    "Installation failed - check the network connection": "Error de instalación: comprueba la conexión de red",
    "Host Thunks": "Thunks del host",
    "Hide Host Thunks": "Ocultar thunks del host",
    "Reset All Games": "Restablecer todos los juegos",
    "Resetting...": "Restableciendo...",
    "This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.": "Esto elimina todos los ajustes de Nebel por juego, restablece las resoluciones personalizadas, aplica el Proton predeterminado donde Steam selecciona Proton y deja las selecciones nativas de Linux en manos de Steam.",
    "Resolution override is unavailable": "La anulación de resolución no está disponible",
    "Failed to set resolution override": "No se pudo establecer la anulación de resolución",
    "Failed to set default resolution": "No se pudo establecer la resolución predeterminada",
    "Edit Power Profile": "Editar perfil de energía",
    "Fan Curve": "Curva del ventilador",
    "CPU Underclock": "Underclocking de CPU",
    "None": "Ninguno",
    "Small": "Pequeño",
    "Medium": "Medio",
    "Large": "Grande",
    "CPU Max (%)": "CPU máx. (%)",
    "GPU Min (%)": "GPU mín. (%)",
    "GPU Max (%)": "GPU máx. (%)",
    "Display": "Pantalla",
    "External Display": "Pantalla externa",
    "Internal Screen": "Pantalla interna",
    "{connector} (disconnected)": "{connector} (desconectado)",
    "Primary Display": "Pantalla principal",
    "Resolution": "Resolución",
    "Rotation": "Rotación",
    "Normal": "Normal",
    "90°": "90°",
    "180°": "180°",
    "270°": "270°",
    "This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.": "Es un panel vertical: elige la rotación que deje la imagen derecha. Se aplica al reiniciar el modo de juego.",
    "Internal screen as touchpad": "Pantalla interna como panel táctil",
    "While an external display is primary, the dark internal touchscreen works as a trackpad (correct orientation, tap = click). Off: it is disabled entirely.": "Mientras la pantalla principal es externa, la pantalla táctil interna apagada funciona como panel táctil (orientación correcta, toque = clic). Desactivado: se deshabilita por completo.",
    "No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.": "No se detectó ninguna pantalla externa. Conecta una (dock/USB-C/HDMI) para elegirla aquí.",
    "This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.": "Esta pantalla no está conectada ahora mismo: el modo de juego funciona en la pantalla interna hasta que se vuelva a conectar. Sus ajustes se conservan.",
    "Error: {message}": "Error: {message}",
    "Apply & Restart Game Mode": "Aplicar y reiniciar el modo de juego",
    "Stick Lighting": "Iluminación de los sticks",
    "No addressable stick lighting hardware detected on this device.": "No se detectó hardware de iluminación direccionable de sticks en este dispositivo.",
    "Enable": "Activar",
    "Turn both sticks off entirely, without losing the mode/color settings below": "Apagar ambos sticks por completo sin perder los ajustes de modo y color de abajo",
    "Sticks are off - settings below are kept, not applied.": "Los sticks están apagados: los ajustes de abajo se conservan, no se aplican.",
    "Follow screen brightness": "Seguir el brillo de la pantalla",
    "Dim both sticks along with the display backlight": "Atenuar ambos sticks junto con la retroiluminación de la pantalla",
    "Max Brightness": "Brillo máximo",
    "Configure each stick separately": "Configurar cada stick por separado",
    "Off: changes below apply to both sticks at once. On: pick a stick and edit just that one.": "Desactivado: los cambios de abajo se aplican a ambos sticks a la vez. Activado: elige un stick y edita solo ese.",
    "Stick": "Stick",
    "Left Stick": "Stick izquierdo",
    "Right Stick": "Stick derecho",
    "Mode": "Modo",
    "Static": "Estático",
    "Breathing": "Respiración",
    "Rainbow": "Arcoíris",
    "Wave (rainbow spread around the ring)": "Onda (arcoíris repartido por el anillo)",
    "Starlight (random zone twinkle)": "Luz estelar (parpadeo aleatorio de zonas)",
    "Spin": "Giro",
    "Reactive (sticks + buttons)": "Reactivo (sticks + botones)",
    "Multidot (RGB chase)": "Multipunto (persecución RGB)",
    "Ambilight (matches screen)": "Ambilight (coincide con la pantalla)",
    "Duotone (two-color split)": "Duotono (división en dos colores)",
    "Speed": "Velocidad",
    "Intensity (min brightness)": "Intensidad (brillo mínimo)",
    "Size": "Tamaño",
    "Soft trail": "Estela suave",
    "Trailing fade (uses Size below) instead of a single hard-edged dot": "Estela difuminada (usa Tamaño abajo) en lugar de un solo punto de bordes duros",
    "Compass": "Brújula",
    "Point the lit zone(s) at the stick's push direction instead of lighting evenly": "Apuntar las zonas iluminadas hacia la dirección de empuje del stick en lugar de iluminar uniformemente",
    "Seesaw": "Subibaja",
    "Breathe the two color groups against each other instead of a static split": "Los dos grupos de color «respiran» uno contra otro en lugar de una división estática",
    "Color Source": "Fuente de color",
    "Custom color": "Color personalizado",
    "Battery level": "Nivel de batería",
    "Random (unpredictable color shift)": "Aleatorio (cambio de color impredecible)",
    "Shimmer (pale/cool to rich/warm)": "Destello (de pálido/frío a intenso/cálido)",
    "Charging indicator": "Indicador de carga",
    "Spin a blue dot around the stick while charging (when the stick color follows the battery level)": "Un punto azul gira alrededor del stick durante la carga (cuando el color del stick sigue el nivel de batería)",
    "Custom color (advanced)": "Color personalizado (avanzado)",
    "Hide custom color": "Ocultar color personalizado",
    "Button": "Botón",
    "Split": "División",
    "Horizontal": "Horizontal",
    "Vertical": "Vertical",
    "Diagonal": "Diagonal",
    "Color A": "Color A",
    "Color B": "Color B",
    "Flip stick ring": "Invertir el anillo del stick",
    "Rotate the left stick's LED ring 180° - on some units the left ring is wired upside-down": "Gira el anillo LED del stick izquierdo 180°: en algunas unidades el anillo izquierdo está cableado al revés",
    "Rotate the LED ring 180° for stick variants wired upside-down (fixes compass/direction on some RP6 units)": "Girar el anillo LED 180° para variantes de stick cableadas al revés (corrige la brújula/dirección en algunas RP6)",
    "Blue": "Azul",
    "Cyan": "Cian",
    "Purple": "Morado",
    "Pink": "Rosa",
    "Red": "Rojo",
    "Orange": "Naranja",
    "Yellow": "Amarillo",
    "Green": "Verde",
    "White": "Blanco",
    "L3 (left stick click)": "L3 (clic del stick izquierdo)",
    "R3 (right stick click)": "R3 (clic del stick derecho)",
    "L4 (left paddle)": "L4 (paleta izquierda)",
    "R4 (right paddle)": "R4 (paleta derecha)",
    "D-Pad Up": "Cruceta arriba",
    "D-Pad Down": "Cruceta abajo",
    "D-Pad Left": "Cruceta izquierda",
    "D-Pad Right": "Cruceta derecha",
    "Other buttons": "Otros botones",
    "Controller": "Mando",
    "Emulation": "Emulación",
    "Launch Calibration": "Iniciar calibración",
    "System": "Sistema",
    "Enable SSH": "Activar SSH",
    "Mount shared storage": "Montar almacenamiento compartido",
    "Mount NEBEL_SHARED partition at ~/Shared": "Montar la partición NEBEL_SHARED en ~/Shared",
    "OS Version": "Versión del SO",
    "unknown": "desconocida",
    "Sync": "Sincronización",
    "Syncthing is not installed in this OS image": "Syncthing no está instalado en esta imagen del SO",
    "Sync service": "Servicio de sincronización",
    "Running": "En ejecución",
    "Stopped": "Detenido",
    "This device ID": "ID de este dispositivo",
    "{connected} of {total} device(s) connected": "{connected} de {total} dispositivo(s) conectados",
    "Requests": "Solicitudes",
    "Device \"{name}\" wants to pair": "El dispositivo «{name}» quiere emparejarse",
    "Folder \"{name}\" was shared with you": "La carpeta «{name}» se ha compartido contigo",
    "Devices": "Dispositivos",
    "(connected)": "(conectado)",
    "Folders": "Carpetas",
    "Add a device first - folders sync only to paired devices": "Añade primero un dispositivo: las carpetas solo se sincronizan con dispositivos emparejados",
    "syncing…": "sincronizando…",
    "in sync": "sincronizado",
    "Add device": "Añadir dispositivo",
    "Add folder": "Añadir carpeta",
    "Add custom folder": "Añadir carpeta personalizada",
    "Device ID of the other console (shown on its Sync tab)": "ID de la otra consola (se muestra en su pestaña Sincronización)",
    "Devices found on this network": "Dispositivos en esta red",
    "Scanning...": "Buscando...",
    "Nothing found - check Sync is on at the other console": "No se encontró nada: comprueba que la sincronización esté activada en la otra consola",
    "Rescan": "Buscar de nuevo",
    "Or enter the Device ID by hand (shown on its Sync tab)": "O introduce el ID del dispositivo a mano (se muestra en su pestaña Sincronización)",
    "Name (e.g. Mini V2)": "Nombre (p. ej., Mini V2)",
    "Folder to sync (under ~ or /run/media)": "Carpeta a sincronizar (bajo ~ o /run/media)",
    "Label (optional)": "Etiqueta (opcional)",
    "Checking controller...": "Comprobando el mando...",
    "This device can't save calibration, but you can check stick and trigger response here.": "Este dispositivo no puede guardar la calibración, pero aquí puedes comprobar la respuesta de sticks y gatillos.",
    "Move both sticks in full circles and fully press both triggers, then Save.": "Mueve ambos sticks en círculos completos y pulsa a fondo ambos gatillos, luego Guardar.",
    "Press Start, then move sticks and triggers through full range.": "Pulsa Start y luego mueve sticks y gatillos por todo su recorrido.",
    "Save Calibration": "Guardar calibración",
    "Start Calibration": "Iniciar calibración",
    "Reset to Defaults": "Restablecer valores predeterminados",
    "TabHome": "Inicio",
    "TabGames": "Juegos",
    "TabPower": "Energía",
    "TabDisplay": "Pantalla",
    "TabLighting": "Luces",
    "TabSync": "Sync",
    "TabSystem": "Sistema",
    "Quick toggles": "Interruptores rápidos",
    "Open full screen": "Abrir a pantalla completa",
    "Control Center": "Centro de control",
    "Storage": "Almacenamiento",
    "SSH": "SSH",
    "Overlay": "Superposición",
    "Open Control Center": "Abrir el centro de control",
    "Power Profile": "Perfil de energía",
    "Add non-Steam game": "Añadir juego externo",
    "Select the game's executable": "Selecciona el ejecutable del juego",
    "Added to Steam library": "Añadido a la biblioteca de Steam",
    "Added to Steam library (launches via Heroic)": "Añadido a la biblioteca de Steam (se inicia vía Heroic)",
    "Heroic games": "Juegos de Heroic",
    "Heroic game": "Juego de Heroic",
    "This shortcut goes through the Heroic client - in game mode the game may not appear on screen": "Este acceso directo se inicia a través del cliente Heroic: en el modo de juego es posible que el juego no aparezca en pantalla",
    "Fix shortcut": "Reparar acceso directo",
    "Fixing...": "Reparando...",
    "Shortcut fixed - the game now launches directly, without the Heroic client": "Acceso directo reparado: el juego ahora se inicia directamente, sin el cliente Heroic",
    "Failed to fix shortcut": "No se pudo reparar el acceso directo",
    "Proton/Wine build (Heroic)": "Versión de Proton/Wine (Heroic)",
    "A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found": "Hay una versión Sarek (DXVK heredado) instalada: elígela para los juegos con pantalla negra o con el error «no adapters found»",
    "WoW64 mode": "Modo WoW64",
    "Force Heroic launch settings": "Forzar los ajustes de lanzamiento de Heroic",
    "Overrides the game's Heroic launch configuration from here": "Sustituye la configuración de lanzamiento del juego de Heroic desde aquí",
    "Heroic configuration not found - launch the game once from Heroic first": "No se encontró la configuración de Heroic: inicia el juego una vez desde Heroic primero",
    ".NET 4.8 (slow)": ".NET 4.8 (lento)",
    "SD card": "Tarjeta SD",
    "Internal storage": "Almacenamiento interno",
    "Monitor": "Monitor",
    "Fan": "Ventilador",
    "Battery": "Batería",
    "Charging": "Cargando",
    "Discharging": "Descargando",
    "Full": "Completa",
    "Not charging": "No se carga",
    "Unknown": "Desconocido",
    "FPS overlay (all games)": "Overlay de FPS (todos los juegos)",
    "Shows FPS in every game, incl. non-Steam. Applies after reboot.": "Muestra FPS en todos los juegos, incluidos los de terceros. Se aplica tras reiniciar.",
    "Notification flash": "Destello de notificaciones",
    "Stick LEDs flash on notifications": "Los sticks parpadean con las notificaciones",
    "Flash color": "Color del destello",
    "Failed to add shortcut": "No se pudo añadir el acceso directo",
    "On-screen keyboard": "Teclado en pantalla",
    "Hotkeys": "Atajos",
    "Show hotkeys": "Mostrar atajos",
    "Game mode": "Modo de juego",
    "Desktop mode": "Modo escritorio",
    "Quick Access Menu": "Menú de acceso rápido",
    "Screenshot": "Captura de pantalla",
    "Overview / activities": "Vista general / actividades",
    "Escape": "Escape",
    "Volume": "Volumen",
    "Brightness": "Brillo",
    "Menu key": "Tecla de menú",
};
const fr = {
    "Loading": "Chargement",
    "Default": "Par défaut",
    "Reset to Default": "Réinitialiser par défaut",
    "Cancel": "Annuler",
    "Status": "Statut",
    "Error": "Erreur",
    "Remove": "Supprimer",
    "Accept": "Accepter",
    "Dismiss": "Ignorer",
    "Close": "Fermer",
    "Edit Game Profile": "Modifier le profil du jeu",
    "Profile Settings": "Paramètres du profil",
    "Advanced": "Avancé",
    "Compatibility changes apply on next launch": "Les changements de compatibilité s'appliqueront au prochain lancement",
    "Compatibility Mode": "Mode de compatibilité",
    "ARM64 (native, recommended)": "ARM64 (natif, recommandé)",
    "x86_64 (emulated via FEX)": "x86_64 (émulé via FEX)",
    "Default Proton": "Proton par défaut",
    "Apply to New Games": "Appliquer aux nouveaux jeux",
    "Game Resolution": "Résolution du jeu",
    "Native": "Native",
    "Performance Overlay": "Surcouche de performances",
    "FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart": "Surcouche FPS/CPU/GPU/températures via --mangoapp intégré à gamescope : s'applique au prochain redémarrage de session",
    "Compatibility Tool": "Outil de compatibilité",
    "Use Default": "Utiliser la valeur par défaut",
    "Follow Steam": "Suivre Steam",
    "FEX Preset": "Préréglage FEX",
    "Custom": "Personnalisé",
    "CPU Cores": "Cœurs CPU",
    "Default (any core)": "Par défaut (n'importe quel cœur)",
    "Big cores only (cpu4-7)": "Gros cœurs uniquement (cpu4-7)",
    "Little cores only (cpu0-3)": "Petits cœurs uniquement (cpu0-3)",
    "Single core (cpu4)": "Un cœur (cpu4)",
    "Two cores (cpu4-5)": "Deux cœurs (cpu4-5)",
    "Game Era": "Époque du jeu",
    "Old-school (Windows XP)": "Rétro (Windows XP)",
    "Modern (Windows 10/11)": "Moderne (Windows 10/11)",
    "XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced": "L'époque XP règle la version de Windows, le moteur DirectX ancien et deux cœurs CPU — réglages fins dans Avancé",
    "Auto": "Auto",
    "Windows 10/11 (default)": "Windows 10/11 (par défaut)",
    "Auto (on for XP era)": "Auto (activé pour l'époque XP)",
    "Off": "Désactivé",
    "Old games (legacy Windows)": "Jeux anciens (Windows hérité)",
    "Windows Version (reported)": "Version de Windows (vue par le jeu)",
    "Old DirectX renderer": "Rendu DirectX ancien",
    "Virtual Desktop": "Bureau virtuel",
    "Memory Limit": "Limite de mémoire",
    "Caps memory the game can allocate - last resort for very old titles; can crash modern games": "Limite la mémoire que le jeu peut allouer — dernier recours pour les très anciens titres ; peut planter les jeux modernes",
    "GPU Spoof": "Usurpation de GPU",
    "DXVK version": "Version de DXVK",
    "D3D12 (VKD3D) version": "Version de D3D12 (VKD3D)",
    "Launch flags": "Options de lancement",
    "D3D12 feature level 12_1": "Niveau de fonctionnalités D3D12 12_1",
    "Disable DirectX 12": "Désactiver DirectX 12",
    "WineD3D instead of DXVK": "WineD3D au lieu de DXVK",
    "Old OpenGL compatibility": "Compatibilité ancien OpenGL",
    "Large address aware (32-bit games)": "Grand espace d'adressage (jeux 32 bits)",
    "Mod/launcher DLL override": "Substitution de DLL pour mods et launchers",
    "Disable fsync": "Désactiver fsync",
    "Disable esync": "Désactiver esync",
    "For DirectX 12 games that black-screen or refuse to start": "Pour les jeux DirectX 12 à écran noir ou qui refusent de démarrer",
    "For games whose DirectX 12 mode crashes - they fall back to DX11": "Pour les jeux dont le mode DirectX 12 plante - retour à DX11",
    "For old DirectX 9-11 games that won't start on DXVK": "Pour les vieux jeux DirectX 9-11 qui ne démarrent pas sous DXVK",
    "For old OpenGL games that misdetect the graphics driver": "Pour les vieux jeux OpenGL qui détectent mal le pilote",
    "For 32-bit era games crashing with out-of-memory errors": "Pour les jeux de l'ère 32 bits plantant par manque de mémoire",
    "Needed by mod loaders and third-party launchers (winhttp)": "Requis par les chargeurs de mods et launchers tiers (winhttp)",
    "For games that hang at startup or in anti-cheat init": "Pour les jeux qui bloquent au démarrage ou dans l'anticheat",
    "Launch switches applied to the game's environment - variables set directly in Launch Options take precedence": "Options appliquées à l'environnement du jeu - les variables définies directement dans les options de lancement sont prioritaires",
    "Default (Proton's built-in)": "Par défaut (intégrée à Proton)",
    "Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version": "Les versions anciennes peuvent aider sur les GPU Adreno où les DXVK/VKD3D récents refusent de démarrer ; par défaut, la version intégrée à Proton est utilisée",
    "Dependencies": "Dépendances",
    ".NET 3.5 (slow)": ".NET 3.5 (lent)",
    "Install": "Installer",
    "Installed": "Installé",
    "Installing...": "Installation...",
    "Install recommended (DirectX 9 + VC++ 2005)": "Installer les recommandés (DirectX 9 + VC++ 2005)",
    "Recommended for Windows XP-era games": "Recommandé pour les jeux de l'époque Windows XP",
    "Installing dependencies needs an internet connection": "L'installation des dépendances nécessite une connexion internet",
    "Game prefix not found - launch the game once first": "Préfixe du jeu introuvable — lancez le jeu une fois d'abord",
    "Dependency installer (winetricks) is missing in this OS build": "L'installateur de dépendances (winetricks) est absent de cette version de l'OS",
    "Another installation is already running": "Une autre installation est déjà en cours",
    "Installation timed out": "L'installation a dépassé le délai imparti",
    "Installation failed - check the network connection": "Échec de l'installation — vérifiez la connexion réseau",
    "Host Thunks": "Thunks hôte",
    "Hide Host Thunks": "Masquer les thunks hôte",
    "Reset All Games": "Réinitialiser tous les jeux",
    "Resetting...": "Réinitialisation...",
    "This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.": "Cela supprime tous les paramètres Nebel par jeu, réinitialise les résolutions personnalisées, applique le Proton par défaut là où Steam sélectionne Proton, et laisse Steam gérer les jeux Linux natifs.",
    "Resolution override is unavailable": "Le forçage de résolution n'est pas disponible",
    "Failed to set resolution override": "Échec du forçage de résolution",
    "Failed to set default resolution": "Échec de la définition de la résolution par défaut",
    "Edit Power Profile": "Modifier le profil d'alimentation",
    "Fan Curve": "Courbe du ventilateur",
    "CPU Underclock": "Underclocking du CPU",
    "None": "Aucun",
    "Small": "Faible",
    "Medium": "Moyen",
    "Large": "Fort",
    "CPU Max (%)": "CPU max (%)",
    "GPU Min (%)": "GPU min (%)",
    "GPU Max (%)": "GPU max (%)",
    "Display": "Affichage",
    "External Display": "Écran externe",
    "Internal Screen": "Écran interne",
    "{connector} (disconnected)": "{connector} (déconnecté)",
    "Primary Display": "Écran principal",
    "Resolution": "Résolution",
    "Rotation": "Rotation",
    "Normal": "Normale",
    "90°": "90°",
    "180°": "180°",
    "270°": "270°",
    "This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.": "C'est un panneau portrait - choisissez la rotation qui redresse l'image. Appliqué au redémarrage du mode jeu.",
    "Internal screen as touchpad": "Écran interne comme pavé tactile",
    "While an external display is primary, the dark internal touchscreen works as a trackpad (correct orientation, tap = click). Off: it is disabled entirely.": "Quand un écran externe est principal, l'écran tactile interne éteint sert de pavé tactile (orientation correcte, toucher = clic). Désactivé : il est complètement coupé.",
    "No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.": "Aucun écran externe détecté. Connectez-en un (dock/USB-C/HDMI) pour le choisir ici.",
    "This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.": "Cet écran n'est pas connecté pour le moment : le mode jeu tourne sur l'écran interne jusqu'à ce qu'il soit rebranché. Ses paramètres sont conservés.",
    "Error: {message}": "Erreur : {message}",
    "Apply & Restart Game Mode": "Appliquer et redémarrer le mode jeu",
    "Stick Lighting": "Éclairage des sticks",
    "No addressable stick lighting hardware detected on this device.": "Aucun matériel d'éclairage adressable de sticks détecté sur cet appareil.",
    "Enable": "Activer",
    "Turn both sticks off entirely, without losing the mode/color settings below": "Éteindre complètement les deux sticks sans perdre les réglages de mode et de couleur ci-dessous",
    "Sticks are off - settings below are kept, not applied.": "Les sticks sont éteints : les réglages ci-dessous sont conservés, pas appliqués.",
    "Follow screen brightness": "Suivre la luminosité de l'écran",
    "Dim both sticks along with the display backlight": "Atténuer les deux sticks avec le rétroéclairage de l'écran",
    "Max Brightness": "Luminosité max",
    "Configure each stick separately": "Configurer chaque stick séparément",
    "Off: changes below apply to both sticks at once. On: pick a stick and edit just that one.": "Désactivé : les changements ci-dessous s'appliquent aux deux sticks à la fois. Activé : choisissez un stick et modifiez uniquement celui-ci.",
    "Stick": "Stick",
    "Left Stick": "Stick gauche",
    "Right Stick": "Stick droit",
    "Mode": "Mode",
    "Static": "Statique",
    "Breathing": "Respiration",
    "Rainbow": "Arc-en-ciel",
    "Wave (rainbow spread around the ring)": "Vague (arc-en-ciel réparti sur l'anneau)",
    "Starlight (random zone twinkle)": "Lumière stellaire (scintillement aléatoire des zones)",
    "Spin": "Rotation",
    "Reactive (sticks + buttons)": "Réactif (sticks + boutons)",
    "Multidot (RGB chase)": "Multipoint (poursuite RGB)",
    "Ambilight (matches screen)": "Ambilight (suit l'écran)",
    "Duotone (two-color split)": "Duotone (répartition en deux couleurs)",
    "Speed": "Vitesse",
    "Intensity (min brightness)": "Intensité (luminosité min)",
    "Size": "Taille",
    "Soft trail": "Traînée douce",
    "Trailing fade (uses Size below) instead of a single hard-edged dot": "Traînée estompée (utilise Taille ci-dessous) au lieu d'un point unique aux bords nets",
    "Compass": "Boussole",
    "Point the lit zone(s) at the stick's push direction instead of lighting evenly": "Orienter les zones éclairées vers la direction d'inclinaison du stick au lieu d'un éclairage uniforme",
    "Seesaw": "Bascule",
    "Breathe the two color groups against each other instead of a static split": "Les deux groupes de couleurs « respirent » l'un contre l'autre au lieu d'une répartition statique",
    "Color Source": "Source de couleur",
    "Custom color": "Couleur personnalisée",
    "Battery level": "Niveau de batterie",
    "Random (unpredictable color shift)": "Aléatoire (changement de couleur imprévisible)",
    "Shimmer (pale/cool to rich/warm)": "Chatoyant (de pâle/froid à riche/chaud)",
    "Charging indicator": "Indicateur de charge",
    "Spin a blue dot around the stick while charging (when the stick color follows the battery level)": "Un point bleu tourne autour du stick pendant la charge (quand la couleur du stick suit le niveau de batterie)",
    "Custom color (advanced)": "Couleur personnalisée (avancé)",
    "Hide custom color": "Masquer la couleur personnalisée",
    "Button": "Bouton",
    "Split": "Répartition",
    "Horizontal": "Horizontal",
    "Vertical": "Vertical",
    "Diagonal": "Diagonal",
    "Color A": "Couleur A",
    "Color B": "Couleur B",
    "Flip stick ring": "Inverser l'anneau du stick",
    "Rotate the left stick's LED ring 180° - on some units the left ring is wired upside-down": "Fait pivoter l'anneau LED du stick gauche de 180° - sur certaines unités, l'anneau gauche est câblé à l'envers",
    "Rotate the LED ring 180° for stick variants wired upside-down (fixes compass/direction on some RP6 units)": "Pivoter l'anneau LED de 180° pour les variantes de sticks câblées à l'envers (corrige la boussole/direction sur certaines RP6)",
    "Blue": "Bleu",
    "Cyan": "Cyan",
    "Purple": "Violet",
    "Pink": "Rose",
    "Red": "Rouge",
    "Orange": "Orange",
    "Yellow": "Jaune",
    "Green": "Vert",
    "White": "Blanc",
    "L3 (left stick click)": "L3 (clic du stick gauche)",
    "R3 (right stick click)": "R3 (clic du stick droit)",
    "L4 (left paddle)": "L4 (palette gauche)",
    "R4 (right paddle)": "R4 (palette droite)",
    "D-Pad Up": "Croix haut",
    "D-Pad Down": "Croix bas",
    "D-Pad Left": "Croix gauche",
    "D-Pad Right": "Croix droite",
    "Other buttons": "Autres boutons",
    "Controller": "Manette",
    "Emulation": "Émulation",
    "Launch Calibration": "Lancer l'étalonnage",
    "System": "Système",
    "Enable SSH": "Activer SSH",
    "Mount shared storage": "Monter le stockage partagé",
    "Mount NEBEL_SHARED partition at ~/Shared": "Monter la partition NEBEL_SHARED dans ~/Shared",
    "OS Version": "Version de l'OS",
    "unknown": "inconnue",
    "Sync": "Synchronisation",
    "Syncthing is not installed in this OS image": "Syncthing n'est pas installé dans cette image de l'OS",
    "Sync service": "Service de synchronisation",
    "Running": "En cours d'exécution",
    "Stopped": "Arrêté",
    "This device ID": "ID de cet appareil",
    "{connected} of {total} device(s) connected": "{connected} appareil(s) connecté(s) sur {total}",
    "Requests": "Demandes",
    "Device \"{name}\" wants to pair": "L'appareil «{name}» veut s'appairer",
    "Folder \"{name}\" was shared with you": "Le dossier «{name}» a été partagé avec vous",
    "Devices": "Appareils",
    "(connected)": "(connecté)",
    "Folders": "Dossiers",
    "Add a device first - folders sync only to paired devices": "Ajoutez d'abord un appareil : les dossiers ne se synchronisent qu'avec les appareils appairés",
    "syncing…": "synchronisation…",
    "in sync": "synchronisé",
    "Add device": "Ajouter un appareil",
    "Add folder": "Ajouter un dossier",
    "Add custom folder": "Ajouter un dossier personnalisé",
    "Device ID of the other console (shown on its Sync tab)": "ID de l'autre console (affiché sur son onglet Synchronisation)",
    "Devices found on this network": "Appareils détectés sur ce réseau",
    "Scanning...": "Recherche...",
    "Nothing found - check Sync is on at the other console": "Rien trouvé — vérifiez que la synchronisation est activée sur l'autre console",
    "Rescan": "Relancer la recherche",
    "Or enter the Device ID by hand (shown on its Sync tab)": "Ou saisissez l'ID de l'appareil à la main (affiché sur son onglet Synchronisation)",
    "Name (e.g. Mini V2)": "Nom (p. ex. Mini V2)",
    "Folder to sync (under ~ or /run/media)": "Dossier à synchroniser (sous ~ ou /run/media)",
    "Label (optional)": "Libellé (facultatif)",
    "Checking controller...": "Vérification de la manette...",
    "This device can't save calibration, but you can check stick and trigger response here.": "Cet appareil ne peut pas enregistrer l'étalonnage, mais vous pouvez vérifier ici la réponse des sticks et des gâchettes.",
    "Move both sticks in full circles and fully press both triggers, then Save.": "Décrivez des cercles complets avec les deux sticks et appuyez à fond sur les deux gâchettes, puis Enregistrer.",
    "Press Start, then move sticks and triggers through full range.": "Appuyez sur Start, puis parcourez toute la course des sticks et des gâchettes.",
    "Save Calibration": "Enregistrer l'étalonnage",
    "Start Calibration": "Démarrer l'étalonnage",
    "Reset to Defaults": "Réinitialiser par défaut",
    "TabHome": "Accueil",
    "TabGames": "Jeux",
    "TabPower": "Énergie",
    "TabDisplay": "Écran",
    "TabLighting": "Lumière",
    "TabSync": "Sync",
    "TabSystem": "Système",
    "Quick toggles": "Raccourcis rapides",
    "Open full screen": "Ouvrir en plein écran",
    "Control Center": "Centre de contrôle",
    "Storage": "Stockage",
    "SSH": "SSH",
    "Overlay": "Surimpression",
    "Open Control Center": "Ouvrir le centre de contrôle",
    "Power Profile": "Profil d'alimentation",
    "Add non-Steam game": "Ajouter un jeu externe",
    "Select the game's executable": "Sélectionnez l'exécutable du jeu",
    "Added to Steam library": "Ajouté à la bibliothèque Steam",
    "Added to Steam library (launches via Heroic)": "Ajouté à la bibliothèque Steam (lancé via Heroic)",
    "Heroic games": "Jeux Heroic",
    "Heroic game": "Jeu Heroic",
    "This shortcut goes through the Heroic client - in game mode the game may not appear on screen": "Ce raccourci passe par le client Heroic - en mode jeu, le jeu peut ne pas apparaître à l'écran",
    "Fix shortcut": "Réparer le raccourci",
    "Fixing...": "Réparation...",
    "Shortcut fixed - the game now launches directly, without the Heroic client": "Raccourci réparé - le jeu se lance désormais directement, sans le client Heroic",
    "Failed to fix shortcut": "Échec de la réparation du raccourci",
    "Proton/Wine build (Heroic)": "Version de Proton/Wine (Heroic)",
    "A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found": "Une version Sarek (DXVK hérité) est installée - choisissez-la pour les jeux qui affichent un écran noir ou l'erreur « no adapters found »",
    "WoW64 mode": "Mode WoW64",
    "Force Heroic launch settings": "Forcer les réglages de lancement Heroic",
    "Overrides the game's Heroic launch configuration from here": "Remplace la configuration de lancement Heroic du jeu depuis ici",
    "Heroic configuration not found - launch the game once from Heroic first": "Configuration Heroic introuvable - lancez d'abord le jeu une fois depuis Heroic",
    ".NET 4.8 (slow)": ".NET 4.8 (lent)",
    "SD card": "Carte SD",
    "Internal storage": "Stockage interne",
    "Monitor": "Moniteur",
    "Fan": "Ventilateur",
    "Battery": "Batterie",
    "Charging": "En charge",
    "Discharging": "Décharge",
    "Full": "Pleine",
    "Not charging": "Pas en charge",
    "Unknown": "Inconnu",
    "FPS overlay (all games)": "Overlay FPS (tous les jeux)",
    "Shows FPS in every game, incl. non-Steam. Applies after reboot.": "Affiche les FPS dans tous les jeux, y compris tiers. Actif après redémarrage.",
    "Notification flash": "Flash de notifications",
    "Stick LEDs flash on notifications": "Les sticks clignotent aux notifications",
    "Flash color": "Couleur du flash",
    "Failed to add shortcut": "Échec de l'ajout du raccourci",
    "On-screen keyboard": "Clavier à l'écran",
    "Hotkeys": "Raccourcis",
    "Show hotkeys": "Afficher les raccourcis",
    "Game mode": "Mode jeu",
    "Desktop mode": "Mode bureau",
    "Quick Access Menu": "Menu d'accès rapide",
    "Screenshot": "Capture d'écran",
    "Overview / activities": "Vue d'ensemble / activités",
    "Escape": "Échap",
    "Volume": "Volume",
    "Brightness": "Luminosité",
    "Menu key": "Touche menu",
};
const dictionaries = { uk, ru, es, fr };
// CEF's navigator.language follows the Steam UI language in game mode, which
// is the one signal available without depending on unstable SteamClient APIs.
function detectLocale() {
    const language = (typeof navigator !== "undefined" && navigator.language) || "";
    const prefix = language.toLowerCase().split("-")[0];
    if (prefix === "uk" || prefix === "ru" || prefix === "es" || prefix === "fr")
        return prefix;
    return "en";
}
const currentLocale = detectLocale();
function t(key, vars) {
    let text = dictionaries[currentLocale]?.[key] || key;
    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(value));
        }
    }
    return text;
}

function Icon({ path }) {
    return (SP_JSX.jsx("svg", { style: { display: "block" }, width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: path }));
}
const tabIcons = {
    Home: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }), SP_JSX.jsx("polyline", { points: "9 22 9 12 15 12 15 22" })] }) })),
    Games: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("line", { x1: "6", x2: "10", y1: "11", y2: "11" }), SP_JSX.jsx("line", { x1: "8", x2: "8", y1: "9", y2: "13" }), SP_JSX.jsx("line", { x1: "15", x2: "15.01", y1: "12", y2: "12" }), SP_JSX.jsx("line", { x1: "18", x2: "18.01", y1: "10", y2: "10" }), SP_JSX.jsx("path", { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" })] }) })),
    Power: (SP_JSX.jsx(Icon, { path: SP_JSX.jsx(SP_JSX.Fragment, { children: SP_JSX.jsx("path", { d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" }) }) })),
    Display: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }), SP_JSX.jsx("line", { x1: "8", x2: "16", y1: "21", y2: "21" }), SP_JSX.jsx("line", { x1: "12", x2: "12", y1: "17", y2: "21" })] }) })),
    Lighting: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" }), SP_JSX.jsx("path", { d: "M9 18h6" }), SP_JSX.jsx("path", { d: "M10 22h4" })] }) })),
    Sync: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M21 12a9 9 0 0 1-15.5 6.2L3 16" }), SP_JSX.jsx("path", { d: "M3 12a9 9 0 0 1 15.5-6.2L21 8" }), SP_JSX.jsx("path", { d: "M3 11v5h5" }), SP_JSX.jsx("path", { d: "M21 13V8h-5" })] }) })),
    System: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }), SP_JSX.jsx("circle", { cx: "12", cy: "12", r: "3" })] }) })),
};

const apps = () => window.SteamClient?.Apps;
const settings = () => window.SteamClient?.Settings;
// Keep in sync with PROTON_TOOL_NAME (build) and PROTON_11_STABLE (nebel-fixups).
const DEFAULT_WINDOWS_COMPAT_TOOL = "proton-cachyos-11.0-arm64";
// Valve's own actively-maintained catalog entry - unlike our bundled ARM64
// build, Steam can auto-download this one itself once it's selected, no
// manual fetch needed. Used as the default for "x86_64 (emulated)" mode.
const DEFAULT_X86_64_COMPAT_TOOL = "proton_experimental";
const USE_DEFAULT_COMPAT = "__nebel_default__";
const FOLLOW_STEAM_COMPAT = "__steam_default__";
// Confirmed live against a working ROCKNIX SM8550 install (same FEX build,
// same pressure-vessel/SLR runtime shape): running with every one of these
// thunks on was a plausible cause of x86_64-routed games failing to launch
// at all - thunking swaps a guest (x86) library for a host-native one at
// dlopen, which can fight pressure-vessel's own bundled x86_64 runtime
// libraries for the same symbols. Our native ARM64 Proton build needs none
// of these (its own binaries call the host GPU/audio stack directly, no
// FEX involved), so they're off in that mode; a genuinely x86_64-routed
// Proton's own Wine/Proton binaries DO need FEX to bridge those calls to
// the ARM64 host, so they're on in that mode.
const ARM64_MODE_THUNKS = {
    Vulkan: false, GL: false, EGL: false, drm: false, WaylandClient: false, asound: false,
};
const X86_64_MODE_THUNKS = {
    Vulkan: true, GL: true, EGL: true, drm: true, WaylandClient: true, asound: true,
};
let windowsCompatTool = DEFAULT_WINDOWS_COMPAT_TOOL;
let autoApplyCompat = true;
const handledAppids = new Set();
let protonToolsCache = [];
let protonToolsCachedAt = 0;
let protonToolsRequest = null;
function setWindowsCompatTool(toolName) {
    windowsCompatTool = toolName || DEFAULT_WINDOWS_COMPAT_TOOL;
}
function configureCompatPolicy(toolName, autoApply, appids) {
    setWindowsCompatTool(toolName);
    autoApplyCompat = autoApply;
    handledAppids.clear();
    for (const appid of appids) {
        const id = String(appid);
        if (/^\d+$/.test(id))
            handledAppids.add(id);
    }
}
function setAutoApplyCompat(enabled) {
    autoApplyCompat = enabled;
}
function handledGameAppids() {
    return Array.from(handledAppids).sort((a, b) => Number(a) - Number(b));
}
function markCompatHandled(appid) {
    const size = handledAppids.size;
    handledAppids.add(appid);
    return handledAppids.size !== size;
}
function mapCompatTools(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((tool) => ({
        id: String(tool?.strToolName ?? tool?.strName ?? tool?.name ?? ""),
        label: String(tool?.strDisplayName ?? tool?.strToolName ?? tool?.strName ?? ""),
    }))
        .filter((tool) => tool.id);
}
async function getProtonTools(refresh = false) {
    if (!refresh && protonToolsCache.length && Date.now() - protonToolsCachedAt < 5000)
        return protonToolsCache;
    if (protonToolsRequest)
        return protonToolsRequest;
    protonToolsRequest = (async () => {
        try {
            // Steam exposes Proton globally; per-app Linux runtimes only appear in available tools.
            const tools = mapCompatTools(await settings()?.GetGlobalCompatTools?.());
            if (tools.length) {
                protonToolsCache = tools;
                protonToolsCachedAt = Date.now();
            }
            return tools.length ? tools : protonToolsCache;
        }
        catch (error) {
            return protonToolsCache;
        }
        finally {
            protonToolsRequest = null;
        }
    })();
    return protonToolsRequest;
}
// A game's supported tools per Steam's OS filtering (Proton, plus SLR for a Linux depot); for the per-game picker.
async function getAppCompatTools(appid) {
    try {
        return mapCompatTools(await apps()?.GetAvailableCompatTools?.(Number(appid)));
    }
    catch (error) {
        return [];
    }
}
function appDetails(appid) {
    try {
        return window.appDetailsStore?.GetAppDetails?.(Number(appid)) || null;
    }
    catch (error) {
        return null;
    }
}
async function resolveCompatState(appid) {
    const details = await resolveDetails(appid);
    if (!details)
        return null;
    return {
        tool: String(details.strCompatToolName || ""),
        priority: Number(details.nCompatToolPriority || 0),
    };
}
function compatSelection(state) {
    if (!state || !state.tool || state.priority < 250)
        return FOLLOW_STEAM_COMPAT;
    return state.tool === windowsCompatTool ? USE_DEFAULT_COMPAT : state.tool;
}
async function specifyCompatTool(appid, toolName) {
    const store = apps();
    if (!store?.SpecifyCompatTool)
        throw new Error("Steam compatibility settings are unavailable");
    await store.SpecifyCompatTool(Number(appid), toolName);
}
const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
function requestAppDetails(appid) {
    // Not in @decky/ui's type defs (incomplete); exists on the runtime store.
    try {
        window.appDetailsStore?.RequestAppDetails?.(Number(appid));
    }
    catch (error) {
    }
}
// Absolute path: launch options run via a shell without /usr/libexec on PATH.
const LAUNCH_WRAPPER = "/usr/libexec/nebel/nebel-game-launch";
const COMMAND_TOKEN = "%command%";
// null when already wrapped (idempotent); preserves user options around %command%.
function wrapLaunchOptions(current) {
    const opts = current || "";
    if (opts.includes(LAUNCH_WRAPPER))
        return null;
    if (opts.includes(COMMAND_TOKEN)) {
        return opts.replace(COMMAND_TOKEN, `${LAUNCH_WRAPPER} ${COMMAND_TOKEN}`);
    }
    // No %command%: Steam appends bare options as args, so keep them after it.
    const trimmed = opts.trim();
    return trimmed
        ? `${LAUNCH_WRAPPER} ${COMMAND_TOKEN} ${trimmed}`
        : `${LAUNCH_WRAPPER} ${COMMAND_TOKEN}`;
}
async function resolveDetails(appid, attempts = 5) {
    for (let i = 0; i < attempts; i++) {
        const details = await subscribeAppDetails(appid);
        if (details)
            return details;
        requestAppDetails(appid);
        await delay(250);
    }
    return appDetails(appid);
}
function subscribeAppDetails(appid) {
    return waitForAppDetails(appid, () => true).promise;
}
function resolveSettledCompatDetails(appid) {
    return waitForAppDetails(appid, () => true, 1500, 250, true).promise;
}
// app_type: 1 = Game, 0x40000000 = non-Steam shortcut. Polls because overviews
// load a beat after plugin init.
const SHORTCUT_APP_TYPE = 0x40000000;
async function resolveOverviewType(appid) {
    for (let i = 0; i < 5; i++) {
        try {
            const type = window.appStore?.GetAppOverviewByAppID?.(Number(appid))?.app_type;
            if (type != null)
                return type;
        }
        catch (error) {
        }
        await delay(1000);
    }
    return null;
}
async function resolveCompatRoute(currentTool) {
    if (!currentTool)
        return "linux";
    const protonTools = await getProtonTools();
    if (!protonTools.length)
        return null;
    return protonTools.some((tool) => tool.id === currentTool) ? "windows" : "linux";
}
function waitForAppDetails(appid, accepts, timeoutMs = 1000, refreshMs = 0, settleEmpty = false) {
    let cancel = () => { };
    const promise = new Promise((resolve) => {
        const store = apps();
        if (!store?.RegisterForAppDetails) {
            resolve(null);
            return;
        }
        let done = false;
        let handle;
        let timeout;
        let refresh;
        let emptyTimer;
        let unregisterPending = false;
        const finish = (details) => {
            if (done)
                return;
            done = true;
            if (timeout !== undefined)
                window.clearTimeout(timeout);
            if (refresh !== undefined)
                window.clearInterval(refresh);
            if (emptyTimer !== undefined)
                window.clearTimeout(emptyTimer);
            if (handle) {
                try {
                    handle.unregister?.();
                }
                catch (error) {
                }
            }
            else {
                unregisterPending = true;
            }
            resolve(details || null);
        };
        cancel = () => finish(null);
        const accept = (details) => {
            if (!details || !accepts(details))
                return;
            if (!settleEmpty || String(details.strCompatToolName || "")) {
                finish(details);
            }
            else if (emptyTimer === undefined) {
                emptyTimer = window.setTimeout(() => finish(details), 500);
            }
        };
        try {
            handle = store.RegisterForAppDetails(Number(appid), accept);
            if (unregisterPending)
                handle?.unregister?.();
        }
        catch (error) {
            finish(null);
            return;
        }
        if (!done) {
            timeout = window.setTimeout(() => finish(null), timeoutMs);
            if (refreshMs > 0)
                refresh = window.setInterval(() => requestAppDetails(appid), refreshMs);
        }
    });
    return { promise, cancel };
}
async function clearCompatToolAndResolveRoute(appid) {
    const waiter = waitForAppDetails(appid, (details) => Number(details.nCompatToolPriority || 0) < 250, 5000, 250, true);
    try {
        await specifyCompatTool(appid, "");
    }
    catch (error) {
        waiter.cancel();
        return null;
    }
    requestAppDetails(appid);
    const details = await waiter.promise;
    if (!details)
        return null;
    return resolveCompatRoute(String(details.strCompatToolName || ""));
}
async function applyCompatDefaultForRoute(appid, route) {
    if (route === null)
        return false;
    if (route === "linux") {
        markCompatHandled(appid);
        return true;
    }
    const protonTools = await getProtonTools();
    if (!protonTools.some((tool) => tool.id === windowsCompatTool))
        return false;
    const waiter = waitForAppDetails(appid, (details) => Number(details.nCompatToolPriority || 0) >= 250
        && String(details.strCompatToolName || "") === windowsCompatTool, 5000, 250);
    try {
        await specifyCompatTool(appid, windowsCompatTool);
    }
    catch (error) {
        waiter.cancel();
        return false;
    }
    requestAppDetails(appid);
    if (!(await waiter.promise))
        return false;
    markCompatHandled(appid);
    return true;
}
// Wraps only a confirmed game or non-Steam shortcut (app_type 1 /
// 0x40000000), never a tool/runtime. Returns false if the overview/details
// were still cold, so the caller can retry; true once resolved.
async function applyLaunchWrapperToGame(appid) {
    const type = await resolveOverviewType(appid);
    if (type === null)
        return false;
    if (type !== 1 && type !== SHORTCUT_APP_TYPE)
        return true;
    const details = await resolveDetails(appid);
    if (!details)
        return false;
    const next = wrapLaunchOptions(String(details.strLaunchOptions || ""));
    if (next === null)
        return true;
    try {
        await apps()?.SetAppLaunchOptions?.(Number(appid), next);
    }
    catch (error) {
    }
    return true;
}
async function applyWindowsCompatDefault(appid) {
    const type = await resolveOverviewType(appid);
    if (type === null)
        return false;
    if (type !== 1)
        return true;
    if (handledAppids.has(appid))
        return true;
    const details = await resolveSettledCompatDetails(appid);
    if (!details)
        return false;
    if (!autoApplyCompat || Number(details.nCompatToolPriority || 0) >= 250) {
        markCompatHandled(appid);
        return true;
    }
    const route = await resolveCompatRoute(String(details.strCompatToolName || ""));
    return applyCompatDefaultForRoute(appid, route);
}
async function applyGamePolicy(appid) {
    const wrapped = await applyLaunchWrapperToGame(appid);
    const compat = await applyWindowsCompatDefault(appid);
    return wrapped && compat;
}
async function applyGamePolicyWithRetries(appid, onHandledChange) {
    const before = handledAppids.size;
    for (let attempt = 0; attempt < 6; attempt++) {
        if (await applyGamePolicy(appid)) {
            if (handledAppids.size !== before)
                onHandledChange();
            return;
        }
        await delay(5000);
    }
}
async function migrateWindowsCompatTool(appids, oldTool, newTool) {
    if (!oldTool || oldTool === newTool)
        return;
    const protonTools = await getProtonTools();
    if (!protonTools.some((tool) => tool.id === newTool))
        return;
    setWindowsCompatTool(newTool);
    let next = 0;
    const worker = async () => {
        while (next < appids.length) {
            const appid = appids[next++];
            const type = await resolveOverviewType(appid);
            if (type !== 1)
                continue;
            const details = await resolveDetails(appid);
            if (!details)
                continue;
            if (Number(details.nCompatToolPriority || 0) < 250)
                continue;
            if (String(details.strCompatToolName || "") !== oldTool)
                continue;
            for (let attempt = 0; attempt < 3; attempt++) {
                if (await applyCompatDefaultForRoute(appid, "windows"))
                    break;
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
}
async function resetCompatToolToDefault(appid) {
    const type = await resolveOverviewType(appid);
    if (type !== 1)
        return "";
    const route = await clearCompatToolAndResolveRoute(appid);
    const applied = await applyCompatDefaultForRoute(appid, route);
    return applied && route === "windows" ? windowsCompatTool : "";
}
async function resetAllCompatTools(appids) {
    await getProtonTools(true);
    let next = 0;
    const worker = async () => {
        while (next < appids.length) {
            const appid = appids[next++];
            const type = await resolveOverviewType(appid);
            if (type !== 1)
                continue;
            await applyCompatDefaultForRoute(appid, await clearCompatToolAndResolveRoute(appid));
        }
    };
    await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
}
// Unknown app_type (overview not loaded yet) is treated as a game so a real game is never hidden.
function isGameApp(appid) {
    try {
        const type = window.appStore?.GetAppOverviewByAppID?.(Number(appid))?.app_type;
        return type == null || type === 1;
    }
    catch (error) {
        return true;
    }
}
async function resolveGameAppids(appids) {
    const games = [];
    let next = 0;
    const worker = async () => {
        while (next < appids.length) {
            const appid = appids[next++];
            if (await resolveOverviewType(appid) === 1)
                games.push(appid);
        }
    };
    await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
    return games;
}
// Manifests include tools/runtimes, so type-check each; cold overviews are retried across rounds, not dropped.
async function sweepInstalledGames(appids) {
    const installed = new Set(appids);
    for (const appid of handledAppids) {
        if (!installed.has(appid))
            handledAppids.delete(appid);
    }
    let pending = appids.filter(isGameApp);
    for (let round = 0; round < 6 && pending.length; round++) {
        if (round > 0)
            await delay(5000);
        const unresolved = [];
        let next = 0;
        const worker = async () => {
            while (next < pending.length) {
                const appid = pending[next++];
                if (!(await applyGamePolicy(appid)))
                    unresolved.push(appid);
            }
        };
        await Promise.all(Array.from({ length: Math.min(10, pending.length) }, worker));
        pending = unresolved;
    }
}
function registerDownloadWatcher(onHandledChange) {
    const downloads = window.SteamClient?.Downloads;
    if (!downloads?.RegisterForDownloadItems)
        return () => { };
    let timer;
    const pending = new Set();
    const flush = () => {
        timer = undefined;
        for (const appid of pending) {
            applyGamePolicyWithRetries(appid, onHandledChange);
        }
        pending.clear();
    };
    // Each queue item is { remote_client_id, item_data: [{ appid, ... }] } - the
    // appids live in the item_data entries, not on the item itself.
    const handle = downloads.RegisterForDownloadItems((_paused, items) => {
        if (!Array.isArray(items))
            return;
        for (const item of items) {
            const entries = item?.item_data;
            if (!entries || typeof entries !== "object")
                continue;
            for (const entry of Object.values(entries)) {
                const appid = String(entry?.appid ?? "");
                if (appid && appid !== "0" && isGameApp(appid))
                    pending.add(appid);
            }
        }
        if (timer === undefined)
            timer = window.setTimeout(flush, 1500);
    });
    return () => {
        if (timer !== undefined)
            window.clearTimeout(timer);
        try {
            handle?.unregister?.();
        }
        catch (error) {
        }
    };
}

function gameDisplayName(game) {
    if (!game?.appid)
        return "";
    return game.name || `App ${game.appid}`;
}
function availableGames(config) {
    const games = new Map();
    for (const game of config.installedGames || []) {
        if (game?.appid && isGameApp(game.appid)) {
            games.set(String(game.appid), { appid: String(game.appid), name: game.name || `App ${game.appid}` });
        }
    }
    return Array.from(games.values()).sort((a, b) => gameDisplayName(a).localeCompare(gameDisplayName(b)));
}
function editTargetOptions(config) {
    return [
        { data: "", label: t("Default") },
        ...availableGames(config).map((game) => ({ data: game.appid, label: gameDisplayName(game) })),
    ];
}
function currentGame() {
    const running = DFL.Router?.MainRunningApp || window.Router?.MainRunningApp;
    const appid = running?.appid;
    if (!appid)
        return null;
    return gameRefFromAppid(String(appid), running?.display_name || running?.displayName || "");
}
// Name resolution for a known appid (Properties-page injection passes the
// appid from the route, so the Games editor can lock onto it without the
// picker). Falls back to "App <id>" while stores are still cold.
function gameRefFromAppid(appid, fallbackName = "") {
    const id = String(appid);
    let name = fallbackName;
    try {
        const overview = window.appStore?.GetAppOverviewByAppID?.(Number(id));
        name = overview?.display_name || name;
    }
    catch (error) {
    }
    try {
        const details = window.appDetailsStore?.GetAppDetails?.(Number(id));
        name = details?.strDisplayName || details?.strName || details?.name || name;
    }
    catch (error) {
    }
    return { appid: id, name: name || `App ${id}` };
}

// Steam ships several copies of the QAM CSS module and the hashes shift
// between client builds, so collect every module exposing the semantic keys
// and target all of them, plus the tested client's hashes as a fallback.
const QAM_CLASS_FALLBACK = {
    PanelSection: "_3gY0aBuNR8_NPTpXIYfkby",
    PanelSectionTitle: "_1IigUZ3GHaZS2Y-3V3T2rT",
};
function qamClasses(key) {
    const found = new Set([QAM_CLASS_FALLBACK[key]]);
    try {
        for (const mod of DFL.classMap) {
            const value = mod?.[key];
            if (typeof value === "string" && value)
                found.add(value);
        }
    }
    catch (error) {
    }
    return Array.from(found);
}
const selectorList = (scope, key) => qamClasses(key).map((cls) => `${scope} .${cls}`).join(", ");
// The QuickAccessMenu PanelSection title is small grey uppercase; Steam's
// full-page settings groups use a plain white 16px/500 header with 36px of
// height. This CSS restyles PanelSection titles under `scope` to the
// full-page look. Used both for the sections injected into Steam's settings
// pages and for the fullscreen /nebel-control page (but NOT for QAM
// surfaces - there uppercase is Steam's native style).
function nativeSectionTitleCss(scope) {
    return `
      ${selectorList(scope, "PanelSectionTitle")} {
        padding-bottom: 0;
        line-height: 36px;
        color: rgb(220, 222, 223);
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
      }
    `;
}
// Full native-group alignment for blocks injected into Steam's own settings
// pages: full-width rows (no QAM side inset - native rows pad themselves),
// 24px margin-top between groups (the native DialogSettingsSection
// convention), plus the title normalization above.
function nativeSectionSpacingCss(scope) {
    return `
      ${selectorList(scope, "PanelSection")} {
        padding-left: 0;
        padding-right: 0;
        margin: 24px 0 0;
      }
      ${qamClasses("PanelSection").map((cls) => `${scope} .${cls}:first-of-type`).join(", ")} {
        margin: 24px 0 0;
      }
    ` + nativeSectionTitleCss(scope);
}

const styles = `
      .nebel-control-tabs {
        height: 95%;
        width: 316px;
        position: fixed;
        margin-top: -12px;
        margin-left: -8px;
        overflow: hidden;
      }
      .nc-tab-title {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 2px 0;
      }
      .nc-tab-title svg {
        width: 18px;
        height: 18px;
      }
      .nc-tab-title span {
        font-size: 8px;
        line-height: 1;
        letter-spacing: -0.1px;
        opacity: 0.75;
        max-width: 44px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .nebel-control-tabs > div > div:first-child::before {
        background: #0D141C;
        box-shadow: none;
        backdrop-filter: none;
      }
      .nebel-control-tabs [role="tabpanel"] {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .nebel-control-tabs .nebel-control-tab-content {
        padding-bottom: 24px;
      }
      .nebel-control-root .nebel-slider-field {
        width: 100%;
        max-width: none;
        overflow: hidden;
      }
      .nebel-control-root .nebel-slider-field * {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      .nebel-control-root .nebel-reset-row {
        padding: 0 14px 8px;
      }
      .nebel-control-root .nebel-color-preview-row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 4px 0;
      }
      .nebel-control-root .nebel-color-preview-label {
        flex: 1 1 auto;
        opacity: 0.87;
      }
      .nebel-control-root .nebel-color-swatch {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
      }
      .nebel-control-root .nebel-color-preview-hex {
        flex: 0 0 auto;
        font-variant-numeric: tabular-nums;
        opacity: 0.62;
        font-size: 12px;
      }
      .nebel-control-root .nebel-preset-swatch {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
        cursor: pointer;
      }
      .nebel-control-root .nebel-color-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }
      .nebel-control-root .nebel-color-sv-wrap,
      .nebel-control-root .nebel-color-hue-wrap {
        position: relative;
      }
      .nebel-control-root .nebel-color-sv-canvas {
        display: block;
        border-radius: 6px;
        touch-action: none;
        cursor: crosshair;
      }
      .nebel-control-root .nebel-color-hue-canvas {
        display: block;
        border-radius: 4px;
        touch-action: none;
        cursor: ew-resize;
      }
      .nebel-control-root .nebel-color-cursor {
        position: absolute;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.5);
        pointer-events: none;
      }
      .nebel-control-root .nebel-color-hue-cursor {
        position: absolute;
        top: -2px;
        width: 4px;
        height: calc(100% + 4px);
        margin-left: -2px;
        border-radius: 2px;
        background: white;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
        pointer-events: none;
      }
      .nebel-control-root .nebel-compat-note,
      .nebel-native .nebel-compat-note {
        box-sizing: border-box;
        width: 100%;
        padding: 8px 16px 8px;
        font-size: 12px;
        line-height: 16px;
        opacity: 0.62;
        text-align: left;
        justify-content: flex-start;
        align-self: stretch;
      }
      .nebel-control-page {
        display: flex;
        width: 100%;
        height: 100%;
        background: #0D141C;
        color: #dbe2e6;
        overflow: hidden;
        /* Custom routes render under Steam's status/title bar; Decky exposes
           no header-height constant, so pad by a safe fixed ~64px (Steam's
           gamepad-UI header is 56-64px depending on DPI). QAM is unaffected. */
        padding-top: 64px;
        box-sizing: border-box;
      }
      .nc-page-sidebar {
        flex: 0 0 216px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 32px 12px;
        overflow-y: auto;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
      }
      .nc-page-tab {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 14px;
        opacity: 0.7;
        cursor: pointer;
      }
      .nc-page-tab svg {
        flex: 0 0 auto;
        width: 20px;
        height: 20px;
      }
      .nc-page-tab.nc-active {
        background: rgba(255, 255, 255, 0.12);
        opacity: 1;
      }
      .nc-page-content {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 24px 32px 48px;
      }
      .nc-page-content-inner {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
      }
    `;

function SelectEdit({ label, value, options, onChange, labelBelow, disabled }) {
    const rgOptions = options.map((option) => (typeof option === "string" ? { data: option, label: option } : option));
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: label === undefined ? (SP_JSX.jsx(DFL.Dropdown, { disabled: disabled, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) })) : labelBelow ? (SP_JSX.jsx(DFL.Field, { label: label, childrenLayout: "below", childrenContainerWidth: "max", disabled: disabled, children: SP_JSX.jsx(DFL.Dropdown, { disabled: disabled, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) }) })) : (SP_JSX.jsx(DFL.DropdownItemInternal, { disabled: disabled, childrenContainerWidth: "max", label: label, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) })) }));
}
// "More on the full page" affordance for simplified QAM tabs: jumps to the
// fullscreen /nebel-control route where the complete controls live.
function OpenFullScreenButton() {
    return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => {
                DFL.Navigation.Navigate("/nebel-control");
                DFL.Navigation.CloseSideMenus();
            }, children: t("Open full screen") }) }));
}
// Progressive disclosure: a ButtonItem header with a chevron that shows/hides
// its children. Closed by default so rarely-needed options stay out of the way.
function Collapsible({ label, children, defaultOpen }) {
    const [open, setOpen] = SP_REACT.useState(!!defaultOpen);
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setOpen((value) => !value), children: [open ? "▾ " : "▸ ", label] }), open ? children : null] }));
}
function ToggleRow({ label, value, onChange, disabled, description }) {
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: label, description: description, checked: !!value, disabled: disabled, onChange: onChange }) }));
}
// A compact, wrapping grid of tappable color swatches - replaces a long
// column of full-width preset buttons (one per color, "Blue"/"Cyan"/...)
// that took ten rows to scroll through. flow-children="row" keeps gamepad
// D-pad navigation moving sensibly across the grid instead of only up/down
// through what used to be a single column of buttons.
function PresetSwatchGrid({ colors, selected, onSelect }) {
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Focusable, { style: { display: "flex", flexWrap: "wrap", gap: 8 }, "flow-children": "row", children: colors.map((color) => (SP_JSX.jsx(DFL.Focusable, { className: "nebel-preset-swatch", style: {
                    backgroundColor: `#${color.value}`,
                    outline: selected === color.value ? "2px solid white" : undefined,
                }, title: color.label, onActivate: () => onSelect(color.value), onClick: () => onSelect(color.value), children: null }, color.value))) }) }));
}
function SliderEdit({ label, value, min, max, step, onChange, format }) {
    const numeric = Number(value);
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: "nebel-slider-field", children: SP_JSX.jsx(DFL.SliderField, { label: label, value: Number.isFinite(numeric) ? numeric : min, min: min, max: max, step: step, showValue: true, onChange: (next) => onChange(format ? format(next) : next) }) }) }));
}

// gamescope only ever drives one embedded output at a time (--prefer-output
// picks the first available from a priority list at startup, there's no
// live multi-monitor/hotplug re-pick) - so "primary display" here means
// which single connector the whole game-mode session targets, not an
// extend/mirror choice. Mirroring/extending is desktop-mode-only (Plasma's
// display settings); game mode stays single-screen by design.
const INTERNAL = "__internal__";
// An external panel can be physically portrait (the Retroid Dual Screen
// addon exposes only 1080x1920 but mounts landscape). gamescope rotates it
// via --force-external-orientation + the rotation shader (armada patches
// 0014/0005); portrait WITHOUT a rotation is rejected by the backend and by
// the session script, so pre-select one the user can flip if it's wrong.
const ORIENTATION_OPTIONS = [
    { data: "normal", label: t("Normal") },
    { data: "left", label: t("90°") },
    { data: "right", label: t("270°") },
    { data: "upsidedown", label: t("180°") },
];
const isPortrait = (width, height) => width > 0 && height > 0 && width < height;
const connectorLabel = (c) => {
    const base = c.name ? `${c.name} (${c.connector})` : c.connector;
    return c.connected ? base : t("{connector} (disconnected)", { connector: base });
};
function Display(_props) {
    const [state, setState] = SP_REACT.useState(null);
    const [loadMessage, setLoadMessage] = SP_REACT.useState(t("Loading"));
    const [errorMessage, setErrorMessage] = SP_REACT.useState("");
    const [saving, setSaving] = SP_REACT.useState(false);
    const [restarting, setRestarting] = SP_REACT.useState(false);
    SP_REACT.useEffect(() => {
        getDisplayState()
            .then(setState)
            .catch((error) => setLoadMessage(String(error)));
    }, []);
    if (!state) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: t("Display"), children: SP_JSX.jsx(DFL.Field, { label: loadMessage }) }));
    }
    const externals = state.connectors.filter((c) => !c.internal);
    const selectedConnector = state.useExternal ? state.connector : INTERNAL;
    const primaryOptions = [
        { data: INTERNAL, label: t("Internal Screen") },
        ...externals.map((c) => ({ data: c.connector, label: connectorLabel(c) })),
    ];
    const activeExternal = externals.find((c) => c.connector === state.connector);
    // A disconnected display has nothing meaningful to configure right now -
    // its remembered settings come back when it's plugged in again.
    const activeDisconnected = state.useExternal && (!activeExternal || !activeExternal.connected);
    const currentMode = `${state.width}x${state.height}`;
    const modeChoices = activeExternal?.modes.length ? activeExternal.modes : [currentMode];
    const modeOptions = modeChoices.map((mode) => ({ data: mode, label: mode }));
    const persist = (next) => {
        const merged = { ...state, ...next };
        setSaving(true);
        setErrorMessage("");
        setDisplayConfig(merged.useExternal, merged.connector, merged.width, merged.height, merged.orientation)
            .then(setState)
            .catch((error) => setErrorMessage(String(error)))
            .finally(() => setSaving(false));
    };
    const selectPrimary = (connector) => {
        if (connector === INTERNAL) {
            persist({ useExternal: false });
            return;
        }
        const target = externals.find((c) => c.connector === connector);
        const previous = state.remembered[connector];
        const [w, h] = (target?.modes[0] || "1920x1080").split("x").map(Number);
        const width = previous?.width || w || 1920;
        const height = previous?.height || h || 1080;
        let orientation = previous?.orientation || "normal";
        if (isPortrait(width, height) && orientation === "normal") {
            // Portrait panel + no rotation would be rejected by the backend (and
            // ignored by the session) - pre-select one; the user flips it below
            // if the image comes up the wrong way round.
            orientation = "left";
        }
        persist({ useExternal: true, connector, width, height, orientation });
    };
    const selectMode = (mode) => {
        const [w, h] = mode.split("x").map(Number);
        if (!w || !h)
            return;
        persist({
            width: w,
            height: h,
            orientation: isPortrait(w, h) && state.orientation === "normal" ? "left" : state.orientation,
        });
    };
    const selectOrientation = (orientation) => {
        persist({ orientation });
    };
    const toggleTouchpad = (enabled) => {
        setErrorMessage("");
        // Applies live when game mode is already on an external display (the
        // daemon starts/stops the trackpad service itself), otherwise at the
        // next session start - no restart needed either way.
        setInternalTouchpad(enabled)
            .then((value) => setState({ ...state, internalTouchpad: value }))
            .catch((error) => setErrorMessage(String(error)));
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("External Display"), children: [SP_JSX.jsx(SelectEdit, { label: t("Primary Display"), value: selectedConnector, options: primaryOptions, onChange: selectPrimary, disabled: saving }), state.useExternal && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("Resolution"), value: currentMode, options: modeOptions, onChange: selectMode, disabled: saving || activeDisconnected }), SP_JSX.jsx(SelectEdit, { label: t("Rotation"), value: state.orientation, options: ORIENTATION_OPTIONS, onChange: selectOrientation, disabled: saving || activeDisconnected }), isPortrait(state.width, state.height) && (SP_JSX.jsx(DFL.Field, { label: t("This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.") })), SP_JSX.jsx(ToggleRow, { label: t("Internal screen as touchpad"), description: t("While an external display is primary, the dark internal touchscreen works as a trackpad (correct orientation, tap = click). Off: it is disabled entirely."), value: state.internalTouchpad, onChange: toggleTouchpad, disabled: saving })] })), externals.length === 0 && (SP_JSX.jsx(DFL.Field, { label: t("No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.") })), activeDisconnected && (SP_JSX.jsx(DFL.Field, { label: t("This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.") })), errorMessage && SP_JSX.jsx(DFL.Field, { label: t("Error: {message}", { message: errorMessage }) }), SP_JSX.jsx("div", { className: "nebel-reset-row", children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: restarting, onClick: () => {
                        setRestarting(true);
                        setErrorMessage("");
                        // A successful restart tears down this very session (and Decky
                        // with it), so there's nothing to update on success - only a
                        // failure ever reaches this component again, and the button
                        // must re-enable then or a failed restart looks identical to a
                        // silently-still-in-progress one with no way to retry.
                        restartGamescopeSession()
                            .catch((error) => setErrorMessage(String(error)))
                            .finally(() => setRestarting(false));
                    }, children: t("Apply & Restart Game Mode") }) })] }));
}

function HeroicSection({ appid, forced, onToggleForce }) {
    const [info, setInfo] = SP_REACT.useState(null);
    const [cfg, setCfg] = SP_REACT.useState(null);
    const [versions, setVersions] = SP_REACT.useState([]);
    const [message, setMessage] = SP_REACT.useState("");
    const [fixing, setFixing] = SP_REACT.useState(false);
    // Auto-repair attempted for this appid - guards against a fix<->reload loop.
    const fixAttempted = SP_REACT.useRef("");
    const load = async () => {
        try {
            const next = await heroicShortcut(appid);
            setInfo(next);
            if (next) {
                setCfg(await getHeroicConfig(next.appName));
                setVersions(await listHeroicVersions());
            }
        }
        catch {
            setInfo(null);
        }
    };
    SP_REACT.useEffect(() => {
        setInfo(null);
        setCfg(null);
        setMessage("");
        fixAttempted.current = "";
        load();
    }, [appid]);
    const fixShortcut = async (target) => {
        setFixing(true);
        try {
            const id = Number(appid);
            const apps = window.SteamClient?.Apps;
            const dir = target.launcher.substring(0, target.launcher.lastIndexOf("/") + 1);
            await apps?.SetShortcutExe?.(id, target.launcher);
            await apps?.SetShortcutStartDir?.(id, dir);
            await apps?.SetShortcutLaunchOptions?.(id, `"${target.appName}" ${target.runner}`);
            await apps?.SpecifyCompatTool?.(id, "");
            setMessage(t("Shortcut fixed - the game now launches directly, without the Heroic client"));
            await load();
        }
        catch {
            setMessage(t("Failed to fix shortcut"));
        }
        setFixing(false);
    };
    // Steam styles its own compatibility checkbox with a page-local class the
    // borrowed DialogCheckbox component doesn't get - adopt it so both rows are
    // pixel-identical (a CSS fallback in NativeStyles covers the same values).
    const [hostClass, setHostClass] = SP_REACT.useState("");
    SP_REACT.useEffect(() => {
        const host = document.querySelector(".DialogBody .DialogCheckbox_Container");
        if (!host)
            return;
        const skip = new Set(["DialogCheckbox_Container", "_DialogLayout", "Panel"]);
        setHostClass(host.className.split(/\s+/).filter((c) => c && !skip.has(c)).join(" "));
    }, []);
    // heroic:// shortcuts silently die in game mode (they forward the URL to
    // any running Heroic instance and exit, so Steam thinks the game ended
    // instantly) - repair on sight instead of waiting for a click. Runs from
    // an effect so fixShortcut sees the loaded info, not a stale render scope.
    SP_REACT.useEffect(() => {
        if (info?.style === "heroic" && fixAttempted.current !== appid) {
            fixAttempted.current = appid;
            fixShortcut(info);
        }
    }, [info, appid]);
    if (!info)
        return null;
    const patch = async (value) => {
        try {
            setCfg(await setHeroicConfig(info.appName, value));
        }
        catch {
        }
    };
    const sarekAvailable = versions.some((version) => /sarek/i.test(version.name));
    const sarekActive = /sarek/i.test(cfg?.wineVersionName || "");
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [info.style === "heroic" ? (SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsx(DFL.Field, { label: t("Heroic game"), description: t("This shortcut goes through the Heroic client - in game mode the game may not appear on screen") }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: fixing, onClick: () => fixShortcut(info), children: fixing ? t("Fixing...") : t("Fix shortcut") })] })) : null, SP_JSX.jsx(DFL.DialogCheckbox, { className: hostClass || undefined, label: t("Force Heroic launch settings"), checked: forced, onChange: onToggleForce, bottomSeparator: "none" }), forced ? (SP_JSX.jsxs(DFL.PanelSection, { children: [cfg && versions.length > 0 ? (SP_JSX.jsx(SelectEdit, { label: t("Proton/Wine build (Heroic)"), value: cfg.wineVersionBin, options: versions.map((version) => ({ data: version.bin, label: version.name })), onChange: (bin) => {
                            const version = versions.find((entry) => entry.bin === bin);
                            if (version)
                                patch({ wineVersion: { bin: version.bin, name: version.name, type: version.type } });
                        } })) : null, sarekAvailable && !sarekActive ? (SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found") })) : null, !cfg ? (SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Heroic configuration not found - launch the game once from Heroic first") })) : null, cfg ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.ToggleField, { label: "Esync", checked: cfg.enableEsync, onChange: (value) => patch({ enableEsync: value }) }), SP_JSX.jsx(DFL.ToggleField, { label: "Fsync", checked: cfg.enableFsync, onChange: (value) => patch({ enableFsync: value }) }), SP_JSX.jsx(DFL.ToggleField, { label: "Msync", checked: cfg.enableMsync, onChange: (value) => patch({ enableMsync: value }) }), SP_JSX.jsx(DFL.ToggleField, { label: t("WoW64 mode"), checked: cfg.enableWoW64, onChange: (value) => patch({ enableWoW64: value }) })] })) : null] })) : null, message ? (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.Field, { label: message }) })) : null] }));
}

const GLOBAL_RESOLUTION_KEY = "gamescope_game_resolution_global";
function getGlobalResolution() {
    return window.settingsStore?.GetClientSetting?.(GLOBAL_RESOLUTION_KEY)?.[0] || "Default";
}
async function setGlobalResolution(value) {
    const setting = window.settingsStore?.GetClientSetting?.(GLOBAL_RESOLUTION_KEY);
    const setter = setting?.[1];
    if (!setter)
        throw new Error("Steam settings are unavailable");
    await Promise.resolve(setter(value));
    return getGlobalResolution();
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
function update(obj, path, value) {
    const next = clone(obj);
    let cursor = next;
    for (let i = 0; i < path.length - 1; i += 1)
        cursor = cursor[path[i]];
    cursor[path[path.length - 1]] = value;
    return next;
}
function titleCase(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

const resolutionOptions = [
    { data: "Default", label: t("Default") },
    { data: "Native", label: t("Native") },
    { data: "1280x720", label: "1280x720" },
    { data: "960x540", label: "960x540" },
];
const compatModeOptions = [
    { data: "arm64", label: t("ARM64 (native, recommended)") },
    { data: "x86_64", label: t("x86_64 (emulated via FEX)") },
];
const perGameModeOptions = [
    { data: FOLLOW_STEAM_COMPAT, label: t("Follow Steam") },
    ...compatModeOptions,
];
const gameEraOptions = [
    { data: "", label: t("Modern (Windows 10/11)") },
    { data: "xp", label: t("Old-school (Windows XP)") },
];
const windowsVersionOptions = [
    { data: "auto", label: t("Auto") },
    { data: "win10", label: t("Windows 10/11 (default)") },
    { data: "winxp", label: "Windows XP" },
];
const legacyRendererOptions = [
    { data: "auto", label: t("Auto (on for XP era)") },
    { data: "on", label: t("WineD3D (DirectX 1-7)") },
    { data: "off", label: t("DXVK (DirectX 8+)") },
];
const virtualDesktopOptions = [
    { data: "", label: t("Off") },
    { data: "640x480", label: "640x480" },
    { data: "800x600", label: "800x600" },
    { data: "1024x768", label: "1024x768" },
];
const memoryLimitOptions = [
    { data: "0", label: t("Off") },
    { data: "256", label: "256 MB" },
    { data: "512", label: "512 MB" },
    { data: "1024", label: "1 GB" },
    { data: "2048", label: "2 GB" },
];
const gpuSpoofOptions = [
    { data: "", label: t("Default") },
    { data: "steamdeck", label: "Steam Deck (AMD VanGogh)" },
    { data: "gtx1060", label: "NVIDIA GeForce GTX 1060" },
    { data: "rx580", label: "AMD Radeon RX 580" },
];
const dxvkVersionOptions = [
    { data: "", label: t("Default (Proton's built-in)") },
    { data: "dxvk-2.7.1", label: "DXVK 2.7.1" },
    { data: "dxvk-sarek", label: "DXVK-Sarek" },
    { data: "dxvk-async-1.10.3", label: "DXVK-async 1.10.3" },
];
const vkd3dVersionOptions = [
    { data: "", label: t("Default (Proton's built-in)") },
    { data: "vkd3d-3.0.1", label: "VKD3D-Proton 3.0.1" },
    { data: "vkd3d-3.0", label: "VKD3D-Proton 3.0" },
    { data: "vkd3d-2.14.1", label: "VKD3D-Proton 2.14.1" },
];
const DEPENDENCY_VERBS = [
    { id: "d3dx9", label: "DirectX 9 Runtime" },
    { id: "d3dx10", label: "DirectX 10 Runtime" },
    { id: "d3dx11_43", label: "DirectX 11 Runtime" },
    { id: "d3dcompiler_47", label: "D3D Compiler 47 (DirectX 11.1/12)" },
    { id: "xact", label: "XAudio2 (XACT)" },
    { id: "physx", label: "NVIDIA PhysX" },
    { id: "vcrun2005", label: "Visual C++ 2005" },
    { id: "vcrun2008", label: "Visual C++ 2008" },
    { id: "vcrun2010", label: "Visual C++ 2010" },
    { id: "vcrun2012", label: "Visual C++ 2012" },
    { id: "vcrun2013", label: "Visual C++ 2013" },
    { id: "vcrun2022", label: "Visual C++ 2015-2022" },
    { id: "dotnet35", label: t(".NET 3.5 (slow)") },
    { id: "dotnet40", label: ".NET 4.0" },
    { id: "dotnet48", label: t(".NET 4.8 (slow)") },
    { id: "xna40", label: "XNA Framework 4.0" },
    { id: "flash", label: "Flash Player" },
];
const RECOMMENDED_XP_DEPS = ["d3dx9", "vcrun2005"];
// SM8250's cpu0-3 are the 1.8GHz LITTLE cluster, cpu4-7 the 2.4-2.84GHz
// big+prime cluster - same split ROCKNIX's own SM8250 profile uses.
const cpuAffinityOptions = [
    { data: "", label: t("Default (any core)") },
    { data: "big", label: t("Big cores only (cpu4-7)") },
    { data: "little", label: t("Little cores only (cpu0-3)") },
    { data: "one", label: t("Single core (cpu4)") },
    { data: "two", label: t("Two cores (cpu4-5)") },
];
const fexKnobs = [
    { key: "TSOEnabled", label: "TSO Enabled" },
    { key: "X87ReducedPrecision", label: "X87 Reduced Precision" },
    { key: "Multiblock", label: "Multiblock" },
    { key: "VectorTSOEnabled", label: "Vector TSO Enabled" },
    { key: "MemcpySetTSOEnabled", label: "Memcpy Set TSO Enabled" },
    { key: "HalfBarrierTSOEnabled", label: "Half Barrier TSO Enabled" },
];
const thunkModules = [
    { module: "Vulkan", label: "Host Vulkan" },
    { module: "GL", label: "Host OpenGL" },
    { module: "EGL", label: "Host EGL" },
    { module: "asound", label: "Host ALSA" },
    { module: "drm", label: "Host DRM" },
    { module: "WaylandClient", label: "Host Wayland" },
];
function ConfirmResetAllModal({ closeModal, onConfirm }) {
    const confirm = () => {
        closeModal?.();
        onConfirm();
    };
    return (SP_JSX.jsxs(DFL.ModalRoot, { onCancel: closeModal, children: [SP_JSX.jsx(DFL.DialogBody, { children: t("This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.") }), SP_JSX.jsxs(DFL.DialogFooter, { children: [SP_JSX.jsx(DFL.DialogButton, { onClick: confirm, children: t("Reset All Games") }), SP_JSX.jsx(DFL.DialogButton, { onClick: closeModal, children: t("Cancel") })] })] }));
}
function Games({ config, setConfig, qam, lockedAppid, injected }) {
    const [resolution, setResolution] = SP_REACT.useState("Default");
    const [defaultResolution, setDefaultResolution] = SP_REACT.useState(getGlobalResolution());
    const [resolutionMessage, setResolutionMessage] = SP_REACT.useState("");
    const [resettingAll, setResettingAll] = SP_REACT.useState(false);
    const [customSelected, setCustomSelected] = SP_REACT.useState(false);
    const [showThunks, setShowThunks] = SP_REACT.useState(false);
    const [compatTools, setCompatTools] = SP_REACT.useState([]);
    const [perGameTools, setPerGameTools] = SP_REACT.useState([]);
    const [currentTool, setCurrentTool] = SP_REACT.useState("");
    const [globalTool, setGlobalTool] = SP_REACT.useState(String(config.tweaks?.global?.windowsCompatTool || DEFAULT_WINDOWS_COMPAT_TOOL));
    const runtimeGame = config.game;
    const games = availableGames(config);
    // lockedAppid: the injected Properties-page variant pins the editor to the
    // app whose Properties is open - no game picker, no "Default" target.
    // injected: rendered inside Steam's own Properties -> Compatibility page,
    // which already has Steam's compat-mode/tool pickers - so ours are hidden,
    // and x86_64-only knobs (FEX, DXVK/VKD3D versions, thunks) appear only when
    // the game actually resolves to an x86_64 tool.
    const selectedGame = lockedAppid
        ? gameRefFromAppid(lockedAppid)
        : config.selectedGame || runtimeGame || null;
    const game = selectedGame;
    const selectedAppidRef = SP_REACT.useRef("");
    selectedAppidRef.current = game?.appid || "";
    const tweaks = config.tweaks;
    const apps = window.SteamClient?.Apps;
    const persistHandledGames = () => saveCompatApplied(handledGameAppids()).catch(() => { });
    SP_REACT.useEffect(() => {
        let cancelled = false;
        async function loadResolution() {
            if (!game?.appid || !apps?.GetResolutionOverrideForApp) {
                setResolution("Default");
                setResolutionMessage("");
                return;
            }
            try {
                const current = await apps.GetResolutionOverrideForApp(Number(game.appid));
                if (!cancelled) {
                    setResolution(current || "Default");
                    setResolutionMessage("");
                }
            }
            catch (error) {
                if (!cancelled)
                    setResolutionMessage(t("Resolution override is unavailable"));
            }
        }
        loadResolution();
        return () => {
            cancelled = true;
        };
    }, [apps, game?.appid]);
    SP_REACT.useEffect(() => {
        setCustomSelected(false);
    }, [game?.appid]);
    SP_REACT.useEffect(() => {
        let cancelled = false;
        getProtonTools().then((tools) => {
            if (!cancelled)
                setCompatTools(tools);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    SP_REACT.useEffect(() => {
        if (!game?.appid) {
            setCurrentTool("");
            setPerGameTools([]);
            return;
        }
        const appid = game.appid;
        let cancelled = false;
        setCurrentTool(FOLLOW_STEAM_COMPAT);
        // Non-Steam shortcuts added mid-session never pass the bootstrap sweep -
        // make sure the launch wrapper is in place once the game is opened here.
        applyLaunchWrapperToGame(appid).catch(() => { });
        resolveCompatState(appid).then((state) => {
            if (!cancelled)
                setCurrentTool(compatSelection(state));
        });
        getAppCompatTools(appid).then((tools) => {
            if (!cancelled)
                setPerGameTools(tools);
        });
        return () => {
            cancelled = true;
        };
    }, [game?.appid]);
    SP_REACT.useEffect(() => {
        if (!apps?.RegisterForAppOverviewChanges)
            return;
        let cancelled = false;
        let timer;
        const handle = apps.RegisterForAppOverviewChanges(() => {
            const appid = selectedAppidRef.current;
            if (!appid || cancelled)
                return;
            if (timer !== undefined)
                window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                resolveCompatState(appid).then((state) => {
                    if (!cancelled && selectedAppidRef.current === appid)
                        setCurrentTool(compatSelection(state));
                }).catch(() => { });
            }, 250);
        });
        return () => {
            cancelled = true;
            if (timer !== undefined)
                window.clearTimeout(timer);
            try {
                handle?.unregister?.();
            }
            catch (error) {
            }
        };
    }, [apps]);
    SP_REACT.useEffect(() => {
        setDefaultResolution(getGlobalResolution());
    }, []);
    const gameSettings = game?.appid ? tweaks.games[game.appid] || {} : {};
    const editingDefault = !game?.appid;
    const values = editingDefault ? tweaks.global : { ...tweaks.global, ...gameSettings };
    const patchSettings = (patch) => {
        setConfig((current) => {
            if (!current)
                return current;
            const next = clone(current);
            if (editingDefault) {
                Object.assign(next.tweaks.global, patch);
            }
            else if (game?.appid) {
                const existing = next.tweaks.games[game.appid] || {};
                next.tweaks.games[game.appid] = { ...existing, name: game.name || "", ...patch };
            }
            return next;
        });
    };
    const envPresets = values.envPresets || {};
    const setEnvPreset = (key, on) => {
        const next = { ...envPresets };
        if (on)
            next[key] = true;
        else
            delete next[key];
        patchSettings({ envPresets: Object.keys(next).length ? next : undefined });
    };
    const resetGame = async () => {
        if (!game?.appid)
            return;
        const appid = game.appid;
        setConfig((current) => {
            if (!current)
                return current;
            const next = clone(current);
            delete next.tweaks.games[appid];
            return next;
        });
        try {
            const tool = await resetCompatToolToDefault(appid);
            setCurrentTool(tool === globalTool ? USE_DEFAULT_COMPAT : tool || FOLLOW_STEAM_COMPAT);
            persistHandledGames();
        }
        catch (error) {
        }
        if (apps?.SetAppResolutionOverride) {
            try {
                await apps.SetAppResolutionOverride(Number(appid), "Default");
                setResolution("Default");
                setResolutionMessage("");
            }
            catch (error) {
            }
        }
    };
    const setSteamResolution = async (value) => {
        setResolution(value);
        if (!game?.appid || !apps?.SetAppResolutionOverride)
            return;
        try {
            await apps.SetAppResolutionOverride(Number(game.appid), value);
            setResolutionMessage("");
        }
        catch (error) {
            setResolutionMessage(t("Failed to set resolution override"));
        }
    };
    const setSteamDefaultResolution = async (value) => {
        setDefaultResolution(value);
        try {
            const applied = await setGlobalResolution(value);
            setResolutionMessage("");
            setDefaultResolution(applied || "Default");
        }
        catch (error) {
            setResolutionMessage(t("Failed to set default resolution"));
        }
    };
    const resetAllGames = async () => {
        if (resettingAll)
            return;
        setResettingAll(true);
        setConfig((current) => {
            if (!current)
                return current;
            const next = clone(current);
            next.tweaks.games = {};
            return next;
        });
        try {
            const gameAppids = await resolveGameAppids(games.map((installed) => installed.appid));
            let nextResolution = 0;
            const resetResolution = async () => {
                while (nextResolution < gameAppids.length) {
                    const appid = gameAppids[nextResolution++];
                    if (!apps?.SetAppResolutionOverride)
                        continue;
                    try {
                        await apps.SetAppResolutionOverride(Number(appid), "Default");
                    }
                    catch (error) {
                    }
                }
            };
            await Promise.all([
                resetAllCompatTools(gameAppids),
                Promise.all(Array.from({ length: Math.min(10, gameAppids.length) }, resetResolution)),
            ]);
            await saveCompatApplied(handledGameAppids());
            setResolution("Default");
            if (game?.appid)
                setCurrentTool(compatSelection(await resolveCompatState(game.appid)));
        }
        catch (error) {
        }
        finally {
            setResettingAll(false);
        }
    };
    const confirmResetAllGames = () => {
        DFL.showModal(SP_JSX.jsx(ConfirmResetAllModal, { onConfirm: () => { void resetAllGames(); } }));
    };
    const gameOptions = editTargetOptions(config);
    // "" is the explicit Default target, not "nothing selected"; store a sentinel
    // so it doesn't fall back to the running game in the selectedGame derivation.
    const setSelectedGame = (appid) => {
        const id = String(appid);
        if (!id) {
            setConfig((current) => (current ? { ...current, selectedGame: { appid: "", name: "Default" } } : current));
            return;
        }
        const saved = games.find((candidate) => candidate.appid === id);
        setConfig((current) => (current ? { ...current, selectedGame: saved || null } : current));
    };
    const toolOptions = compatTools.map((tool) => ({ data: tool.id, label: tool.label }));
    const onSelectGlobalDefault = async (choice) => {
        const name = String(choice);
        const oldTool = String(tweaks.global.windowsCompatTool || DEFAULT_WINDOWS_COMPAT_TOOL);
        setGlobalTool(name);
        setWindowsCompatTool(name);
        patchSettings({ windowsCompatTool: name });
        await migrateWindowsCompatTool(config.installedGames.map((installed) => installed.appid), oldTool, name);
        persistHandledGames();
    };
    // Not a separate stored field - inferred from which default Proton is
    // selected, since that's what actually drives behavior. Anything other
    // than our own bundled ARM64 build counts as "x86_64 mode" for this
    // switch's purposes, even if the user picked a specific tool by hand via
    // "Default Proton" below rather than through this switch.
    const compatMode = globalTool === DEFAULT_WINDOWS_COMPAT_TOOL ? "arm64" : "x86_64";
    const onSelectCompatMode = async (choice) => {
        const mode = String(choice);
        if (mode === compatMode)
            return;
        patchSettings({ thunks: mode === "arm64" ? ARM64_MODE_THUNKS : X86_64_MODE_THUNKS });
        await onSelectGlobalDefault(mode === "arm64" ? DEFAULT_WINDOWS_COMPAT_TOOL : DEFAULT_X86_64_COMPAT_TOOL);
    };
    const selectableTools = new Map();
    for (const tool of [...perGameTools, ...compatTools])
        selectableTools.set(tool.id, tool);
    if (currentTool && currentTool !== USE_DEFAULT_COMPAT && currentTool !== FOLLOW_STEAM_COMPAT && !selectableTools.has(currentTool)) {
        selectableTools.set(currentTool, { id: currentTool, label: currentTool });
    }
    const perGameToolOptions = [
        { data: USE_DEFAULT_COMPAT, label: t("Use Default") },
        { data: FOLLOW_STEAM_COMPAT, label: t("Follow Steam") },
        ...Array.from(selectableTools.values()).map((tool) => ({ data: tool.id, label: tool.label })),
    ];
    const onSelectPerGameTool = async (choice) => {
        if (!game?.appid)
            return;
        const selection = String(choice);
        const target = selection === USE_DEFAULT_COMPAT
            ? globalTool
            : selection === FOLLOW_STEAM_COMPAT
                ? ""
                : selection;
        try {
            await specifyCompatTool(game.appid, target);
            markCompatHandled(game.appid);
            persistHandledGames();
            setCurrentTool(selection);
        }
        catch (error) {
        }
    };
    // FEX-Emu itself is an emulator layer Steam auto-prepends to any x86_64
    // tool's command chain (its toolmanifest has filter_exclusive_priority) -
    // it never appears in per-game pickers, so the per-game "FEX on/off" lever
    // is really "x86_64 Proton vs ARM64 Proton". Picking x86_64 also flips the
    // FEX thunks for this game: an x86_64 Proton needs them on to bridge its
    // binaries to the host, while the global default keeps them off (ARM64
    // mode), which is why a bare per-game tool switch used to fail to boot.
    const perGameMode = (() => {
        if (!currentTool || currentTool === FOLLOW_STEAM_COMPAT)
            return FOLLOW_STEAM_COMPAT;
        const tool = currentTool === USE_DEFAULT_COMPAT ? globalTool : currentTool;
        return tool.toLowerCase().includes("arm64") ? "arm64" : "x86_64";
    })();
    // Effective architecture for this game: an explicit per-game pick wins,
    // "Follow Steam" resolves against the global default mode. Drives which
    // knobs are meaningful in the injected view.
    const isX86Mode = perGameMode === "x86_64" || (perGameMode === FOLLOW_STEAM_COMPAT && compatMode === "x86_64");
    // Mirrors Steam's "Force the use of a specific Steam Play compatibility
    // tool" checkbox: a concrete tool is pinned in config.vdf. "Use Default"
    // also counts - it pins the global default tool. Per-game profile knobs
    // and the dependency installer only appear once a tool is forced, so the
    // page stays stock-looking for untouched games.
    const forcedTool = currentTool !== "" && currentTool !== FOLLOW_STEAM_COMPAT;
    const onSelectPerGameMode = async (choice) => {
        if (!game?.appid)
            return;
        const mode = String(choice);
        if (mode === perGameMode)
            return;
        patchSettings({
            thunks: mode === "arm64" ? ARM64_MODE_THUNKS : mode === "x86_64" ? X86_64_MODE_THUNKS : undefined,
        });
        const target = mode === "arm64"
            ? DEFAULT_WINDOWS_COMPAT_TOOL
            : mode === "x86_64"
                ? DEFAULT_X86_64_COMPAT_TOOL
                : "";
        try {
            await specifyCompatTool(game.appid, target);
            markCompatHandled(game.appid);
            persistHandledGames();
            const state = await resolveCompatState(game.appid);
            setCurrentTool(compatSelection(state));
        }
        catch (error) {
        }
    };
    const presets = config.fexProfiles || {};
    const presetEntries = Object.entries(presets);
    const storedProfile = values.fexProfile;
    const storedConfig = values.fexConfig;
    const ownConfig = (editingDefault ? tweaks.global.fexConfig : gameSettings.fexConfig);
    const hasPreset = !!(storedProfile && presets[storedProfile]);
    const isCustom = customSelected || (!hasPreset && !!storedConfig);
    const fexValue = isCustom ? "custom" : hasPreset ? storedProfile : "default";
    const fexConfig = (isCustom ? storedConfig : presets[fexValue]?.config) || presets.default?.config || {};
    const fexOptions = [...presetEntries.map(([id, profile]) => ({ data: id, label: profile.label })), { data: "custom", label: t("Custom") }];
    const onSelectFex = (id) => {
        if (id === "custom") {
            setCustomSelected(true);
            // First Custom for this target seeds from the Default preset; afterwards the
            // stored config is kept, including across visits to a preset.
            patchSettings({ fexProfile: "custom", fexConfig: { ...(ownConfig || presets.default?.config || {}) } });
            return;
        }
        setCustomSelected(false);
        patchSettings({ fexProfile: id });
    };
    const setKnob = (key, on) => patchSettings({ fexProfile: "custom", fexConfig: { ...fexConfig, [key]: on ? "1" : "0" } });
    const thunks = values.thunks || {};
    const setThunk = (module, on) => patchSettings({ thunks: { ...thunks, [module]: on } });
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!lockedAppid && (SP_JSX.jsxs(DFL.PanelSection, { title: t("Edit Game Profile"), children: [SP_JSX.jsx(SelectEdit, { value: game?.appid || "", options: gameOptions, onChange: setSelectedGame }), SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Compatibility changes apply on next launch") })] })), (editingDefault || !injected || forcedTool) && (SP_JSX.jsxs(DFL.PanelSection, { title: t("Profile Settings"), children: [editingDefault ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Compatibility Mode"), value: compatMode, options: compatModeOptions, onChange: onSelectCompatMode }), SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Default Proton"), value: globalTool, options: toolOptions, onChange: onSelectGlobalDefault }), SP_JSX.jsx(DFL.ToggleField, { label: t("Apply to New Games"), checked: tweaks.global.autoApplyCompat !== false, onChange: (enabled) => {
                                    setAutoApplyCompat(enabled);
                                    patchSettings({ autoApplyCompat: enabled });
                                } }), SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Game Era"), value: String(values.gameEra || ""), options: gameEraOptions, onChange: (value) => patchSettings({ gameEra: value || undefined }) }), values.gameEra === "xp" ? (SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced") })) : null, SP_JSX.jsx(SelectEdit, { label: t("Game Resolution"), value: defaultResolution, options: resolutionOptions, onChange: setSteamDefaultResolution }), !qam && (SP_JSX.jsx(DFL.ToggleField, { label: t("Performance Overlay"), description: t("FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart"), checked: tweaks.global.mangoapp === true, onChange: (enabled) => patchSettings({ mangoapp: enabled }) }))] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!injected && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Compatibility Mode"), value: perGameMode, options: perGameModeOptions, onChange: onSelectPerGameMode }), SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Compatibility Tool"), value: currentTool, options: perGameToolOptions, onChange: onSelectPerGameTool })] })), forcedTool && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { labelBelow: true, label: t("Game Era"), value: String(values.gameEra || ""), options: gameEraOptions, onChange: (value) => patchSettings({ gameEra: value || undefined }) }), values.gameEra === "xp" ? (SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced") })) : null, SP_JSX.jsx(SelectEdit, { label: t("Game Resolution"), value: resolution, options: resolutionOptions, onChange: setSteamResolution })] }))] })), resolutionMessage ? SP_JSX.jsx(DFL.Field, { label: t("Status"), description: resolutionMessage }) : null, !qam && (!injected || (forcedTool && isX86Mode)) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("FEX Preset"), value: fexValue, options: fexOptions, onChange: onSelectFex }), isCustom
                                ? fexKnobs.map((knob) => (SP_JSX.jsx(DFL.ToggleField, { label: knob.label, checked: fexConfig[knob.key] === "1", onChange: (value) => setKnob(knob.key, value) }, knob.key)))
                                : null] }))] })), !editingDefault && game?.appid ? (SP_JSX.jsx(HeroicSection, { appid: game.appid, forced: gameSettings.heroicForce === true, onToggleForce: (enabled) => patchSettings({ heroicForce: enabled || undefined }) })) : null, !qam && (!injected || forcedTool) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsxs(Collapsible, { label: t("Advanced"), children: [SP_JSX.jsx(SelectEdit, { label: t("CPU Cores"), value: String(values.cores || ""), options: cpuAffinityOptions, onChange: (value) => patchSettings({ cores: value || undefined }) }), (!injected || values.gameEra === "xp") && (SP_JSX.jsxs(Collapsible, { label: t("Old games (legacy Windows)"), children: [SP_JSX.jsx(SelectEdit, { label: t("Windows Version (reported)"), value: String(values.windowsVersion || "auto"), options: windowsVersionOptions, onChange: (value) => patchSettings({ windowsVersion: value === "auto" ? undefined : value }) }), SP_JSX.jsx(SelectEdit, { label: t("Old DirectX renderer"), value: String(values.legacyRenderer || "auto"), options: legacyRendererOptions, onChange: (value) => patchSettings({ legacyRenderer: value === "auto" ? undefined : value }) }), SP_JSX.jsx(SelectEdit, { label: t("Virtual Desktop"), value: String(values.virtualDesktop || ""), options: virtualDesktopOptions, onChange: (value) => patchSettings({ virtualDesktop: value || undefined }) }), SP_JSX.jsx(SelectEdit, { label: t("Memory Limit"), value: String(values.memoryLimitMB || 0), options: memoryLimitOptions, onChange: (value) => patchSettings({ memoryLimitMB: Number(value) || undefined }) }), SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Caps memory the game can allocate - last resort for very old titles; can crash modern games") })] })), SP_JSX.jsx(SelectEdit, { label: t("GPU Spoof"), value: String(values.gpuSpoof || ""), options: gpuSpoofOptions, onChange: (value) => patchSettings({ gpuSpoof: value || undefined }) }), (!injected || isX86Mode) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("DXVK version"), value: String(values.dxvkVersion || ""), options: dxvkVersionOptions, onChange: (value) => patchSettings({ dxvkVersion: value || undefined }) }), SP_JSX.jsx(SelectEdit, { label: t("D3D12 (VKD3D) version"), value: String(values.vkd3dVersion || ""), options: vkd3dVersionOptions, onChange: (value) => patchSettings({ vkd3dVersion: value || undefined }) }), SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version") }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setShowThunks((value) => !value), children: showThunks ? t("Hide Host Thunks") : t("Host Thunks") }), showThunks
                                                ? thunkModules.map((thunk) => (SP_JSX.jsx(DFL.ToggleField, { label: thunk.label, checked: thunks[thunk.module] !== false, onChange: (value) => setThunk(thunk.module, value) }, thunk.module)))
                                                : null] }))] }), SP_JSX.jsxs(Collapsible, { label: t("Launch flags"), children: [SP_JSX.jsx(DFL.ToggleField, { label: t("D3D12 feature level 12_1"), description: t("For DirectX 12 games that black-screen or refuse to start"), checked: envPresets.dx12Fl121 === true, onChange: (value) => setEnvPreset("dx12Fl121", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Disable DirectX 12"), description: t("For games whose DirectX 12 mode crashes - they fall back to DX11"), checked: envPresets.noD3d12 === true, onChange: (value) => setEnvPreset("noD3d12", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("WineD3D instead of DXVK"), description: t("For old DirectX 9-11 games that won't start on DXVK"), checked: envPresets.wineD3d === true, onChange: (value) => setEnvPreset("wineD3d", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Old OpenGL compatibility"), description: t("For old OpenGL games that misdetect the graphics driver"), checked: envPresets.oldGlString === true, onChange: (value) => setEnvPreset("oldGlString", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Large address aware (32-bit games)"), description: t("For 32-bit era games crashing with out-of-memory errors"), checked: envPresets.largeAddress === true, onChange: (value) => setEnvPreset("largeAddress", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Mod/launcher DLL override"), description: t("Needed by mod loaders and third-party launchers (winhttp)"), checked: envPresets.winhttpOverride === true, onChange: (value) => setEnvPreset("winhttpOverride", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Disable fsync"), description: t("For games that hang at startup or in anti-cheat init"), checked: envPresets.noFsync === true, onChange: (value) => setEnvPreset("noFsync", value) }), SP_JSX.jsx(DFL.ToggleField, { label: t("Disable esync"), description: t("For games that hang at startup or in anti-cheat init"), checked: envPresets.noEsync === true, onChange: (value) => setEnvPreset("noEsync", value) }), SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Launch switches applied to the game's environment - variables set directly in Launch Options take precedence") })] })] }), !editingDefault && game?.appid && forcedTool ? (SP_JSX.jsx(DependenciesSection, { appid: game.appid, eraXp: values.gameEra === "xp" })) : null, !editingDefault ? (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: resetGame, children: t("Reset to Default") }) })) : (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: resettingAll, onClick: confirmResetAllGames, children: resettingAll ? t("Resetting...") : t("Reset All Games") }) }))] })), !lockedAppid && SP_JSX.jsx(AddGameSection, {}), qam && SP_JSX.jsx(OpenFullScreenButton, {})] }));
}
// Per-game winetricks verbs ("Dependencies"): installs run in a backend
// worker thread, so the UI polls deps_status while busy instead of blocking.
function DependenciesSection({ appid, eraXp }) {
    const [status, setStatus] = SP_REACT.useState(null);
    SP_REACT.useEffect(() => {
        let cancelled = false;
        let timer;
        const load = async () => {
            try {
                const next = await getDepsStatus(appid);
                if (cancelled)
                    return;
                setStatus(next);
                if (next.busy)
                    timer = window.setTimeout(load, 1500);
            }
            catch (error) {
            }
        };
        load();
        return () => {
            cancelled = true;
            if (timer !== undefined)
                window.clearTimeout(timer);
        };
    }, [appid]);
    if (!status)
        return null;
    const install = (verbs) => {
        installDeps(appid, verbs).then(setStatus).catch(() => { });
        // Start polling right away - deps_install returns before the worker flips busy.
        window.setTimeout(() => {
            getDepsStatus(appid).then(setStatus).catch(() => { });
        }, 500);
    };
    if (!status.available) {
        return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(Collapsible, { label: t("Dependencies"), children: SP_JSX.jsx(DFL.Field, { description: t("Dependency installer (winetricks) is missing in this OS build") }) }) }));
    }
    if (!status.prefixFound) {
        return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(Collapsible, { label: t("Dependencies"), children: SP_JSX.jsx(DFL.Field, { description: t("Game prefix not found - launch the game once first") }) }) }));
    }
    const errorText = (() => {
        switch (status.error) {
            case "":
                return "";
            case "busy":
                return t("Another installation is already running");
            case "timeout":
                return t("Installation timed out");
            case "no-prefix":
                return t("Game prefix not found - launch the game once first");
            case "unavailable":
                return t("Dependency installer (winetricks) is missing in this OS build");
            default:
                return t("Installation failed - check the network connection");
        }
    })();
    const recommendedMissing = RECOMMENDED_XP_DEPS.filter((verb) => !status.installed.includes(verb));
    return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsxs(Collapsible, { label: t("Dependencies"), children: [SP_JSX.jsx("div", { className: "nebel-compat-note", children: t("Installing dependencies needs an internet connection") }), eraXp && recommendedMissing.length ? (SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: status.busy, description: t("Recommended for Windows XP-era games"), onClick: () => install(recommendedMissing), children: t("Install recommended (DirectX 9 + VC++ 2005)") })) : null, DEPENDENCY_VERBS.map((verb) => {
                    const installed = status.installed.includes(verb.id);
                    const installing = status.busy && status.currentVerb === verb.id;
                    return (SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: installed || status.busy, onClick: () => install([verb.id]), children: [verb.label, " \u2014 ", installed ? `✓ ${t("Installed")}` : installing ? t("Installing...") : t("Install")] }, verb.id));
                }), errorText ? SP_JSX.jsx(DFL.Field, { label: t("Status"), description: errorText }) : null] }) }));
}
// The stock "Browse..." button in Steam's Add Non-Steam Game dialog is broken
// in the ARM64 client (OpenFileDialog fails before reaching the portal), and
// native dialogs never appear in the gamescope session — so the picker lives
// right here and the pick is registered through Steam's AddShortcut API.
// Heroic games are intentionally NOT offered here: Heroic's own "Add to
// Steam" writes their shortcuts (with artwork and the right launch line) -
// this picker is for everything else.
function AddGameSection() {
    const [picker, setPicker] = SP_REACT.useState(null);
    const [addResult, setAddResult] = SP_REACT.useState("");
    const navigate = async (path) => {
        try {
            setPicker(await listDir(path));
        }
        catch {
            setAddResult(t("Failed to add shortcut"));
            setPicker(null);
        }
    };
    const pick = async (fullPath) => {
        setPicker(null);
        setAddResult("");
        try {
            const name = fullPath.split("/").pop()?.replace(/\.[^.]+$/, "") || fullPath;
            const startDir = fullPath.slice(0, fullPath.lastIndexOf("/")) || "/";
            // Steam quotes the Exe field itself — passing a pre-quoted path yields ""..."".
            // AddShortcut on this client IGNORES the name and launchOptions arguments
            // (it names the shortcut after the exe basename and writes empty options) -
            // both have to be applied afterwards through the dedicated setters.
            // The wrapper goes into Launch Options so per-game tweaks apply from the
            // first launch (the bootstrap sweep would add it later anyway).
            const appid = await SteamClient?.Apps?.AddShortcut?.(name, fullPath, startDir, "");
            if (typeof appid === "number" && appid > 0) {
                try {
                    await SteamClient.Apps.SetShortcutName(appid, name);
                }
                catch { }
                try {
                    await SteamClient.Apps.SetShortcutLaunchOptions(appid, "/usr/libexec/nebel/nebel-game-launch %command%");
                }
                catch { }
            }
            setAddResult(typeof appid === "number" && appid > 0 ? t("Added to Steam library") : t("Failed to add shortcut"));
        }
        catch {
            setAddResult(t("Failed to add shortcut"));
        }
    };
    const shortcutLabel = (s) => s.id === "home" ? t("Internal storage") : `${t("SD card")}: ${s.label}`;
    if (picker) {
        return (SP_JSX.jsxs(DFL.PanelSection, { title: t("Select the game's executable"), children: [SP_JSX.jsx(DFL.Field, { label: picker.path }), (picker.shortcuts || []).map((s) => (SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => navigate(s.path), children: [shortcutLabel(s), "/"] }, `s:${s.path}`))), picker.parent !== null && (SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => navigate(picker.parent || "/"), children: ".." })), picker.dirs.map((dir) => (SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => navigate(`${picker.path}/${dir}`), children: [dir, "/"] }, `d:${dir}`))), picker.files.map((file) => (SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => pick(`${picker.path}/${file}`), children: file }, `f:${file}`))), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setPicker(null), children: t("Cancel") })] }));
    }
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("Add non-Steam game"), children: [SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => navigate(""), children: t("Select the game's executable") }), addResult && SP_JSX.jsx(DFL.Field, { label: addResult })] }));
}

// RRGGBB hex <-> RGB <-> HSB conversions shared by every color picker in
// the Lighting tab (base color, flash colors, duotone A/B).
function hexToRgb(hex) {
    const clean = /^[0-9A-Fa-f]{6}$/.test(hex) ? hex : "0050FF";
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}
function rgbToHex(r, g, b) {
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    return [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}
// h: 0-360, s/v: 0-100 (percent) - the ranges people actually think in when
// picking a color, unlike 0-255 RGB channels that don't map to anything
// intuitive (hue, how saturated, how bright).
function rgbToHsb(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) {
        if (max === rn)
            h = 60 * (((gn - bn) / delta) % 6);
        else if (max === gn)
            h = 60 * ((bn - rn) / delta + 2);
        else
            h = 60 * ((rn - gn) / delta + 4);
    }
    if (h < 0)
        h += 360;
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return [h, s * 100, v * 100];
}
function hsbToRgb(h, s, v) {
    const hn = ((h % 360) + 360) % 360;
    const sn = Math.max(0, Math.min(100, s)) / 100;
    const vn = Math.max(0, Math.min(100, v)) / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
    const m = vn - c;
    let [r1, g1, b1] = [0, 0, 0];
    if (hn < 60)
        [r1, g1, b1] = [c, x, 0];
    else if (hn < 120)
        [r1, g1, b1] = [x, c, 0];
    else if (hn < 180)
        [r1, g1, b1] = [0, c, x];
    else if (hn < 240)
        [r1, g1, b1] = [0, x, c];
    else if (hn < 300)
        [r1, g1, b1] = [x, 0, c];
    else
        [r1, g1, b1] = [c, 0, x];
    return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}
function hexToHsb(hex) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHsb(r, g, b);
}
function hsbToHex(h, s, v) {
    const [r, g, b] = hsbToRgb(h, s, v);
    return rgbToHex(r, g, b);
}

// Photoshop-style graphical color picker: a saturation/brightness square
// (drag anywhere to pick both at once) plus a separate hue strip below it,
// replacing the old plain R/G/B sliders. Used for every color picker in the
// Lighting tab (base color, flash colors, duotone A/B) - the swatch+hex
// preview up top gives an at-a-glance readout to go with it.
const SV_WIDTH = 252;
const SV_HEIGHT = 140;
const HUE_HEIGHT = 18;
const CURSOR_RADIUS = 6;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
// Position within an element's own box, clamped to [0, size] on each axis -
// shared by both the SV square and the hue strip's pointer handlers.
function pointerOffset(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
        x: clamp(event.clientX - rect.left, 0, rect.width),
        y: clamp(event.clientY - rect.top, 0, rect.height),
    };
}
function ColorPicker({ label, hex, onChange }) {
    const [h, s, v] = hexToHsb(hex);
    const svCanvasRef = SP_REACT.useRef(null);
    const hueCanvasRef = SP_REACT.useRef(null);
    // The SV square's own gradient depends on the current hue (it's a
    // gradient of "this hue" from white/black to fully saturated/bright), so
    // it has to redraw whenever h changes - the hue strip itself is the same
    // full rainbow regardless of the current color, so it only draws once.
    SP_REACT.useEffect(() => {
        const canvas = svCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx)
            return;
        const [r, g, b] = hsbToRgb(h, 100, 100);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);
        // Left (white, s=0) -> right (pure hue, s=100).
        const satGradient = ctx.createLinearGradient(0, 0, SV_WIDTH, 0);
        satGradient.addColorStop(0, "rgba(255,255,255,1)");
        satGradient.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = satGradient;
        ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);
        // Top (v=100) -> bottom (black, v=0).
        const valGradient = ctx.createLinearGradient(0, 0, 0, SV_HEIGHT);
        valGradient.addColorStop(0, "rgba(0,0,0,0)");
        valGradient.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = valGradient;
        ctx.fillRect(0, 0, SV_WIDTH, SV_HEIGHT);
    }, [h]);
    SP_REACT.useEffect(() => {
        const canvas = hueCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx)
            return;
        const gradient = ctx.createLinearGradient(0, 0, SV_WIDTH, 0);
        for (const stop of [0, 60, 120, 180, 240, 300, 360]) {
            const [r, g, b] = hsbToRgb(stop, 100, 100);
            gradient.addColorStop(stop / 360, `rgb(${r}, ${g}, ${b})`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SV_WIDTH, HUE_HEIGHT);
    }, []);
    const handleSvPointer = SP_REACT.useCallback((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = pointerOffset(event);
        const nextS = (x / SV_WIDTH) * 100;
        const nextV = 100 - (y / SV_HEIGHT) * 100;
        onChange(hsbToHex(h, nextS, nextV));
    }, [h, onChange]);
    const handleHuePointer = SP_REACT.useCallback((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x } = pointerOffset(event);
        // 359.999 rather than 360 - hue wraps, and 360 would round-trip to the
        // same red as 0 anyway, so clamping there just avoids an off-by-one at
        // the strip's rightmost pixel.
        const nextH = clamp((x / SV_WIDTH) * 360, 0, 359.999);
        onChange(hsbToHex(nextH, s, v));
    }, [s, v, onChange]);
    const svCursorX = clamp((s / 100) * SV_WIDTH, CURSOR_RADIUS, SV_WIDTH - CURSOR_RADIUS);
    const svCursorY = clamp((1 - v / 100) * SV_HEIGHT, CURSOR_RADIUS, SV_HEIGHT - CURSOR_RADIUS);
    const hueCursorX = clamp((h / 360) * SV_WIDTH, 0, SV_WIDTH);
    // Gradient HSB strips beside the square (the picker only fills half the
    // row anyway): hue = rainbow, saturation = white -> hue, brightness =
    // black -> hue. Dragging a strip sets that channel directly.
    const rgb = (sh, ss, sv2) => {
        const [r, g, b] = hsbToRgb(sh, ss, sv2);
        return `rgb(${r}, ${g}, ${b})`;
    };
    const hsbStrips = [
        {
            channel: "h",
            caption: `H ${Math.round(h)}°`,
            frac: h / 360,
            stops: [0, 60, 120, 180, 240, 300, 360].map((stop) => [stop / 360, rgb(stop, 100, 100)]),
        },
        { channel: "s", caption: `S ${Math.round(s)}%`, frac: s / 100, stops: [[0, rgb(h, 0, v)], [1, rgb(h, 100, v)]] },
        { channel: "b", caption: `B ${Math.round(v)}%`, frac: v / 100, stops: [[0, rgb(h, s, 0)], [1, rgb(h, s, 100)]] },
    ];
    const pickStrip = (channel, frac) => {
        if (channel === "h")
            onChange(hsbToHex(clamp(frac * 360, 0, 359.999), s, v));
        else if (channel === "s")
            onChange(hsbToHex(h, clamp(frac * 100, 0, 100), v));
        else
            onChange(hsbToHex(h, s, clamp(frac * 100, 0, 100)));
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { className: "nebel-color-preview-row", children: [label !== undefined && SP_JSX.jsx("span", { className: "nebel-color-preview-label", children: label }), SP_JSX.jsx("div", { className: "nebel-color-swatch", style: { backgroundColor: `#${hex}` } }), SP_JSX.jsxs("span", { className: "nebel-color-preview-hex", children: ["#", hex] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { display: "flex", gap: "14px", alignItems: "flex-start", width: "100%" }, children: [SP_JSX.jsxs("div", { className: "nebel-color-picker", children: [SP_JSX.jsxs("div", { className: "nebel-color-sv-wrap", style: { width: SV_WIDTH, height: SV_HEIGHT }, children: [SP_JSX.jsx("canvas", { ref: svCanvasRef, width: SV_WIDTH, height: SV_HEIGHT, className: "nebel-color-sv-canvas", onPointerDown: handleSvPointer, onPointerMove: (event) => event.buttons === 1 && handleSvPointer(event) }), SP_JSX.jsx("div", { className: "nebel-color-cursor", style: { left: svCursorX, top: svCursorY, backgroundColor: `#${hex}` } })] }), SP_JSX.jsxs("div", { className: "nebel-color-hue-wrap", style: { width: SV_WIDTH, height: HUE_HEIGHT }, children: [SP_JSX.jsx("canvas", { ref: hueCanvasRef, width: SV_WIDTH, height: HUE_HEIGHT, className: "nebel-color-hue-canvas", onPointerDown: handleHuePointer, onPointerMove: (event) => event.buttons === 1 && handleHuePointer(event) }), SP_JSX.jsx("div", { className: "nebel-color-hue-cursor", style: { left: hueCursorX } })] })] }), SP_JSX.jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }, children: hsbStrips.map((strip) => (SP_JSX.jsx(HsbStrip, { caption: strip.caption, frac: strip.frac, stops: strip.stops, onPick: (frac) => pickStrip(strip.channel, frac) }, strip.channel))) })] }) })] }));
}
const STRIP_WIDTH = 240;
const STRIP_HEIGHT = 30;
// One gradient channel strip with a cursor; gradient redraws whenever the
// stops change (S/B strips depend on the other channels).
function HsbStrip({ caption, frac, stops, onPick }) {
    const canvasRef = SP_REACT.useRef(null);
    SP_REACT.useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx)
            return;
        const gradient = ctx.createLinearGradient(0, 0, STRIP_WIDTH, 0);
        for (const [offset, color] of stops)
            gradient.addColorStop(offset, color);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, STRIP_WIDTH, STRIP_HEIGHT);
    }, [stops]);
    const handlePointer = SP_REACT.useCallback((event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = event.currentTarget.getBoundingClientRect();
        onPick(clamp((event.clientX - rect.left) / rect.width, 0, 1));
    }, [onPick]);
    return (SP_JSX.jsxs("div", { children: [SP_JSX.jsx("div", { style: { fontSize: "11px", opacity: 0.65, marginBottom: "2px" }, children: caption }), SP_JSX.jsxs("div", { style: { position: "relative", width: "100%" }, children: [SP_JSX.jsx("canvas", { ref: canvasRef, width: STRIP_WIDTH, height: STRIP_HEIGHT, style: { display: "block", width: "100%", height: `${STRIP_HEIGHT}px`, borderRadius: "4px", touchAction: "none", cursor: "ew-resize" }, onPointerDown: handlePointer, onPointerMove: (event) => event.buttons === 1 && handlePointer(event) }), SP_JSX.jsx("div", { style: {
                            position: "absolute",
                            left: `calc(${(clamp(frac, 0, 1) * 100).toFixed(2)}% - 2px)`,
                            top: 0,
                            width: "4px",
                            height: `${STRIP_HEIGHT}px`,
                            borderRadius: "2px",
                            background: "#fff",
                            boxShadow: "0 0 2px rgba(0,0,0,0.9)",
                            pointerEvents: "none",
                        } })] })] }));
}

const fmtTemp = (v) => (v == null ? "—" : `${v.toFixed(1)} °C`);
const batteryLine = (m) => [
    m.batteryPct != null ? `${m.batteryPct}%` : "—",
    t(m.batteryStatus || "Unknown"),
    m.batteryWatts != null ? `${m.batteryWatts} W` : "",
]
    .filter(Boolean)
    .join(" · ");
// Self-contained monitor rows (CPU/GPU temps, fan, battery) - reused by the
// Home tab, the QAM Performance tab and anywhere else a live readout helps.
function MonitorRows() {
    const [mon, setMon] = SP_REACT.useState(null);
    SP_REACT.useEffect(() => {
        let alive = true;
        const tick = async () => {
            try {
                const next = await getSystemMonitor();
                if (alive)
                    setMon(next);
            }
            catch { }
        };
        tick();
        const timer = window.setInterval(tick, 2000);
        return () => {
            alive = false;
            window.clearInterval(timer);
        };
    }, []);
    if (!mon)
        return null;
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.Field, { label: "CPU / GPU", description: `${fmtTemp(mon.cpuTemp)} / ${fmtTemp(mon.gpuTemp)}` }), SP_JSX.jsx(DFL.Field, { label: t("Fan"), description: mon.fanPct != null ? `${mon.fanPct}%` : "—" }), SP_JSX.jsx(DFL.Field, { label: t("Battery"), description: batteryLine(mon) })] }));
}
// Self-contained gamescope FPS-overlay toggle - reused by Home's quick
// toggles and the native Settings -> In Game page.
function OverlayToggleRow() {
    const [enabled, setEnabled] = SP_REACT.useState(null);
    SP_REACT.useEffect(() => {
        getSystemMonitor()
            .then((m) => setEnabled(!!m.overlayEnabled))
            .catch(() => { });
    }, []);
    const setOverlay = async (value) => {
        setEnabled(value);
        try {
            setEnabled(!!(await setOverlayEnabled(value)));
        }
        catch {
            setEnabled(!value);
        }
    };
    return (SP_JSX.jsx(ToggleRow, { label: t("FPS overlay (all games)"), description: t("Shows FPS in every game, incl. non-Steam. Applies after reboot."), value: !!enabled, onChange: setOverlay }));
}
// Notification flash toggle + flash color (color under a spoiler - it's a
// set-once preference, not quick-toggle material). Reused by Home and the
// native Settings -> Notifications page.
function NotifyFlashRows({ config, setConfig, showColor = true }) {
    const stickLed = config.stickLed;
    const setStickLedNotify$1 = async (value) => {
        if (!stickLed)
            return;
        const previous = stickLed.notifyEnabled;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyEnabled: value } } : current));
        try {
            const applied = await setStickLedNotify(value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyEnabled: previous } } : current));
        }
    };
    const setStickLedNotifyColor$1 = async (hex) => {
        if (!stickLed)
            return;
        const previous = stickLed.notifyColor;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyColor: hex } } : current));
        try {
            const applied = await setStickLedNotifyColor(hex);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyColor: previous } } : current));
        }
    };
    if (!stickLed?.supported)
        return null;
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ToggleRow, { label: t("Notification flash"), description: t("Stick LEDs flash on notifications"), value: !!stickLed.notifyEnabled, onChange: setStickLedNotify$1 }), showColor && stickLed.notifyEnabled && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Collapsible, { label: t("Flash color"), children: SP_JSX.jsx(ColorPicker, { label: t("Flash color"), hex: stickLed.notifyColor || "33AAFF", onChange: setStickLedNotifyColor$1 }) }) }))] }));
}
function Home({ config, setConfig, qam }) {
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [qam && SP_JSX.jsx(OpenFullScreenButton, {}), SP_JSX.jsx(DFL.PanelSection, { title: t("Monitor"), children: SP_JSX.jsx(MonitorRows, {}) }), SP_JSX.jsxs(DFL.PanelSection, { title: t("Quick toggles"), children: [SP_JSX.jsx(OverlayToggleRow, {}), SP_JSX.jsx(NotifyFlashRows, { config: config, setConfig: setConfig, showColor: !qam })] }), SP_JSX.jsx(DFL.PanelSection, { title: t("System"), children: SP_JSX.jsx(DFL.Field, { label: t("OS Version"), description: config.osVersion || t("unknown") }) }), SP_JSX.jsx(DFL.PanelSection, { title: t("Hotkeys"), children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(Collapsible, { label: t("Show hotkeys"), children: HOTKEYS.map((row, index) => (SP_JSX.jsxs(SP_REACT.Fragment, { children: [(index === 0 || HOTKEYS[index - 1].mode !== row.mode) && SP_JSX.jsx(DFL.Field, { label: t(row.mode) }), SP_JSX.jsx(DFL.Field, { label: t(row.action), description: row.combo })] }, index))) }) }) })] }));
}
// Physical button names (Home/Back/D-Pad/Start/Select) stay untranslated -
// they are what is printed on the device.
const HOTKEYS = [
    // Game mode: the InputPlumber QuickAccess mapping (dedicated Back
    // button; Guide+A chord on the Flip2, which has no such button).
    { mode: "Game mode", action: "Quick Access Menu", combo: "Back · Home + A (Flip2)" },
    // Desktop mode: system_files/usr/libexec/nebel/nebel-desktop-hotkeys.
    { mode: "Desktop mode", action: "On-screen keyboard", combo: "Home + X" },
    { mode: "Desktop mode", action: "Screenshot", combo: "Home + Y" },
    { mode: "Desktop mode", action: "Overview / activities", combo: "Home + A" },
    { mode: "Desktop mode", action: "Escape", combo: "Home + B" },
    { mode: "Desktop mode", action: "Volume", combo: "Home + D-Pad ↑ / ↓" },
    { mode: "Desktop mode", action: "Brightness", combo: "Home + D-Pad ← / →" },
    { mode: "Desktop mode", action: "F12", combo: "Home + Start" },
    { mode: "Desktop mode", action: "Menu key", combo: "Home + Select" },
];

const PRESET_COLORS = [
    { label: t("Blue"), value: "0050FF" },
    { label: t("Cyan"), value: "00E5FF" },
    { label: t("Purple"), value: "8000FF" },
    { label: t("Pink"), value: "FF0080" },
    { label: t("Red"), value: "FF0000" },
    { label: t("Orange"), value: "FF8000" },
    // Matches stick-led-color's DEFAULT_DUOTONE_COLOR_B - pure gold (FFD700)
    // read as noticeably greenish on this LED.
    { label: t("Yellow"), value: "FFAA00" },
    { label: t("Green"), value: "00FF00" },
    { label: t("White"), value: "FFFFFF" },
];
function patchSide(stickLed, side, patch) {
    return { ...stickLed, sides: { ...stickLed.sides, [side]: { ...stickLed.sides[side], ...patch } } };
}
const SIDE_OPTIONS = [
    { data: "l", label: t("Left Stick") },
    { data: "r", label: t("Right Stick") },
];
const MODE_OPTIONS = [
    { data: "static", label: t("Static") },
    { data: "breathing", label: t("Breathing") },
    { data: "rainbow", label: t("Rainbow") },
    { data: "wave", label: t("Wave (rainbow spread around the ring)") },
    { data: "starlight", label: t("Starlight (random zone twinkle)") },
    { data: "spin", label: t("Spin") },
    { data: "reactive", label: t("Reactive (sticks + buttons)") },
    { data: "multidot", label: t("Multidot (RGB chase)") },
    { data: "ambilight", label: t("Ambilight (matches screen)") },
    { data: "duotone", label: t("Duotone (two-color split)") },
];
const COLOR_VISIBLE_MODES = new Set(["static", "breathing", "spin"]);
const COLOR_SOURCE_OPTIONS = [
    { data: "static", label: t("Custom color") },
    { data: "battery", label: t("Battery level") },
    { data: "random", label: t("Random (unpredictable color shift)") },
    { data: "shimmer", label: t("Shimmer (pale/cool to rich/warm)") },
];
const DUOTONE_ORIENTATION_OPTIONS = [
    { data: "horizontal", label: t("Horizontal") },
    { data: "vertical", label: t("Vertical") },
    { data: "diagonal", label: t("Diagonal") },
];
const FLASH_BUTTON_OPTIONS = [
    { data: "south", label: "South" },
    { data: "east", label: "East" },
    { data: "north", label: "North" },
    { data: "west", label: "West" },
    { data: "l1", label: "L1" },
    { data: "r1", label: "R1" },
    { data: "l3", label: t("L3 (left stick click)") },
    { data: "r3", label: t("R3 (right stick click)") },
    { data: "l4", label: t("L4 (left paddle)") },
    { data: "r4", label: t("R4 (right paddle)") },
    { data: "start", label: "Start" },
    { data: "select", label: "Select" },
    { data: "dpad_up", label: t("D-Pad Up") },
    { data: "dpad_down", label: t("D-Pad Down") },
    { data: "dpad_left", label: t("D-Pad Left") },
    { data: "dpad_right", label: t("D-Pad Right") },
    { data: "other", label: t("Other buttons") },
];
const DEFAULT_FLASH_COLOR = "FFFFFF";
const PARAM_UI = {
    speed: {
        label: t("Speed"),
        min: 25,
        max: 300,
        step: 25,
        modes: new Set(["breathing", "rainbow", "spin", "multidot", "ambilight", "duotone", "wave", "starlight"]),
        toBackend: (v) => v / 100,
        fromBackend: (v) => Math.round(v * 100),
    },
    intensity: {
        label: t("Intensity (min brightness)"),
        min: 0,
        max: 50,
        step: 5,
        modes: new Set(["breathing", "spin", "multidot", "reactive", "duotone", "starlight"]),
        toBackend: (v) => v / 100,
        fromBackend: (v) => Math.round(v * 100),
    },
    size: {
        label: t("Size"),
        min: 1,
        max: 3,
        step: 1,
        modes: new Set(["spin", "multidot", "reactive"]),
        toBackend: (v) => v,
        fromBackend: (v) => v,
    },
};
const PARAM_DEFAULTS = { speed: 1.0, intensity: 0.15, size: 2 };
function Lighting({ config, setConfig, qam }) {
    const [customColorExpanded, setCustomColorExpanded] = SP_REACT.useState(false);
    const [flashButton, setFlashButton] = SP_REACT.useState("south");
    const [selectedSide, setSelectedSide] = SP_REACT.useState("l");
    const [separate, setSeparate] = SP_REACT.useState(false);
    const stickLed = config.stickLed;
    const sideState = stickLed?.sides?.[selectedSide];
    const mode = sideState?.mode || "static";
    // When not "separate", every stick-lighting action targets both sticks at
    // once (mirrored) so the panel behaves like a single combined control -
    // the simpler default most people expect. Ticking "separate" scopes
    // everything below to just the selected stick, matching the underlying
    // backend state, which is always independent per stick regardless of
    // this toggle.
    const targetSides = separate ? [selectedSide] : ["l", "r"];
    const setStickLedMode$1 = async (nextMode) => {
        if (!stickLed)
            return;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].mode);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { mode: nextMode });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedMode(s, nextMode);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { mode: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedScreenLink$1 = async (value) => {
        if (!stickLed)
            return;
        const previous = stickLed.screenLink;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, screenLink: value } } : current));
        try {
            const applied = await setStickLedScreenLink(value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, screenLink: previous } } : current));
        }
    };
    const setStickLedEnabled$1 = async (value) => {
        if (!stickLed)
            return;
        const previous = stickLed.enabled;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, enabled: value } } : current));
        try {
            const applied = await setStickLedEnabled(value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, enabled: previous } } : current));
        }
    };
    const setStickLedMaxBrightness$1 = async (value) => {
        if (!stickLed)
            return;
        const previous = stickLed.maxBrightness;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, maxBrightness: value } } : current));
        try {
            const applied = await setStickLedMaxBrightness(value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, maxBrightness: previous } } : current));
        }
    };
    const setStickLedColor$1 = async (hex) => {
        if (!stickLed || !sideState)
            return;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].color);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { mode: "static", color: hex });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedColor(s, hex);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { color: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedFlashColor$1 = async (hex) => {
        if (!stickLed)
            return;
        const previous = stickLed.flashColors[flashButton];
        setConfig((current) => current
            ? { ...current, stickLed: { ...current.stickLed, flashColors: { ...current.stickLed.flashColors, [flashButton]: hex } } }
            : current);
        try {
            const applied = await setStickLedFlashColor(flashButton, hex);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => current
                ? { ...current, stickLed: { ...current.stickLed, flashColors: { ...current.stickLed.flashColors, [flashButton]: previous } } }
                : current);
        }
    };
    const setStickLedParam$1 = async (param, backendValue) => {
        if (!stickLed || !sideState)
            return;
        const effectiveMode = mode;
        const key = `${param}_${effectiveMode}`;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].params[key]);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { params: { ...sl.sides[s].params, [key]: backendValue } });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedParam(s, param, effectiveMode, backendValue);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { params: { ...sl.sides[s].params, [key]: previous[i] } }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedDuotoneColor$1 = async (slot, hex) => {
        if (!stickLed || !sideState)
            return;
        const field = slot === "a" ? "duotoneColorA" : "duotoneColorB";
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s][field]);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { [field]: hex });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedDuotoneColor(s, slot, hex);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { [field]: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedDuotoneOrientation$1 = async (orientation) => {
        if (!stickLed || !sideState)
            return;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].duotoneOrientation);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { duotoneOrientation: orientation });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedDuotoneOrientation(s, orientation);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { duotoneOrientation: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedColorSource$1 = async (source) => {
        if (!stickLed || !sideState)
            return;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].colorSource);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { colorSource: source });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedColorSource(s, source);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { colorSource: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const makeToggleSetter = (field, apply, sidesOverride) => async (value) => {
        if (!stickLed || !sideState)
            return;
        const sides = sidesOverride ?? targetSides;
        const previous = sides.map((s) => stickLed.sides[s][field]);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { [field]: value });
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await apply(s, value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patchSide(sl, s, { [field]: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const setStickLedChase$1 = makeToggleSetter("chase", setStickLedChase);
    const setStickLedCompass$1 = makeToggleSetter("compass", setStickLedCompass);
    const setStickLedSeesaw$1 = makeToggleSetter("seesaw", setStickLedSeesaw);
    const setStickLedFlip$1 = makeToggleSetter("flip", setStickLedFlip, ["l"]);
    if (!stickLed?.supported || !sideState) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: t("Stick Lighting"), children: SP_JSX.jsx(DFL.Field, { label: t("No addressable stick lighting hardware detected on this device.") }) }));
    }
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: t("Stick Lighting"), children: [SP_JSX.jsx(ToggleRow, { label: t("Enable"), description: t("Turn both sticks off entirely, without losing the mode/color settings below"), value: stickLed.enabled, onChange: setStickLedEnabled$1 }), !stickLed.enabled && SP_JSX.jsx(DFL.Field, { label: t("Sticks are off - settings below are kept, not applied.") }), stickLed.enabled && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("Mode"), value: mode, options: MODE_OPTIONS, onChange: setStickLedMode$1 }), !qam && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [mode === "spin" && (SP_JSX.jsx(ToggleRow, { label: t("Soft trail"), description: t("Trailing fade (uses Size below) instead of a single hard-edged dot"), value: !!sideState.chase, onChange: setStickLedChase$1 })), mode === "reactive" && (SP_JSX.jsx(ToggleRow, { label: t("Compass"), description: t("Point the lit zone(s) at the stick's push direction instead of lighting evenly"), value: !!sideState.compass, onChange: setStickLedCompass$1 })), mode === "duotone" && (SP_JSX.jsx(ToggleRow, { label: t("Seesaw"), description: t("Breathe the two color groups against each other instead of a static split"), value: !!sideState.seesaw, onChange: setStickLedSeesaw$1 })), Object.entries(PARAM_UI)
                                        .filter(([, spec]) => spec.modes.has(mode))
                                        .map(([param, spec]) => {
                                        const key = `${param}_${mode}`;
                                        const raw = sideState.params[key] ?? PARAM_DEFAULTS[param];
                                        return (SP_JSX.jsx(SliderEdit, { label: spec.label, value: spec.fromBackend(raw), min: spec.min, max: spec.max, step: spec.step, onChange: (value) => setStickLedParam$1(param, spec.toBackend(value)) }, param));
                                    }), COLOR_VISIBLE_MODES.has(mode) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("Color Source"), value: sideState.colorSource || "static", options: COLOR_SOURCE_OPTIONS, onChange: setStickLedColorSource$1 }), sideState.colorSource !== "battery" && sideState.colorSource !== "random" && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(PresetSwatchGrid, { colors: PRESET_COLORS, selected: sideState.color, onSelect: setStickLedColor$1 }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setCustomColorExpanded((expanded) => !expanded), children: customColorExpanded ? t("Hide custom color") + " ▲" : t("Custom color (advanced)") + " ▼" }), customColorExpanded && (SP_JSX.jsx(ColorPicker, { hex: sideState.color, onChange: setStickLedColor$1 }))] }))] })), mode === "duotone" && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("Split"), value: sideState.duotoneOrientation || "horizontal", options: DUOTONE_ORIENTATION_OPTIONS, onChange: setStickLedDuotoneOrientation$1 }), SP_JSX.jsx(ColorPicker, { label: t("Color A"), hex: sideState.duotoneColorA, onChange: (hex) => setStickLedDuotoneColor$1("a", hex) }), SP_JSX.jsx(ColorPicker, { label: t("Color B"), hex: sideState.duotoneColorB, onChange: (hex) => setStickLedDuotoneColor$1("b", hex) })] }))] })), SP_JSX.jsx(ToggleRow, { label: t("Follow screen brightness"), description: t("Dim both sticks along with the display backlight"), value: !!stickLed.screenLink, onChange: setStickLedScreenLink$1 }), !stickLed.screenLink && (SP_JSX.jsx(SliderEdit, { label: t("Max Brightness"), value: Math.round((stickLed.maxBrightness ?? 1) * 100), min: 0, max: 100, step: 5, onChange: (value) => setStickLedMaxBrightness$1(value / 100) })), !qam && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ToggleRow, { label: t("Configure each stick separately"), description: t("Off: changes below apply to both sticks at once. On: pick a stick and edit just that one."), value: separate, onChange: setSeparate }), separate && (SP_JSX.jsx(SelectEdit, { label: t("Stick"), value: selectedSide, options: SIDE_OPTIONS, onChange: (value) => setSelectedSide(value) })), SP_JSX.jsx(ToggleRow, { label: t("Flip stick ring"), description: t("Rotate the left stick's LED ring 180° - on some units the left ring is wired upside-down"), value: !!stickLed.sides.l.flip, onChange: setStickLedFlip$1 }), mode === "reactive" && (SP_JSX.jsxs(Collapsible, { label: t("Advanced"), children: [SP_JSX.jsx(SelectEdit, { label: t("Button"), value: flashButton, options: FLASH_BUTTON_OPTIONS, onChange: setFlashButton }), SP_JSX.jsx(PresetSwatchGrid, { colors: PRESET_COLORS, selected: stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR, onSelect: setStickLedFlashColor$1 }), SP_JSX.jsx(ColorPicker, { hex: stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR, onChange: setStickLedFlashColor$1 })] }))] }))] }))] }), qam && SP_JSX.jsx(OpenFullScreenButton, {})] }));
}

const underclocks = [
    { data: "none", label: t("None") },
    { data: "small", label: t("Small") },
    { data: "medium", label: t("Medium") },
    { data: "large", label: t("Large") },
];
function Power({ config, setConfig }) {
    const [profile, setProfile] = SP_REACT.useState(config.power.general.default_profile || "balanced");
    const p = config.power.profiles[profile] || {};
    const profiles = Object.entries(config.power.profiles || {}).map(([name, profile]) => ({
        data: name,
        label: profile.label || titleCase(name),
    }));
    const fanCurves = Object.entries(config.power.fan_curves || {}).map(([name, curve]) => ({
        data: name,
        label: curve.label || titleCase(name),
    }));
    const setProfileValue = (name, value) => {
        setConfig((current) => (current ? update(current, ["power", "profiles", profile, name], value) : current));
    };
    const setGpuValue = (name, value) => {
        setConfig((current) => {
            if (!current)
                return current;
            const next = clone(current);
            const target = next.power.profiles[profile];
            target[name] = value;
            if (name === "gpu_min" && Number(value) > Number(target.gpu_max || 0)) {
                target.gpu_max = value;
            }
            if (name === "gpu_max" && Number(value) < Number(target.gpu_min || 0)) {
                target.gpu_min = value;
            }
            return next;
        });
    };
    const resetProfile = () => {
        const defaults = config.powerDefaults?.profiles?.[profile];
        if (!defaults)
            return;
        setConfig((current) => (current ? update(current, ["power", "profiles", profile], defaults) : current));
    };
    const underclockLevel = p.cpu_underclock || "";
    const supportsUnderclockPresets = !!config.power.underclocks?.[config.cpuDeviceClass];
    // The stick LED charging dot is a battery/charging concern, so it lives
    // here rather than in the Lighting tab. Always applied to both sticks.
    const stickLed = config.stickLed?.supported ? config.stickLed : null;
    const setChargingIndicator = async (value) => {
        if (!stickLed)
            return;
        const sides = ["l", "r"];
        const previous = sides.map((s) => stickLed.sides[s].chargingIndicator);
        const patch = (sl, s, v) => ({
            ...sl,
            sides: { ...sl.sides, [s]: { ...sl.sides[s], chargingIndicator: v } },
        });
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patch(sl, s, value);
            return { ...current, stickLed: sl };
        });
        try {
            let applied = stickLed;
            for (const s of sides)
                applied = await setStickLedChargingIndicator(s, value);
            setConfig((current) => (current ? { ...current, stickLed: applied } : current));
        }
        catch (error) {
            setConfig((current) => {
                if (!current)
                    return current;
                let sl = current.stickLed;
                sides.forEach((s, i) => { sl = patch(sl, s, previous[i]); });
                return { ...current, stickLed: sl };
            });
        }
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSection, { title: t("Edit Power Profile"), children: SP_JSX.jsx(SelectEdit, { value: profile, options: profiles, onChange: setProfile }) }), SP_JSX.jsxs(DFL.PanelSection, { title: t("Profile Settings"), children: [SP_JSX.jsx(SelectEdit, { label: t("Fan Curve"), value: p.fan_curve, options: fanCurves, onChange: (v) => setProfileValue("fan_curve", v) }), supportsUnderclockPresets ? (SP_JSX.jsx(SelectEdit, { label: t("CPU Underclock"), value: underclockLevel, options: underclocks, onChange: (v) => setProfileValue("cpu_underclock", v) })) : (SP_JSX.jsx(SliderEdit, { label: t("CPU Max (%)"), value: Math.round(Number(p.cpu_max || 0) * 100), min: 35, max: 100, step: 1, onChange: (v) => setProfileValue("cpu_max", (v / 100).toFixed(2)) })), SP_JSX.jsx(SliderEdit, { label: t("GPU Min (%)"), value: Math.round(Number(p.gpu_min || 0) * 100), min: 0, max: 100, step: 1, onChange: (v) => setGpuValue("gpu_min", (v / 100).toFixed(2)) }), SP_JSX.jsx(SliderEdit, { label: t("GPU Max (%)"), value: Math.round(Number(p.gpu_max || 0) * 100), min: 35, max: 100, step: 1, onChange: (v) => setGpuValue("gpu_max", (v / 100).toFixed(2)) }), SP_JSX.jsx("div", { className: "nebel-reset-row", children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: resetProfile, children: t("Reset to Default") }) })] }), stickLed && (SP_JSX.jsx(DFL.PanelSection, { title: t("Stick Lighting"), children: SP_JSX.jsx(ToggleRow, { label: t("Charging indicator"), description: t("Spin a blue dot around the stick while charging (when the stick color follows the battery level)"), value: !!stickLed.sides?.l?.chargingIndicator, onChange: setChargingIndicator }) }))] }));
}

function AddDeviceModal({ closeModal, onAdd }) {
    const [deviceId, setDeviceId] = SP_REACT.useState("");
    const [name, setName] = SP_REACT.useState("");
    const [busy, setBusy] = SP_REACT.useState(false);
    const [found, setFound] = SP_REACT.useState(null);
    const scan = () => {
        setFound(null);
        syncDiscoveredDevices().then(setFound).catch(() => setFound([]));
    };
    SP_REACT.useEffect(scan, []);
    const inputStyle = {
        width: "100%",
        padding: "10px",
        marginBottom: "12px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "4px",
        color: "inherit",
        fontSize: "14px",
    };
    return (SP_JSX.jsx(DFL.ModalRoot, { onCancel: closeModal, children: SP_JSX.jsxs(DFL.DialogBody, { children: [SP_JSX.jsx("div", { style: { marginBottom: "6px", fontSize: "13px", opacity: 0.8 }, children: t("Devices found on this network") }), found === null && (SP_JSX.jsx("div", { style: { marginBottom: "10px", fontSize: "13px", opacity: 0.7 }, children: t("Scanning...") })), found !== null && found.length === 0 && (SP_JSX.jsx("div", { style: { marginBottom: "10px", fontSize: "13px", opacity: 0.7 }, children: t("Nothing found - check Sync is on at the other console") })), found !== null && found.map((d) => (SP_JSX.jsx(DFL.DialogButton, { style: { width: "100%", marginBottom: "8px", textAlign: "left" }, disabled: busy, onClick: () => {
                        setBusy(true);
                        void onAdd(d.deviceID, name || d.short).finally(() => {
                            setBusy(false);
                            closeModal?.();
                        });
                    }, children: `${d.short}  ${d.addresses.join(", ")}` }, d.deviceID))), SP_JSX.jsx(DFL.DialogButton, { style: { marginBottom: "14px" }, disabled: found === null, onClick: scan, children: t("Rescan") }), SP_JSX.jsx("div", { style: { marginBottom: "6px", fontSize: "13px", opacity: 0.8 }, children: t("Or enter the Device ID by hand (shown on its Sync tab)") }), SP_JSX.jsx("input", { type: "text", placeholder: "XXXXXXX-XXXXXXX-...", value: deviceId, onChange: (e) => setDeviceId(e.target.value), style: inputStyle }), SP_JSX.jsx("input", { type: "text", placeholder: t("Name (e.g. Mini V2)"), value: name, onChange: (e) => setName(e.target.value), style: inputStyle }), SP_JSX.jsx(DFL.DialogFooter, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy || deviceId.trim().length < 20, onClick: () => {
                            setBusy(true);
                            void onAdd(deviceId, name).finally(() => {
                                setBusy(false);
                                closeModal?.();
                            });
                        }, children: t("Add device") }) })] }) }));
}
function AddFolderModal({ closeModal, onAdd }) {
    const [path, setPath] = SP_REACT.useState("");
    const [label, setLabel] = SP_REACT.useState("");
    const [busy, setBusy] = SP_REACT.useState(false);
    const inputStyle = {
        width: "100%",
        padding: "10px",
        marginBottom: "12px",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "4px",
        color: "inherit",
        fontSize: "14px",
    };
    return (SP_JSX.jsx(DFL.ModalRoot, { onCancel: closeModal, children: SP_JSX.jsxs(DFL.DialogBody, { children: [SP_JSX.jsx("div", { style: { marginBottom: "6px", fontSize: "13px", opacity: 0.8 }, children: t("Folder to sync (under ~ or /run/media)") }), SP_JSX.jsx("input", { type: "text", placeholder: "~/Games/Heroic", value: path, onChange: (e) => setPath(e.target.value), style: inputStyle }), SP_JSX.jsx("input", { type: "text", placeholder: t("Label (optional)"), value: label, onChange: (e) => setLabel(e.target.value), style: inputStyle }), SP_JSX.jsx(DFL.DialogFooter, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy || path.trim().length < 2, onClick: () => {
                            setBusy(true);
                            void onAdd(path, label).finally(() => {
                                setBusy(false);
                                closeModal?.();
                            });
                        }, children: t("Add folder") }) })] }) }));
}
function Sync({ qam }) {
    const [state, setState] = SP_REACT.useState(null);
    const [error, setError] = SP_REACT.useState("");
    const [busy, setBusy] = SP_REACT.useState(false);
    const mounted = SP_REACT.useRef(true);
    SP_REACT.useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    const refresh = SP_REACT.useCallback(async () => {
        try {
            const next = await getSyncState();
            if (mounted.current) {
                setState(next);
                setError(next.error || "");
            }
        }
        catch (e) {
            if (mounted.current)
                setError(String(e));
        }
    }, []);
    SP_REACT.useEffect(() => {
        void refresh();
        const timer = window.setInterval(() => void refresh(), 5000);
        return () => window.clearInterval(timer);
    }, [refresh]);
    const run = SP_REACT.useCallback(async (action) => {
        setBusy(true);
        try {
            const next = await action();
            if (next && mounted.current)
                setState(next);
        }
        catch (e) {
            if (mounted.current)
                setError(String(e));
        }
        finally {
            if (mounted.current)
                setBusy(false);
        }
    }, []);
    if (!state)
        return SP_JSX.jsx(DFL.PanelSection, { title: t("Sync"), children: SP_JSX.jsx(DFL.Field, { label: t("Loading") }) });
    const connectedCount = state.devices.filter((d) => d.connected).length;
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Syncthing", children: [!state.installed && SP_JSX.jsx(DFL.Field, { label: t("Syncthing is not installed in this OS image") }), SP_JSX.jsx(ToggleRow, { label: t("Sync service"), description: state.serviceActive ? t("Running") : t("Stopped"), value: state.serviceEnabled && state.serviceActive, disabled: busy || !state.installed, onChange: (enabled) => void run(async () => { await setSyncServiceEnabled(enabled); await refresh(); }) }), state.myId && (SP_JSX.jsx(DFL.Field, { label: t("This device ID"), description: state.myId })), state.devices.length > 0 && (SP_JSX.jsx(DFL.Field, { label: t("Status"), description: t("{connected} of {total} device(s) connected", { connected: connectedCount, total: state.devices.length }) })), !!error && SP_JSX.jsx(DFL.Field, { label: t("Error"), description: error })] }), state.serviceActive && (state.pendingDevices.length > 0 || state.pendingFolders.length > 0) && (SP_JSX.jsxs(DFL.PanelSection, { title: t("Requests"), children: [state.pendingDevices.map((device) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Field, { label: t("Device \"{name}\" wants to pair", { name: device.name }), description: device.id.slice(0, 13) + "...", children: SP_JSX.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "80px" }, disabled: busy, onClick: () => void run(() => syncAddDevice(device.id, device.name)), children: t("Accept") }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "80px" }, disabled: busy, onClick: () => void run(() => syncDismissDevice(device.id)), children: t("Dismiss") })] }) }) }, device.id))), state.pendingFolders.map((folder) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Field, { label: t("Folder \"{name}\" was shared with you", { name: folder.label }), description: folder.id, children: SP_JSX.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "80px" }, disabled: busy, onClick: () => void run(() => syncAcceptFolder(folder.id)), children: t("Accept") }), SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "80px" }, disabled: busy, onClick: () => void run(() => syncDismissFolder(folder.id, folder.offeredBy[0] || "")), children: t("Dismiss") })] }) }) }, folder.id)))] })), !qam && state.serviceActive && (SP_JSX.jsxs(DFL.PanelSection, { title: t("Devices"), children: [state.devices.map((device) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Field, { label: `${device.name}${device.connected ? " " + t("(connected)") : ""}`, description: device.id.slice(0, 13) + "...", children: SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "90px" }, disabled: busy, onClick: () => void run(() => syncRemoveDevice(device.id)), children: t("Remove") }) }) }, device.id))), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy, onClick: () => DFL.showModal(SP_JSX.jsx(AddDeviceModal, { onAdd: async (deviceId, name) => {
                                    await run(() => syncAddDevice(deviceId, name));
                                } })), children: t("Add device") }) })] })), !qam && state.serviceActive && (SP_JSX.jsxs(DFL.PanelSection, { title: t("Folders"), children: [state.devices.length === 0 && (SP_JSX.jsx(DFL.Field, { label: t("Add a device first - folders sync only to paired devices") })), state.folders.map((folder) => {
                        const statusSuffix = folder.enabled
                            ? folder.syncState === "syncing"
                                ? " • " + t("syncing…")
                                : folder.syncState === "idle"
                                    ? " • " + t("in sync")
                                    : ""
                            : "";
                        const description = folder.path.replace("/var/home/nebel", "~") + statusSuffix;
                        return folder.custom ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Field, { label: folder.label, description: description, children: SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "90px" }, disabled: busy, onClick: () => void run(() => syncRemoveCustomFolder(folder.id)), children: t("Remove") }) }) }, folder.id)) : (SP_JSX.jsx(ToggleRow, { label: folder.label, description: description, value: folder.enabled, disabled: busy, onChange: (enabled) => void run(() => syncSetFolderEnabled(folder.id, enabled)) }, folder.id));
                    }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy, onClick: () => DFL.showModal(SP_JSX.jsx(AddFolderModal, { onAdd: async (path, label) => {
                                    await run(() => syncAddCustomFolder(path, label));
                                } })), children: t("Add custom folder") }) })] })), qam && SP_JSX.jsx(OpenFullScreenButton, {})] }));
}

const CAPTURE_CONTROLS = ["left_x", "left_y", "right_x", "right_y", "left_trigger", "right_trigger"];
function controlValue(state, name) {
    return Number(state?.controls?.[name]?.value || 0);
}
function controlRange(state, name) {
    const control = state?.controls?.[name] || {};
    const min = Number(control.min);
    const max = Number(control.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max)
        return { min: -32768, max: 32767 };
    return { min, max };
}
function normalizedValue(state, name) {
    const { min, max } = controlRange(state, name);
    const value = controlValue(state, name);
    const side = value < 0 ? Math.abs(min) : max;
    if (!side)
        return 0;
    return Math.max(-1, Math.min(1, value / side));
}
function triggerPercent(state, name) {
    const { min, max } = controlRange(state, name);
    const value = controlValue(state, name);
    if (max === min)
        return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
function makeCapture(state) {
    const capture = {};
    for (const name of CAPTURE_CONTROLS) {
        const value = controlValue(state, name);
        const range = controlRange(state, name);
        capture[name] = {
            center: value,
            min: value,
            max: value,
            range: range.max - range.min,
        };
    }
    return capture;
}
function updateCapture(capture, state) {
    const next = clone(capture || makeCapture(state));
    for (const name of Object.keys(next)) {
        const value = controlValue(state, name);
        next[name].min = Math.min(next[name].min, value);
        next[name].max = Math.max(next[name].max, value);
    }
    return next;
}

function StickPlot({ title, xName, yName, state }) {
    const x = normalizedValue(state, xName);
    const y = normalizedValue(state, yName);
    return (SP_JSX.jsxs("div", { style: { minWidth: 0 }, children: [SP_JSX.jsx("div", { style: { marginBottom: "10px", fontSize: "15px", fontWeight: 600, opacity: 0.9 }, children: title }), SP_JSX.jsxs("div", { style: {
                    position: "relative",
                    width: "132px",
                    height: "132px",
                    border: "2px solid rgba(255,255,255,0.34)",
                    background: "rgba(255,255,255,0.055)",
                    boxSizing: "border-box",
                }, children: [SP_JSX.jsx("div", { style: { position: "absolute", left: "8%", right: "8%", top: "50%", height: "1px", background: "rgba(255,255,255,0.22)" } }), SP_JSX.jsx("div", { style: { position: "absolute", top: "8%", bottom: "8%", left: "50%", width: "1px", background: "rgba(255,255,255,0.22)" } }), SP_JSX.jsx("div", { style: {
                            position: "absolute",
                            width: "18px",
                            height: "18px",
                            margin: "-9px 0 0 -9px",
                            border: "2px solid #fff",
                            borderRadius: "50%",
                            background: "#2677d8",
                            left: `${50 + x * 44}%`,
                            top: `${50 + y * 44}%`,
                        } })] })] }));
}
function TriggerBar({ title, name, state }) {
    return (SP_JSX.jsxs("div", { children: [SP_JSX.jsx("div", { style: { marginBottom: "10px", fontSize: "15px", fontWeight: 600, opacity: 0.9 }, children: title }), SP_JSX.jsx(DFL.ProgressBar, { nProgress: triggerPercent(state, name), nTransitionSec: 0 })] }));
}
const gridTwoCol = { display: "grid", gridTemplateColumns: "repeat(2, 132px)", gap: "22px", justifyContent: "center", width: "100%" };
// Modal input capture leaves gamepad focus frozen on the last-touched button.
const focusStyles = `
  .nebel-cal-footer button.gpfocus,
  .nebel-cal-footer button:focus,
  .nebel-cal-footer button:hover {
    background-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
    box-shadow: none !important;
    transform: none !important;
    -webkit-filter: none !important;
    filter: none !important;
  }
`;
function CalibrationModal({ closeModal }) {
    const [state, setState] = SP_REACT.useState(null);
    const [capture, setCapture] = SP_REACT.useState(null);
    const [phase, setPhase] = SP_REACT.useState("idle");
    const sessionToken = SP_REACT.useRef(`${Date.now()}-${Math.random()}`);
    const phaseRef = SP_REACT.useRef("idle");
    const canApply = !!state?.canApply;
    SP_REACT.useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);
    SP_REACT.useEffect(() => {
        let cancelled = false;
        let inflight = false;
        const tick = async () => {
            if (cancelled || inflight)
                return;
            inflight = true;
            try {
                const next = await getControllerState();
                if (cancelled)
                    return;
                setState(next);
                if (phaseRef.current === "recording" && next.supported) {
                    setCapture((current) => updateCapture(current || makeCapture(next), next));
                }
            }
            catch (error) {
                if (!cancelled)
                    setState({ supported: false, reason: String(error), controls: {} });
            }
            finally {
                inflight = false;
            }
        };
        tick();
        const timer = window.setInterval(tick, 50);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);
    // Intercept input for the whole modal so stick/trigger movement (during, after,
    // or just viewing calibration) doesn't leak to Steam behind it.
    SP_REACT.useEffect(() => {
        const token = sessionToken.current;
        beginCalibrationSession(token).catch(() => { });
        return () => {
            endCalibrationSession(token).catch(() => { });
        };
    }, []);
    const close = () => {
        closeModal?.();
    };
    const start = () => {
        setCapture(null);
        setPhase("recording");
    };
    const save = async () => {
        if (!capture)
            return;
        try {
            const next = await saveCalibration(capture);
            setState(next);
            setCapture(null);
            setPhase("idle");
        }
        catch (error) {
            setState((current) => ({ ...(current || {}), supported: false, reason: String(error) }));
            setPhase("idle");
        }
    };
    const reset = async () => {
        try {
            const next = await resetCalibration();
            setState(next);
        }
        catch (error) {
            setState((current) => ({ ...(current || {}), supported: false, reason: String(error) }));
        }
    };
    const instructions = !state
        ? t("Checking controller...")
        : !canApply
            ? t("This device can't save calibration, but you can check stick and trigger response here.")
            : phase === "recording"
                ? t("Move both sticks in full circles and fully press both triggers, then Save.")
                : t("Press Start, then move sticks and triggers through full range.");
    return (SP_JSX.jsxs(DFL.ModalRoot, { onCancel: close, children: [SP_JSX.jsxs(DFL.DialogBody, { children: [SP_JSX.jsxs("div", { style: { ...gridTwoCol, alignItems: "start", marginBottom: "22px" }, children: [SP_JSX.jsx(StickPlot, { title: t("Left Stick"), xName: "left_x", yName: "left_y", state: state }), SP_JSX.jsx(StickPlot, { title: t("Right Stick"), xName: "right_x", yName: "right_y", state: state })] }), SP_JSX.jsxs("div", { style: { ...gridTwoCol, marginBottom: "16px" }, children: [SP_JSX.jsx(TriggerBar, { title: "LT", name: "left_trigger", state: state }), SP_JSX.jsx(TriggerBar, { title: "RT", name: "right_trigger", state: state })] }), SP_JSX.jsx("div", { style: { fontSize: "13px", lineHeight: "18px", opacity: 0.72, textAlign: "center" }, children: instructions })] }), SP_JSX.jsxs(DFL.DialogFooter, { children: [SP_JSX.jsx("style", { children: focusStyles }), !canApply ? (SP_JSX.jsx("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: t("Close") }) })) : phase === "recording" ? (SP_JSX.jsxs("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: save, disabled: !capture, children: t("Save Calibration") }), SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: t("Close") })] })) : (SP_JSX.jsxs("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: start, children: t("Start Calibration") }), SP_JSX.jsx(DFL.DialogButton, { onClick: reset, children: t("Reset to Defaults") }), SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: t("Close") })] }))] })] }));
}
function openCalibration() {
    DFL.showModal(SP_JSX.jsx(CalibrationModal, {}));
}

function ControllerExtras({ config, setConfig, showEmulation = true }) {
    const setControllerType$1 = async (value) => {
        const previous = config.controllerType || "deck-uhid";
        setConfig((current) => (current ? { ...current, controllerType: value } : current));
        try {
            const applied = await setControllerType(value);
            setConfig((current) => (current ? { ...current, controllerType: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, controllerType: previous } : current));
        }
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("Controller"), children: [showEmulation && (SP_JSX.jsx(SelectEdit, { label: t("Emulation"), value: config.controllerType || "deck-uhid", options: config.controllerTypes || [], onChange: setControllerType$1 })), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: openCalibration, children: t("Launch Calibration") })] }));
}
function SshRow({ config, setConfig }) {
    const setSshEnabled$1 = async (enabled) => {
        if (enabled === !!config.sshEnabled) {
            return;
        }
        setConfig((current) => (current ? { ...current, sshEnabled: enabled } : current));
        try {
            const applied = await setSshEnabled(enabled);
            setConfig((current) => (current ? { ...current, sshEnabled: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, sshEnabled: !enabled } : current));
        }
    };
    return SP_JSX.jsx(ToggleRow, { label: t("Enable SSH"), value: !!config.sshEnabled, onChange: setSshEnabled$1 });
}
function SharedStorageRow({ config, setConfig }) {
    const setSharedStorageEnabled$1 = async (enabled) => {
        if (enabled === !!config.sharedStorageEnabled) {
            return;
        }
        setConfig((current) => (current ? { ...current, sharedStorageEnabled: enabled } : current));
        try {
            const applied = await setSharedStorageEnabled(enabled);
            setConfig((current) => (current ? { ...current, sharedStorageEnabled: applied } : current));
        }
        catch (error) {
            setConfig((current) => (current ? { ...current, sharedStorageEnabled: !enabled } : current));
        }
    };
    return (SP_JSX.jsx(ToggleRow, { label: t("Mount shared storage"), description: t("Mount NEBEL_SHARED partition at ~/Shared"), value: !!config.sharedStorageEnabled, onChange: setSharedStorageEnabled$1 }));
}
function SystemExtras({ config, setConfig, showStorage = true }) {
    return (SP_JSX.jsxs(DFL.PanelSection, { title: t("System"), children: [SP_JSX.jsx(SshRow, { config: config, setConfig: setConfig }), showStorage && SP_JSX.jsx(SharedStorageRow, { config: config, setConfig: setConfig })] }));
}
function System({ config, setConfig, qam }) {
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ControllerExtras, { config: config, setConfig: setConfig, showEmulation: !qam }), SP_JSX.jsx(SystemExtras, { config: config, setConfig: setConfig, showStorage: !qam }), qam && SP_JSX.jsx(OpenFullScreenButton, {})] }));
}

function usePluginConfig() {
    const [config, setConfig] = SP_REACT.useState(null);
    const [message, setMessage] = SP_REACT.useState(t("Loading"));
    const savedPowerSnapshot = SP_REACT.useRef("");
    const savedTweaksSnapshot = SP_REACT.useRef("");
    const installedGamesRequested = SP_REACT.useRef(false);
    const load = SP_REACT.useCallback(async () => {
        try {
            const next = await getConfig();
            next.game = currentGame();
            next.selectedGame = next.game || null;
            savedPowerSnapshot.current = JSON.stringify(next.power);
            savedTweaksSnapshot.current = JSON.stringify(next.tweaks);
            setConfig((current) => ({ ...next, installedGames: current?.installedGames || next.installedGames }));
        }
        catch (error) {
            setMessage(String(error));
        }
    }, []);
    SP_REACT.useEffect(() => {
        load();
    }, [load]);
    SP_REACT.useEffect(() => {
        if (!config || installedGamesRequested.current)
            return;
        installedGamesRequested.current = true;
        let cancelled = false;
        getInstalledGames()
            .then((installedGames) => {
            if (cancelled)
                return;
            setConfig((current) => (current ? { ...current, installedGames } : current));
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [!!config]);
    SP_REACT.useEffect(() => {
        if (!config)
            return;
        let cancelled = false;
        const refreshRuntime = async () => {
            try {
                const runtimeGame = currentGame();
                if (cancelled)
                    return;
                setConfig((current) => {
                    if (!current)
                        return current;
                    const currentApp = current.game?.appid || "";
                    const nextApp = runtimeGame?.appid || "";
                    const currentName = current.game?.name || "";
                    const nextName = runtimeGame?.name || "";
                    if (currentApp === nextApp && currentName === nextName)
                        return current;
                    return { ...current, game: runtimeGame };
                });
            }
            catch (error) {
            }
        };
        const timer = window.setInterval(refreshRuntime, 2000);
        refreshRuntime();
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [!!config]);
    useDebouncedSave({ config, field: "power", snapshot: savedPowerSnapshot, save: savePowerConfig, setConfig, onError: load });
    useDebouncedSave({ config, field: "tweaks", snapshot: savedTweaksSnapshot, save: saveTweaks, setConfig, onError: load });
    return { config, setConfig, message };
}
// One tab model feeds both surfaces: the QAM Tabs bar and the fullscreen
// page sidebar. `qam` switches each tab to its simplified subset (full
// controls live on the fullscreen page).
function buildTabs(config, setConfig, qam) {
    return [
        { id: "Home", icon: tabIcons.Home, label: t("TabHome"), content: SP_JSX.jsx(Home, { config: config, setConfig: setConfig, qam: qam }) },
        { id: "Games", icon: tabIcons.Games, label: t("TabGames"), content: SP_JSX.jsx(Games, { config: config, setConfig: setConfig, qam: qam }) },
        { id: "Display", icon: tabIcons.Display, label: t("TabDisplay"), content: SP_JSX.jsx(Display, { qam: qam }) },
        { id: "Power", icon: tabIcons.Power, label: t("TabPower"), content: SP_JSX.jsx(Power, { config: config, setConfig: setConfig, qam: qam }) },
        { id: "Lighting", icon: tabIcons.Lighting, label: t("TabLighting"), content: SP_JSX.jsx(Lighting, { config: config, setConfig: setConfig, qam: qam }) },
        { id: "Sync", icon: tabIcons.Sync, label: t("TabSync"), content: SP_JSX.jsx(Sync, { qam: qam }) },
        { id: "System", icon: tabIcons.System, label: t("TabSystem"), content: SP_JSX.jsx(System, { config: config, setConfig: setConfig, qam: qam }) },
    ];
}
// Shared across both surfaces: opening the fullscreen page from a QAM tab
// lands on that same tab (and back), instead of always resetting to Home.
let lastTab = "Home";
// Fullscreen variant registered as the /nebel-control route: Steam-settings-
// style layout with a vertical tab list on the left and content on the right.
// Steam's global back (B button) pops the route, so no back affordance here.
function FullPage() {
    const { config, setConfig, message } = usePluginConfig();
    const [tab, setTabState] = SP_REACT.useState(lastTab);
    const setTab = (id) => { lastTab = id; setTabState(id); };
    const pageShell = (content) => (SP_JSX.jsxs("div", { className: "nebel-control-page nebel-control-root", children: [SP_JSX.jsxs("style", { children: [styles, nativeSectionTitleCss(".nebel-control-page")] }), content] }));
    if (!config) {
        return pageShell(SP_JSX.jsx("div", { className: "nc-page-content", children: SP_JSX.jsx("div", { className: "nc-page-content-inner", children: SP_JSX.jsx(DFL.PanelSection, { title: "Nebel Control", children: SP_JSX.jsx(DFL.Field, { label: message }) }) }) }));
    }
    const tabs = buildTabs(config, setConfig, false);
    const active = tabs.find((candidate) => candidate.id === tab) || tabs[0];
    return pageShell(SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("div", { className: "nc-page-sidebar", children: tabs.map((candidate) => (SP_JSX.jsxs(DFL.Focusable, { className: `nc-page-tab${candidate.id === active.id ? " nc-active" : ""}`, onActivate: () => setTab(candidate.id), onClick: () => setTab(candidate.id), children: [candidate.icon, SP_JSX.jsx("span", { children: candidate.label })] }, candidate.id))) }), SP_JSX.jsx("div", { className: "nc-page-content", children: SP_JSX.jsx("div", { className: "nc-page-content-inner", children: active.content }) })] }));
}

// Config source for the sections injected into Steam's native settings pages.
// This mirrors Content.tsx's usePluginConfig (same backend calls, same
// debounced whole-object saves for `power` and `tweaks`), but is standalone:
// each injected page holds its own copy, the python backend stays the single
// source of truth. The running-game polling of the QAM/fullpage variant is
// intentionally left out - the injected sections never target "whatever is
// running", only fixed appids or device-wide settings.
function useInjectedConfig() {
    const [config, setConfig] = SP_REACT.useState(null);
    const [message, setMessage] = SP_REACT.useState(t("Loading"));
    const savedPowerSnapshot = SP_REACT.useRef("");
    const savedTweaksSnapshot = SP_REACT.useRef("");
    const installedGamesRequested = SP_REACT.useRef(false);
    const load = SP_REACT.useCallback(async () => {
        try {
            const next = await getConfig();
            savedPowerSnapshot.current = JSON.stringify(next.power);
            savedTweaksSnapshot.current = JSON.stringify(next.tweaks);
            setConfig((current) => ({ ...next, installedGames: current?.installedGames || next.installedGames }));
        }
        catch (error) {
            setMessage(String(error));
        }
    }, []);
    SP_REACT.useEffect(() => {
        load();
    }, [load]);
    SP_REACT.useEffect(() => {
        if (!config || installedGamesRequested.current)
            return;
        installedGamesRequested.current = true;
        let cancelled = false;
        getInstalledGames()
            .then((installedGames) => {
            if (cancelled)
                return;
            setConfig((current) => (current ? { ...current, installedGames } : current));
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [!!config]);
    useDebouncedSave({ config, field: "power", snapshot: savedPowerSnapshot, save: savePowerConfig, setConfig, onError: load });
    useDebouncedSave({ config, field: "tweaks", snapshot: savedTweaksSnapshot, save: saveTweaks, setConfig, onError: load });
    return { config, setConfig, message };
}
// The injected sections live inside Steam's own settings tree, outside
// nebel-control-root, so the plugin stylesheet has to come along - otherwise
// the shared widgets (slider rows, swatch grid, notes) render unstyled. The
// spacing overrides align the QAM-styled PanelSection with the host page's
// own full-width settings groups.
function NativeStyles() {
    // Steam's Properties pages give their own DialogBody `flex: 1` (basis 0),
    // which stretches it across the whole column and pushes our appended
    // section to the bottom. Neutralize it - but keep basis auto: with basis 0
    // and no growth the body collapses to height 0 and its overflow clipping
    // hides Steam's own controls entirely.
    // The page also styles its own checkbox with a local class our borrowed
    // DialogCheckbox doesn't get - replicate the box so both look identical.
    const fix = ".DialogContent_InnerWidth:has(> .nebel-native) > .DialogBody{flex:0 0 auto !important;}" +
        ".nebel-native .DialogCheckbox_Container{background:rgba(59,63,72,0.5);border-radius:3px;padding:9px;}";
    return SP_JSX.jsxs("style", { children: [styles, nativeSectionSpacingCss(".nebel-native"), fix] });
}

// The sections duplicated into Steam's own settings pages. Each one renders
// the corresponding plugin tab as-is (same components, same python backend
// calls - the injected UI is a pure frontend addition) inside the native
// page's content panel, without an extra spoiler around it: the tabs already
// group their controls into titled PanelSections that read like the host
// page's own groups.
function MissingConfig({ message }) {
    return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.Field, { label: message }) }));
}
// Settings -> Controller: controller-type emulation + calibration first
// (they concern the gamepad itself), then the full Lighting tab.
function ControllerLightingSection() {
    const { config, setConfig, message } = useInjectedConfig();
    if (!config)
        return SP_JSX.jsx(MissingConfig, { message: message });
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(ControllerExtras, { config: config, setConfig: setConfig }), SP_JSX.jsx(Lighting, { config: config, setConfig: setConfig })] }));
}
// Settings -> Power: fan curve / CPU-GPU limits (Power tab).
function PowerLimitsSection() {
    const { config, setConfig, message } = useInjectedConfig();
    if (!config)
        return SP_JSX.jsx(MissingConfig, { message: message });
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(Power, { config: config, setConfig: setConfig })] }));
}
// Settings -> Display: external display (Display tab).
function ExternalDisplaySection() {
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(Display, {})] }));
}
// Game page -> Properties (gear): per-game tweaks for the app whose
// Properties page is open (Games tab locked to that appid - works for Steam
// games and non-Steam shortcuts alike, tweaks are keyed by appid). The
// injected variant hides the pickers Steam's own Compatibility page already
// provides and shows x86_64-only knobs only when they apply.
function GameTweaksSection({ appid }) {
    const { config, setConfig, message } = useInjectedConfig();
    if (!config)
        return SP_JSX.jsx(MissingConfig, { message: message });
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(Games, { config: config, setConfig: setConfig, lockedAppid: appid, injected: true })] }));
}
// Settings -> Cloud: Nebel sync (Syncthing pairing, folders) - the Sync tab
// lives next to Steam Cloud since both are "sync my stuff" settings.
function CloudSyncSection() {
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(Sync, {})] }));
}
// Settings -> System: entry point to the fullscreen control center, plus
// shared-storage mounting. Neutrally labeled ("Control Center", not "Nebel
// Control") so the settings page keeps a stock look - the brand only shows
// on the fullscreen page itself, where it belongs.
function ControlCenterSection() {
    const { config, setConfig } = useInjectedConfig();
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(DFL.PanelSection, { title: t("Control Center"), children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => DFL.Navigation.Navigate("/nebel-control"), children: t("Open Control Center") }) }) }), config && (SP_JSX.jsx(DFL.PanelSection, { title: t("Storage"), children: SP_JSX.jsx(SharedStorageRow, { config: config, setConfig: setConfig }) }))] }));
}
// Settings -> Library: the working "Add non-Steam game" picker (Steam's own
// Browse dialog is broken in the ARM64 client).
function LibraryAddGameSection() {
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(AddGameSection, {})] }));
}
// Settings -> Internet: SSH access toggle.
function SshSection() {
    const { config, setConfig, message } = useInjectedConfig();
    if (!config)
        return SP_JSX.jsx(MissingConfig, { message: message });
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(DFL.PanelSection, { title: t("SSH"), children: SP_JSX.jsx(SshRow, { config: config, setConfig: setConfig }) })] }));
}
// Settings -> In Game: gamescope FPS overlay for all games (next to Steam's
// own FPS counter options).
function InGameOverlaySection() {
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(DFL.PanelSection, { title: t("Overlay"), children: SP_JSX.jsx(OverlayToggleRow, {}) })] }));
}
// Settings -> Notifications: stick-LED flash on notifications + flash color.
function NotificationFlashSection() {
    const { config, setConfig, message } = useInjectedConfig();
    if (!config)
        return SP_JSX.jsx(MissingConfig, { message: message });
    if (!config.stickLed?.supported)
        return null;
    return (SP_JSX.jsxs("div", { className: "nebel-native", children: [SP_JSX.jsx(NativeStyles, {}), SP_JSX.jsx(DFL.PanelSection, { title: t("Stick Lighting"), children: SP_JSX.jsx(NotifyFlashRows, { config: config, setConfig: setConfig }) })] }));
}

// Duplicates Nebel Control's management UI into Steam's own settings pages
// (Steam Settings -> Controller/Power/Display and game Properties), rendered
// with Steam's native components so it reads as part of the host UI. The
// Decky QAM/fullpage plugin stays the parallel full control center; both hit
// the same python backend.
//
// Technique: Steam builds both the Settings root and the game Properties
// page from a `pages` array ({title, route, link, content, icon, visible})
// handed to a shared paged-navigation component. We hook the route via
// routerHook.addPatch, wrap the route child component's type, and from there
// cascade: every function component in the returned element tree gets its
// type wrapped once (WeakSet-guarded, so identity is stable and nothing
// remounts), so when it renders we scan its output too. Once the element
// carrying `props.pages` shows up, the matching pages' `content` element is
// replaced with ours appended. Everything stays inside Steam's React tree,
// so navigation/focus/SteamInput behave natively.
//
// Graceful degradation: every step is try/caught and every injected block is
// behind an ErrorBoundary, so if a Steam update moves or renames the anchors
// (no pages host, unknown routes), only the duplicate disappears - the
// plugin itself never breaks.
const LOG$1 = "[Nebel Control] native-settings:";
// Marks a component type we already wrapped - the router re-runs route
// patches on every render, and a fresh wrapper each time would remount the
// whole page subtree (focus/state loss), so wrapping must be idempotent.
const NEO_WRAPPED = "__nebelNativeTypeWrapped";
const SETTINGS_SECTIONS = [
    {
        name: "controller-lighting",
        match: (page) => String(page.route || "").startsWith("/settings/controller"),
        render: () => SP_JSX.jsx(ControllerLightingSection, {}),
    },
    {
        name: "power-limits",
        match: (page) => page.route === "/settings/power",
        render: () => SP_JSX.jsx(PowerLimitsSection, {}),
    },
    {
        name: "external-display",
        match: (page) => page.route === "/settings/display",
        render: () => SP_JSX.jsx(ExternalDisplaySection, {}),
    },
    {
        name: "cloud-sync",
        match: (page) => page.route === "/settings/cloud",
        render: () => SP_JSX.jsx(CloudSyncSection, {}),
    },
    {
        name: "library-add-game",
        match: (page) => page.route === "/settings/library",
        render: () => SP_JSX.jsx(LibraryAddGameSection, {}),
    },
    {
        name: "internet-ssh",
        match: (page) => page.route === "/settings/internet",
        render: () => SP_JSX.jsx(SshSection, {}),
    },
    {
        name: "ingame-overlay",
        match: (page) => page.route === "/settings/ingame",
        render: () => SP_JSX.jsx(InGameOverlaySection, {}),
    },
    {
        name: "notification-flash",
        match: (page) => page.route === "/settings/notifications",
        render: () => SP_JSX.jsx(NotificationFlashSection, {}),
    },
    {
        name: "control-center-entry",
        match: (page) => page.route === "/settings/system",
        render: () => SP_JSX.jsx(ControlCenterSection, {}),
    },
];
const PROPERTIES_SECTIONS = [
    {
        name: "game-tweaks",
        // Compatibility is the natural home for per-game tweaks (Steam games and
        // non-Steam shortcuts both get a Compatibility page).
        match: (page) => String(page.route || "").endsWith("/properties/compatibility"),
        render: (page) => {
            const appid = String(page.link || "").match(/\/app\/(\d+)\//)?.[1] || "";
            return appid ? SP_JSX.jsx(GameTweaksSection, { appid: appid }) : null;
        },
    },
];
const KINDS = {
    settings: {
        name: "settings",
        sections: SETTINGS_SECTIONS,
        hostMatch: (page) => String(page?.route || "").startsWith("/settings"),
    },
    properties: {
        name: "properties",
        sections: PROPERTIES_SECTIONS,
        hostMatch: (page) => /\/app\/(\d+|\:appid)\/properties/.test(String(page?.route || "") + " " + String(page?.link || "")),
    },
};
// Every render produces fresh element objects carrying the ORIGINAL
// component types, so "wrap once and skip" breaks the cascade on the very
// next render. Cache wrappers per original type (stable identity - no
// remounts) and substitute on every element we scan.
const wrappedTypeCache = new WeakMap();
const hostFound = new Set();
const hostMissLogged = new Set();
function wrapPagesInHost(host, kind) {
    const pages = host.props.pages;
    const touched = [];
    const nextPages = pages.map((page) => {
        if (page?.__nebelWrapped)
            return page;
        const section = kind.sections.find((candidate) => {
            try {
                return candidate.match(page);
            }
            catch (error) {
                return false;
            }
        });
        if (!section)
            return page;
        let node = null;
        try {
            node = section.render(page);
        }
        catch (error) {
            console.warn(LOG$1, kind.name, section.name, "render factory failed", error);
        }
        if (!node)
            return page;
        touched.push(section.name);
        return {
            ...page,
            __nebelWrapped: true,
            content: (SP_JSX.jsxs(SP_JSX.Fragment, { children: [page.content, SP_JSX.jsx(DFL.ErrorBoundary, { children: node })] })),
        };
    });
    if (!touched.length)
        return;
    host.props.pages = nextPages;
    if (!hostFound.has(kind.name)) {
        hostFound.add(kind.name);
        console.log(LOG$1, kind.name, "injected sections:", touched.join(", "));
    }
}
function isPagesHost(el, kind) {
    const pages = el?.props?.pages;
    return (Array.isArray(pages) &&
        pages.some((page) => {
            if (typeof page?.route !== "string")
                return false;
            try {
                return kind.hostMatch(page);
            }
            catch (error) {
                return false;
            }
        }));
}
// Wraps a component type (plain function, memo/observer object, or
// forwardRef object) so that when it renders, its output tree is scanned
// too. Returns the cached wrapper (stable identity), or the input unchanged
// when there is nothing wrappable.
function wrapComponentType(type, kind) {
    if (!type || typeof type === "string")
        return type;
    if (typeof type === "function") {
        if (type.prototype?.isReactComponent || type[NEO_WRAPPED])
            return type;
        const cached = wrappedTypeCache.get(type);
        if (cached)
            return cached;
        const wrapped = (componentProps) => {
            const ret = type(componentProps);
            try {
                scanTree(ret, kind, 0);
            }
            catch (error) {
                console.warn(LOG$1, kind.name, "scan failed in", type.name || "component", error);
            }
            return ret;
        };
        Object.assign(wrapped, type);
        wrapped.toString = () => type.toString();
        wrapped[NEO_WRAPPED] = true;
        wrappedTypeCache.set(type, wrapped);
        return wrapped;
    }
    if (typeof type === "object") {
        // mobx observer()/React.memo(): {$$typeof, type: fn}; forwardRef:
        // {$$typeof, render: fn}. Spread keeps $$typeof and compare/render props.
        const inner = typeof type.type === "function" ? "type" : typeof type.render === "function" ? "render" : null;
        if (!inner || type[inner][NEO_WRAPPED])
            return type;
        const cached = wrappedTypeCache.get(type);
        if (cached)
            return cached;
        const wrappedInner = wrapComponentType(type[inner], kind);
        if (wrappedInner === type[inner])
            return type;
        const wrapped = { ...type, [inner]: wrappedInner };
        wrappedTypeCache.set(type, wrapped);
        return wrapped;
    }
    return type;
}
// Walks a returned (still unrendered) element fragment. Pages hosts get their
// matching page contents wrapped immediately; component children get their
// type wrapped once so the scan cascades into their render output.
function scanTree(node, kind, depth) {
    if (!node || typeof node !== "object" || depth > 12)
        return;
    if (Array.isArray(node)) {
        for (const child of node)
            scanTree(child, kind, depth);
        return;
    }
    const props = node.props;
    if (!props || typeof props !== "object")
        return;
    if (isPagesHost(node, kind)) {
        try {
            wrapPagesInHost(node, kind);
        }
        catch (error) {
            console.warn(LOG$1, kind.name, "wrapping pages failed", error);
        }
    }
    else {
        try {
            const nextType = wrapComponentType(node.type, kind);
            if (nextType !== node.type)
                node.type = nextType;
        }
        catch (error) {
            console.warn(LOG$1, kind.name, "type wrap failed", error);
        }
    }
    scanTree(props.children, kind, depth + 1);
}
function makeRoutePatch(kind) {
    return (route) => {
        try {
            const child = route?.children;
            const first = Array.isArray(child) ? child[0] : child;
            const originalType = first?.type;
            if (originalType?.[NEO_WRAPPED])
                return route;
            const patchedType = wrapComponentType(originalType, kind);
            if (patchedType === originalType) {
                if (!hostMissLogged.has(`${kind.name}-type`)) {
                    hostMissLogged.add(`${kind.name}-type`);
                    console.log(LOG$1, kind.name, "route child has no wrappable component type:", typeof originalType);
                }
                return route;
            }
            const patchedChild = { ...first, type: patchedType };
            route.children = Array.isArray(child) ? [patchedChild, ...child.slice(1)] : patchedChild;
            console.log(LOG$1, kind.name, "route component wrapped");
        }
        catch (error) {
            console.warn(LOG$1, kind.name, "route patch failed", error);
        }
        return route;
    };
}
// Installs both injections; returns the uninstaller for onDismount. Never
// throws - a half-broken Steam update must cost us the duplicates, not the
// plugin.
function installNativeSettingsSections() {
    console.log(LOG$1, "installing");
    let settingsPatch = null;
    let propertiesPatch = null;
    try {
        settingsPatch = routerHook.addPatch("/settings", makeRoutePatch(KINDS.settings));
    }
    catch (error) {
        console.warn(LOG$1, "failed to register /settings patch", error);
    }
    try {
        propertiesPatch = routerHook.addPatch("/app/:appid/properties", makeRoutePatch(KINDS.properties));
    }
    catch (error) {
        console.warn(LOG$1, "failed to register /app/:appid/properties patch", error);
    }
    return () => {
        try {
            if (settingsPatch)
                routerHook.removePatch("/settings", settingsPatch);
            if (propertiesPatch)
                routerHook.removePatch("/app/:appid/properties", propertiesPatch);
        }
        catch (error) {
        }
    };
}

// Nebel's quick levers, spliced into Steam's own Quick Access tabs so they
// read as stock UI (no branding, no separate panel):
// - Quick Settings (tab 4): stick lighting on/off + brightness go INTO the
//   native "Other" toggles section, next to Wi-Fi/Bluetooth/Night mode; the
//   external-display pick follows as its own small section (only while an
//   external panel is connected).
// - Performance (tab 5): our power-profile select REPLACES Steam's native
//   "Performance Profile" dropdown. That dropdown is dead on this hardware:
//   it writes the steamos_platform_performance_profile client setting, which
//   on a real Deck is consumed by the platform perf layer - here Perf state
//   is empty, sysfs never changes, and the value isn't even persisted, so
//   the control only pretended to work. Our select drives the nebel power
//   daemon instead, keeping an actual working profile switch in its place.
// The plugin returns no `content` to Decky; these splices are its QAM
// presence, and the fullscreen control center is reached from Settings ->
// System.
// Compact external-display control: only rendered while an external panel is
// actually connected; mirrors Display.tsx's primary-pick semantics (single
// output per gamescope session, portrait panels pre-select a rotation).
function QuickDisplayRows() {
    const [state, setState] = SP_REACT.useState(null);
    SP_REACT.useEffect(() => {
        getDisplayState().then(setState).catch(() => { });
    }, []);
    const externals = state?.connectors.filter((c) => !c.internal && c.connected) || [];
    if (!state || !externals.length)
        return null;
    // Own section (renders only while an external panel is connected): the
    // select + restart button don't belong inside the native toggles group.
    return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(QuickDisplayRowsInner, { state: state, setState: setState, externals: externals }) }));
}
function QuickDisplayRowsInner({ state, setState, externals }) {
    const [busy, setBusy] = SP_REACT.useState(false);
    const INTERNAL = "__internal__";
    const selectPrimary = (connector) => {
        setBusy(true);
        const finish = (promise) => promise.then(setState).catch(() => { }).finally(() => setBusy(false));
        if (connector === INTERNAL) {
            finish(setDisplayConfig(false, state.connector, state.width, state.height, state.orientation));
            return;
        }
        const target = externals.find((c) => c.connector === connector);
        const previous = state.remembered[connector];
        const [w, h] = (target?.modes[0] || "1920x1080").split("x").map(Number);
        const width = previous?.width || w || 1920;
        const height = previous?.height || h || 1080;
        // Portrait panel + no rotation is rejected by the backend - pre-select one.
        const orientation = previous?.orientation || (width < height ? "left" : "normal");
        finish(setDisplayConfig(true, connector, width, height, orientation));
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: t("Primary Display"), value: state.useExternal ? state.connector : INTERNAL, options: [
                    { data: INTERNAL, label: t("Internal Screen") },
                    ...externals.map((c) => ({ data: c.connector, label: c.name ? `${c.name} (${c.connector})` : c.connector })),
                ], onChange: selectPrimary, disabled: busy }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: () => {
                    setBusy(true);
                    // A successful restart tears down this session (and Decky with it);
                    // only a failure comes back here, and the button must re-enable then.
                    restartGamescopeSession().catch(() => { }).finally(() => setBusy(false));
                }, children: t("Apply & Restart Game Mode") })] }));
}
// Stick lighting toggle + brightness, rendered WITHOUT a section wrapper:
// they are appended into the native "Other" toggles section so they sit in
// the same visual group as Wi-Fi/Bluetooth/Night mode.
function QuickLightingRows() {
    const { config, setConfig } = useInjectedConfig();
    const stickLed = config?.stickLed?.supported ? config.stickLed : null;
    if (!config || !stickLed)
        return null;
    // Optimistic set + immediate backend apply, rolling back on failure (same
    // pattern as the Lighting tab).
    const applyLighting = (patch, call) => {
        const previous = config.stickLed;
        setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, ...patch } } : current));
        call()
            .then((applied) => setConfig((current) => (current ? { ...current, stickLed: applied } : current)))
            .catch(() => setConfig((current) => (current ? { ...current, stickLed: previous } : current)));
    };
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ToggleRow, { label: t("Stick Lighting"), value: stickLed.enabled, onChange: (value) => applyLighting({ enabled: value }, () => setStickLedEnabled(value)) }), stickLed.enabled && !stickLed.screenLink && (SP_JSX.jsx(SliderEdit, { label: t("Max Brightness"), value: Math.round((stickLed.maxBrightness ?? 1) * 100), min: 0, max: 100, step: 5, onChange: (value) => applyLighting({ maxBrightness: value / 100 }, () => setStickLedMaxBrightness(value / 100)) }))] }));
}
// Power-profile pick only (no editing - that stays in Settings -> Power).
// Takes the place of Steam's dead native profile dropdown in the Perf tab.
function QuickPowerProfileRow() {
    const { config, setConfig } = useInjectedConfig();
    if (!config)
        return null;
    const profile = config.power?.general?.default_profile || "balanced";
    const profiles = Object.entries(config.power?.profiles || {}).map(([name, p]) => ({
        data: name,
        label: p.label || titleCase(name),
    }));
    if (!profiles.length)
        return null;
    return (SP_JSX.jsx(SelectEdit, { label: t("Power Profile"), value: profile, options: profiles, onChange: (value) => setConfig((current) => (current ? update(current, ["power", "general", "default_profile"], value) : current)) }));
}
const LOG = "[Nebel Control] qam-quick-panel:";
const QUICK_ACCESS_TAB_SETTINGS = 4;
const QUICK_ACCESS_TAB_PERFORMANCE = 5;
const WRAPPED = "__nebelQamQuickPanel";
const WRAPPED_TYPE = "__nebelQamTypeWrapped";
// Steam's native Perf-tab "Performance Profile" dropdown component (the
// dead-on-this-hardware one). Found once at install time by its unique
// localization token; null means "couldn't identify" (fallback path).
let nativePerfProfileType = null;
// Wraps a function component type so its render output can be visited (and
// mutated) before React commits it. Cached per original type - a fresh
// wrapper per wrap would remount the subtree every time Steam rebuilds the
// tabs array. Idempotent: already-wrapped types pass through.
const wrapTypeCache = new WeakMap();
function wrapRenderType(type, visit) {
    if (!type || typeof type !== "function" || type.prototype?.isReactComponent || type[WRAPPED_TYPE])
        return type;
    const cached = wrapTypeCache.get(type);
    if (cached)
        return cached;
    const wrapped = (props) => {
        const ret = type(props);
        let extra = null;
        try {
            extra = visit(ret);
        }
        catch (error) {
            console.warn(LOG, "visit failed", error);
        }
        return extra ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [ret, extra] })) : ret;
    };
    Object.assign(wrapped, type);
    wrapped.toString = () => type.toString();
    wrapped[WRAPPED_TYPE] = true;
    wrapTypeCache.set(type, wrapped);
    return wrapped;
}
// The Quick Settings panel (De) returns its sections as direct children of a
// Fragment. Find the native "Other" section by its localized title and
// append the lighting rows into it; if Steam ever moves/renames it, fall
// back to a small section of our own so the controls don't vanish.
function visitQuickSettings(ret) {
    let merged = false;
    try {
        // Steam hands the section the raw localization TOKEN as its title (not
        // the localized string) - match both so locale never breaks the merge.
        const otherToken = "#QuickAccess_Tab_Settings_Section_Other_Title";
        const otherTitle = window.LocalizationManager?.LocalizeString?.(otherToken);
        const kids = ret?.props?.children;
        const arr = Array.isArray(kids) ? kids : [kids];
        const section = arr.find((el) => el?.props?.title && (el.props.title === otherToken || el.props.title === otherTitle));
        if (section) {
            const sc = section.props.children;
            section.props.children = [
                ...(Array.isArray(sc) ? sc : [sc]),
                SP_JSX.jsx(DFL.ErrorBoundary, { children: SP_JSX.jsx(QuickLightingRows, {}) }, "nebel-lighting"),
            ];
            merged = true;
            console.log(LOG, "lighting rows merged into native Other section");
        }
    }
    catch (error) {
        console.warn(LOG, "quick settings merge failed", error);
    }
    if (!merged)
        console.log(LOG, "native Other section not found, using own panel");
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [!merged && (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ErrorBoundary, { children: SP_JSX.jsx(QuickLightingRows, {}) }) })), SP_JSX.jsx(DFL.ErrorBoundary, { children: SP_JSX.jsx(QuickDisplayRows, {}) })] }));
}
// The Perf panel (F) only chooses between sub-components (VR / non-VR /
// on-frame), so the visitor cascades one level: wrap every function
// component in its output, and at the level whose returned tree contains
// the native profile dropdown, swap that dropdown for our power-profile row.
// The dropdown sits as `<Row><SG/></Row>` inside a children array (Steam's
// PanelSectionRow), so both the element itself and its one-child row wrapper
// are replaced; the single-child fallback swaps the dropdown in place with a
// bare dropdown (already inside a row).
function QuickPowerProfileDropdown() {
    const { config, setConfig } = useInjectedConfig();
    if (!config)
        return null;
    const profile = config.power?.general?.default_profile || "balanced";
    const profiles = Object.entries(config.power?.profiles || {}).map(([name, p]) => ({
        data: name,
        label: p.label || titleCase(name),
    }));
    if (!profiles.length)
        return null;
    return (SP_JSX.jsx(DFL.DropdownItemInternal, { label: t("Power Profile"), childrenContainerWidth: "max", selectedOption: profile, rgOptions: profiles, onChange: (option) => setConfig((current) => (current ? update(current, ["power", "general", "default_profile"], option.data) : current)) }));
}
// Matches the native perf-profile dropdown element whether its type is the
// raw Steam component or our own wrapped copy of it. cascadeWrapTypes swaps
// element types for wrapped versions, so a strict === against
// nativePerfProfileType can never fire once the cascade has passed; the
// wrapper forwards toString to the original source, so the token survives.
const isNativePerfProfileEl = (el) => {
    const t = el?.type;
    if (!t || !nativePerfProfileType)
        return false;
    if (t === nativePerfProfileType)
        return true;
    try {
        return typeof t.toString === "function" && t.toString().includes("PlatformPerformanceProfile_Label");
    }
    catch {
        return false;
    }
};
function replaceNativePerfProfile(node, depth) {
    if (!node || typeof node !== "object" || depth > 8)
        return false;
    // Single-child case: <Row><SG/></Row> reached via props.children. The
    // monitor rows go ABOVE the profile pick (live temps/fan/battery readout
    // heads the Perf tab, the lever follows).
    if (isNativePerfProfileEl(node.props?.children)) {
        node.props.children = (SP_JSX.jsx(DFL.ErrorBoundary, { children: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(MonitorRows, {}), SP_JSX.jsx(QuickPowerProfileDropdown, {})] }) }));
        return true;
    }
    const kids = node.props?.children;
    const arr = Array.isArray(kids) ? kids : kids ? [kids] : [];
    for (let i = 0; i < arr.length; i++) {
        const child = arr[i];
        if (!child || typeof child !== "object")
            continue;
        if (isNativePerfProfileEl(child) || isNativePerfProfileEl(child.props?.children)) {
            arr[i] = (SP_JSX.jsxs(DFL.ErrorBoundary, { children: [SP_JSX.jsx(MonitorRows, {}), SP_JSX.jsx(QuickPowerProfileRow, {})] }, "nebel-power"));
            if (Array.isArray(kids))
                node.props.children = arr;
            else
                node.props.children = arr[0];
            return true;
        }
        if (replaceNativePerfProfile(child, depth + 1))
            return true;
    }
    return false;
}
function cascadeWrapTypes(node, depth) {
    if (!node || typeof node !== "object" || depth > 4)
        return;
    if (Array.isArray(node)) {
        for (const child of node)
            cascadeWrapTypes(child, depth);
        return;
    }
    const nextType = wrapRenderType(node.type, visitPerf);
    if (nextType !== node.type)
        node.type = nextType;
    cascadeWrapTypes(node.props?.children, depth + 1);
}
function visitPerf(ret) {
    if (!nativePerfProfileType) {
        // Couldn't identify the native dropdown - append ours so the feature
        // isn't lost, leaving Steam's control alone.
        return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsxs(DFL.ErrorBoundary, { children: [SP_JSX.jsx(MonitorRows, {}), SP_JSX.jsx(QuickPowerProfileRow, {})] }) }));
    }
    // Search BEFORE cascading: the cascade swaps element types for wrapped
    // copies, which would hide the raw native type from the matcher at this
    // level. If the dropdown lives deeper, the cascade wraps those levels and
    // their own visitPerf call repeats the search-first dance there.
    if (replaceNativePerfProfile(ret?.props?.children ?? ret, 0)) {
        console.log(LOG, "native perf profile dropdown replaced");
        return null;
    }
    cascadeWrapTypes(ret, 0);
    return null;
}
// Splices our rows into the Quick Settings and Performance tab panels.
// Two entry points: afterPatch on the QAM menu renderer covers Steam
// rebuilding the tabs array on a full re-render, and an install-time
// in-place wrap covers the array that is already live (the menu component
// does not re-render on open). The WRAPPED field stores the original panel,
// so wrapping never stacks and uninstall can restore it.
function wrapTabs(tabsNode) {
    const tabs = tabsNode?.props?.tabs;
    if (!Array.isArray(tabs))
        return;
    for (const tab of tabs) {
        if (!tab || tab[WRAPPED] || !tab.panel)
            continue;
        const key = String(tab.key);
        const visit = key === String(QUICK_ACCESS_TAB_SETTINGS) ? visitQuickSettings : key === String(QUICK_ACCESS_TAB_PERFORMANCE) ? visitPerf : null;
        if (!visit)
            continue;
        const original = tab.panel;
        const wrappedType = wrapRenderType(original.type, visit);
        if (wrappedType === original.type)
            continue;
        tab[WRAPPED] = original;
        tab.panel = { ...original, type: wrappedType };
        console.log(LOG, key === String(QUICK_ACCESS_TAB_SETTINGS) ? "quick settings panel wrapped" : "performance panel wrapped");
    }
}
function unwrapTabs() {
    try {
        const root = DFL.getReactRoot(document.getElementById("root"));
        const tabsNode = root &&
            DFL.findInReactTree(root, (n) => Array.isArray(n?.memoizedProps?.tabs) && n.memoizedProps.tabs[0] && "key" in n.memoizedProps.tabs[0]);
        for (const tab of tabsNode?.memoizedProps?.tabs || []) {
            if (tab?.[WRAPPED]) {
                tab.panel = tab[WRAPPED];
                delete tab[WRAPPED];
            }
        }
    }
    catch (error) {
    }
}
// Installs the patch; returns the uninstaller for onDismount. Never throws -
// if a Steam update moves the QAM anchors, only the quick block disappears.
function installQamQuickPanel() {
    const patches = [];
    try {
        const qamModule = DFL.findModuleByExport((e) => e?.type?.toString?.()?.includes("QuickAccessMenuBrowserView"));
        const renderers = Object.values(qamModule || {}).filter((e) => e?.type?.toString?.()?.includes("QuickAccessMenuBrowserView") || e?.type?.toString?.()?.includes("QuickAccessMenuEmbedded"));
        if (!renderers.length) {
            console.log(LOG, "no QAM renderer export found");
            return () => { };
        }
        // Steam's native Perf-tab "Performance Profile" dropdown - identified by
        // its unique localization token (module 38747's SG export at the time of
        // writing). Null means we couldn't find it: visitPerf then appends our
        // power-profile row instead of replacing, leaving Steam's control alone.
        try {
            const perfModule = DFL.findModuleByExport((e) => typeof e === "function" && !e.prototype?.isReactComponent && e.toString().includes("PlatformPerformanceProfile_Label"));
            nativePerfProfileType =
                Object.values(perfModule || {}).find((e) => typeof e === "function" && e.toString().includes("PlatformPerformanceProfile_Label")) || null;
            console.log(LOG, nativePerfProfileType ? "native perf profile dropdown found" : "native perf profile dropdown NOT found");
        }
        catch (error) {
            console.warn(LOG, "perf profile lookup failed", error);
        }
        const handler = (_args, ret) => {
            try {
                const tabsNode = DFL.findInReactTree(ret, (x) => x?.props?.tabs);
                if (tabsNode)
                    wrapTabs(tabsNode);
            }
            catch (error) {
                console.warn(LOG, "tab scan failed", error);
            }
            return ret;
        };
        for (const renderer of renderers) {
            try {
                patches.push(DFL.afterPatch(renderer, "type", handler));
            }
            catch (error) {
                console.warn(LOG, "renderer patch failed", error);
            }
        }
        // The QAM menu component is mounted (hidden) before plugins load and does
        // NOT re-render when the menu opens - the tab contents component further
        // down does, reading the SAME tabs array from its memoized props. So the
        // afterPatch above only covers renders that pass through the patched
        // renderer; but Steam also rebuilds the tabs array (a useMemo in the QAM
        // module) on re-renders that bypass it, which silently drops the wrap.
        // Verified on console: one-shot wrapping is not enough. So keep a light
        // interval that re-finds the live tabs node and re-wraps whenever the
        // marker is gone - idempotent via WRAPPED, cheap (a tree scan every 2s).
        const ensureWrapped = () => {
            try {
                const root = DFL.getReactRoot(document.getElementById("root"));
                const tabsNode = root &&
                    DFL.findInReactTree(root, (n) => Array.isArray(n?.memoizedProps?.tabs) && n.memoizedProps.tabs[0] && "key" in n.memoizedProps.tabs[0]);
                if (!tabsNode)
                    return;
                const tabs = tabsNode.memoizedProps.tabs;
                const needsWrap = tabs.some((tab) => tab &&
                    !tab[WRAPPED] &&
                    (String(tab.key) === String(QUICK_ACCESS_TAB_SETTINGS) || String(tab.key) === String(QUICK_ACCESS_TAB_PERFORMANCE)));
                if (needsWrap) {
                    console.log(LOG, "tabs array rebuilt by Steam, re-wrapping");
                    wrapTabs({ props: { tabs } });
                }
            }
            catch (error) {
                console.warn(LOG, "existing-tabs wrap failed", error);
            }
        };
        ensureWrapped();
        const interval = window.setInterval(ensureWrapped, 2000);
        return () => {
            window.clearInterval(interval);
            for (const patch of patches) {
                try {
                    patch.unpatch();
                }
                catch (error) {
                }
            }
            unwrapTabs();
        };
    }
    catch (error) {
        console.warn(LOG, "install failed", error);
    }
    return () => {
        for (const patch of patches) {
            try {
                patch.unpatch();
            }
            catch (error) {
            }
        }
        unwrapTabs();
    };
}

var index = definePlugin(() => {
    let unregisterDownloadWatcher = () => { };
    const persistHandledGames = () => {
        saveCompatApplied(handledGameAppids()).catch((error) => {
            console.error("[Nebel Control] saveCompatApplied failed", error);
        });
    };
    let cancelled = false;
    const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
    // getConfig/getInstalledGames run this early in session startup, when the
    // backend socket or Steam's own library scan can still be warming up - a
    // single transient failure here used to silently disable auto-apply for
    // the rest of the session (this whole block was one Promise.all with no
    // retry and a swallowed .catch), which is indistinguishable from the
    // feature just not working at all. Retries give a slow-starting backend
    // a real chance instead of one shot.
    const bootstrap = async (attempt = 1) => {
        if (cancelled)
            return;
        const handledRequest = getCompatApplied()
            .then((appids) => ({ appids, loaded: true }))
            .catch((error) => {
            console.error("[Nebel Control] getCompatApplied failed", error);
            return { appids: [], loaded: false };
        });
        let config;
        let games;
        let handled;
        try {
            [config, games, handled] = await Promise.all([getConfig(), getInstalledGames(), handledRequest]);
        }
        catch (error) {
            console.error(`[Nebel Control] compat bootstrap failed (attempt ${attempt})`, error);
            if (attempt >= 5 || cancelled)
                return;
            await delay(Math.min(30000, 2000 * attempt));
            return bootstrap(attempt + 1);
        }
        if (cancelled)
            return;
        configureCompatPolicy(config.tweaks?.global?.windowsCompatTool, handled.loaded && config.tweaks?.global?.autoApplyCompat !== false, handled.appids);
        const persist = handled.loaded ? persistHandledGames : () => { };
        unregisterDownloadWatcher = registerDownloadWatcher(persist);
        window.setTimeout(() => {
            if (cancelled)
                return;
            sweepInstalledGames(games.map((game) => game.appid))
                .then(persist)
                .catch((error) => {
                console.error("[Nebel Control] sweepInstalledGames failed", error);
            });
        }, 3000);
    };
    bootstrap();
    routerHook.addRoute("/nebel-control", FullPage);
    const uninstallNativeSections = installNativeSettingsSections();
    const uninstallQamQuickPanel = installQamQuickPanel();
    return {
        name: "Nebel Control",
        // No `content` on purpose: Decky's plugin list only shows plugins that
        // have one, and Nebel Control's UI now lives inside Steam's own settings
        // pages (plus one compact block in the Quick Access settings panel and
        // the fullscreen /nebel-control route) - the list entry just duplicated
        // all that. The plugin still appears in Decky's plugin management.
        onDismount() {
            cancelled = true;
            unregisterDownloadWatcher();
            uninstallNativeSections();
            uninstallQamQuickPanel();
            routerHook.removeRoute("/nebel-control");
        },
        icon: (SP_JSX.jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [SP_JSX.jsx("path", { d: "M14 17H5" }), SP_JSX.jsx("path", { d: "M19 7h-9" }), SP_JSX.jsx("circle", { cx: "17", cy: "17", r: "3" }), SP_JSX.jsx("circle", { cx: "7", cy: "7", r: "3" })] })),
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
