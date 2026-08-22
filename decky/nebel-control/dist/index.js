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
const setStickLedMaxBrightness = (value) => call("set_stick_led_max_brightness", value);
const getControllerState = () => call("get_controller_state");
const saveCalibration = (capture) => call("save_calibration", capture);
const resetCalibration = () => call("reset_calibration");
const beginCalibrationSession = (token) => call("begin_calibration_session", token);
const endCalibrationSession = (token) => call("end_calibration_session", token);
const getDisplayState = () => call("get_display_state");
const setDisplayConfig = (useExternal, connector, width, height, orientation) => call("set_display_config", useExternal, connector, width, height, orientation);
const restartGamescopeSession = () => call("restart_gamescope_session");
const getSyncState = () => call("get_sync_state");
const setSyncServiceEnabled = (enabled) => call("set_sync_service_enabled", enabled);
const syncAddDevice = (deviceId, name) => call("sync_add_device", deviceId, name);
const syncRemoveDevice = (deviceId) => call("sync_remove_device", deviceId);
const syncSetFolderEnabled = (presetId, enabled) => call("sync_set_folder_enabled", presetId, enabled);

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

function Icon({ path }) {
    return (SP_JSX.jsx("svg", { style: { display: "block" }, width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: path }));
}
const tabIcons = {
    Compatibility: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("line", { x1: "6", x2: "10", y1: "11", y2: "11" }), SP_JSX.jsx("line", { x1: "8", x2: "8", y1: "9", y2: "13" }), SP_JSX.jsx("line", { x1: "15", x2: "15.01", y1: "12", y2: "12" }), SP_JSX.jsx("line", { x1: "18", x2: "18.01", y1: "10", y2: "10" }), SP_JSX.jsx("path", { d: "M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" })] }) })),
    Power: (SP_JSX.jsx(Icon, { path: SP_JSX.jsx(SP_JSX.Fragment, { children: SP_JSX.jsx("path", { d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" }) }) })),
    Display: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }), SP_JSX.jsx("line", { x1: "8", x2: "16", y1: "21", y2: "21" }), SP_JSX.jsx("line", { x1: "12", x2: "12", y1: "17", y2: "21" })] }) })),
    Lighting: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" }), SP_JSX.jsx("path", { d: "M9 18h6" }), SP_JSX.jsx("path", { d: "M10 22h4" })] }) })),
    Sync: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M21 12a9 9 0 0 1-15.5 6.2L3 16" }), SP_JSX.jsx("path", { d: "M3 12a9 9 0 0 1 15.5-6.2L21 8" }), SP_JSX.jsx("path", { d: "M3 11v5h5" }), SP_JSX.jsx("path", { d: "M21 13V8h-5" })] }) })),
    Advanced: (SP_JSX.jsx(Icon, { path: SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("path", { d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }), SP_JSX.jsx("circle", { cx: "12", cy: "12", r: "3" })] }) })),
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
// app_type: 1 = Game. Polls because overviews load a beat after plugin init.
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
// Wraps only a confirmed game (app_type 1), never a tool/runtime. Returns false if the
// overview/details were still cold, so the caller can retry; true once resolved.
async function applyLaunchWrapperToGame(appid) {
    const type = await resolveOverviewType(appid);
    if (type === null)
        return false;
    if (type !== 1)
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
        { data: "", label: "Default" },
        ...availableGames(config).map((game) => ({ data: game.appid, label: gameDisplayName(game) })),
    ];
}
function currentGame() {
    const running = DFL.Router?.MainRunningApp || window.Router?.MainRunningApp;
    const appid = running?.appid;
    if (!appid)
        return null;
    const id = String(appid);
    let name = running?.display_name || running?.displayName || "";
    try {
        const details = window.appDetailsStore?.GetAppDetails?.(Number(id));
        name = details?.strDisplayName || details?.strName || details?.name || name;
    }
    catch (error) {
    }
    return { appid: id, name: name || `App ${id}` };
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
      .nebel-control-tabs .nebel-slider-field {
        width: 100%;
        max-width: none;
        overflow: hidden;
      }
      .nebel-control-tabs .nebel-slider-field * {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      .nebel-control-tabs .nebel-reset-row {
        padding: 0 14px 8px;
      }
      .nebel-control-tabs .nebel-color-preview-row {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 4px 0;
      }
      .nebel-control-tabs .nebel-color-preview-label {
        flex: 1 1 auto;
        opacity: 0.87;
      }
      .nebel-control-tabs .nebel-color-swatch {
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
      }
      .nebel-control-tabs .nebel-color-preview-hex {
        flex: 0 0 auto;
        font-variant-numeric: tabular-nums;
        opacity: 0.62;
        font-size: 12px;
      }
      .nebel-control-tabs .nebel-mode-preview-wrap {
        display: flex;
        justify-content: center;
        width: 100%;
        padding: 4px 0 8px;
      }
      .nebel-control-tabs .nebel-mode-preview-canvas {
        background: rgba(0, 0, 0, 0.25);
        border-radius: 8px;
      }
      .nebel-control-tabs .nebel-preset-swatch {
        width: 34px;
        height: 34px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35);
        cursor: pointer;
      }
      .nebel-control-tabs .nebel-color-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }
      .nebel-control-tabs .nebel-color-sv-wrap,
      .nebel-control-tabs .nebel-color-hue-wrap {
        position: relative;
      }
      .nebel-control-tabs .nebel-color-sv-canvas {
        display: block;
        border-radius: 6px;
        touch-action: none;
        cursor: crosshair;
      }
      .nebel-control-tabs .nebel-color-hue-canvas {
        display: block;
        border-radius: 4px;
        touch-action: none;
        cursor: ew-resize;
      }
      .nebel-control-tabs .nebel-color-cursor {
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
      .nebel-control-tabs .nebel-color-hue-cursor {
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
      .nebel-control-tabs .nebel-compat-note {
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
    `;

function SelectEdit({ label, value, options, onChange, labelBelow, disabled }) {
    const rgOptions = options.map((option) => (typeof option === "string" ? { data: option, label: option } : option));
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: label === undefined ? (SP_JSX.jsx(DFL.Dropdown, { disabled: disabled, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) })) : labelBelow ? (SP_JSX.jsx(DFL.Field, { label: label, childrenLayout: "below", childrenContainerWidth: "max", disabled: disabled, children: SP_JSX.jsx(DFL.Dropdown, { disabled: disabled, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) }) })) : (SP_JSX.jsx(DFL.DropdownItemInternal, { disabled: disabled, childrenContainerWidth: "max", label: label, selectedOption: value, rgOptions: rgOptions, onChange: (option) => onChange(option.data) })) }));
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
    { data: "Default", label: "Default" },
    { data: "Native", label: "Native" },
    { data: "1280x720", label: "1280x720" },
    { data: "960x540", label: "960x540" },
];
const compatModeOptions = [
    { data: "arm64", label: "ARM64 (native, recommended)" },
    { data: "x86_64", label: "x86_64 (emulated via FEX)" },
];
// SM8250's cpu0-3 are the 1.8GHz LITTLE cluster, cpu4-7 the 2.4-2.84GHz
// big+prime cluster - same split ROCKNIX's own SM8250 profile uses.
const cpuAffinityOptions = [
    { data: "", label: "Default (any core)" },
    { data: "big", label: "Big cores only (cpu4-7)" },
    { data: "little", label: "Little cores only (cpu0-3)" },
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
    return (SP_JSX.jsxs(DFL.ModalRoot, { onCancel: closeModal, children: [SP_JSX.jsx(DFL.DialogBody, { children: "This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam." }), SP_JSX.jsxs(DFL.DialogFooter, { children: [SP_JSX.jsx(DFL.DialogButton, { onClick: confirm, children: "Reset All Games" }), SP_JSX.jsx(DFL.DialogButton, { onClick: closeModal, children: "Cancel" })] })] }));
}
function Compatibility({ config, setConfig }) {
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
    const selectedGame = config.selectedGame || runtimeGame || null;
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
                    setResolutionMessage("Resolution override is unavailable");
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
            setResolutionMessage("Failed to set resolution override");
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
            setResolutionMessage("Failed to set default resolution");
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
        { data: USE_DEFAULT_COMPAT, label: "Use Default" },
        { data: FOLLOW_STEAM_COMPAT, label: "Follow Steam" },
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
    const presets = config.fexProfiles || {};
    const presetEntries = Object.entries(presets);
    const storedProfile = values.fexProfile;
    const storedConfig = values.fexConfig;
    const ownConfig = (editingDefault ? tweaks.global.fexConfig : gameSettings.fexConfig);
    const hasPreset = !!(storedProfile && presets[storedProfile]);
    const isCustom = customSelected || (!hasPreset && !!storedConfig);
    const fexValue = isCustom ? "custom" : hasPreset ? storedProfile : "default";
    const fexConfig = (isCustom ? storedConfig : presets[fexValue]?.config) || presets.default?.config || {};
    const fexOptions = [...presetEntries.map(([id, profile]) => ({ data: id, label: profile.label })), { data: "custom", label: "Custom" }];
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
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "EDIT GAME PROFILE", children: [SP_JSX.jsx(SelectEdit, { value: game?.appid || "", options: gameOptions, onChange: setSelectedGame }), SP_JSX.jsx("div", { className: "nebel-compat-note", children: "Compatibility changes apply on next launch" })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "PROFILE SETTINGS", children: [editingDefault ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { labelBelow: true, label: "Compatibility Mode", value: compatMode, options: compatModeOptions, onChange: onSelectCompatMode }), SP_JSX.jsx(SelectEdit, { labelBelow: true, label: "Default Proton", value: globalTool, options: toolOptions, onChange: onSelectGlobalDefault }), SP_JSX.jsx(DFL.ToggleField, { label: "Apply to New Games", checked: tweaks.global.autoApplyCompat !== false, onChange: (enabled) => {
                                    setAutoApplyCompat(enabled);
                                    patchSettings({ autoApplyCompat: enabled });
                                } }), SP_JSX.jsx(SelectEdit, { label: "Game Resolution", value: defaultResolution, options: resolutionOptions, onChange: setSteamDefaultResolution }), SP_JSX.jsx(DFL.ToggleField, { label: "Performance Overlay", description: "FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart", checked: tweaks.global.mangoapp === true, onChange: (enabled) => patchSettings({ mangoapp: enabled }) })] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { labelBelow: true, label: "Compatibility Tool", value: currentTool, options: perGameToolOptions, onChange: onSelectPerGameTool }), SP_JSX.jsx(SelectEdit, { label: "Game Resolution", value: resolution, options: resolutionOptions, onChange: setSteamResolution })] })), resolutionMessage ? SP_JSX.jsx(DFL.Field, { label: "Status", description: resolutionMessage }) : null, SP_JSX.jsx(SelectEdit, { label: "FEX Preset", value: fexValue, options: fexOptions, onChange: onSelectFex }), isCustom
                        ? fexKnobs.map((knob) => (SP_JSX.jsx(DFL.ToggleField, { label: knob.label, checked: fexConfig[knob.key] === "1", onChange: (value) => setKnob(knob.key, value) }, knob.key)))
                        : null] }), SP_JSX.jsxs(DFL.PanelSection, { title: "ADVANCED", children: [SP_JSX.jsx(SelectEdit, { label: "CPU Cores", value: String(values.cores || ""), options: cpuAffinityOptions, onChange: (value) => patchSettings({ cores: value || undefined }) }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setShowThunks((value) => !value), children: showThunks ? "Hide Host Thunks" : "Host Thunks" }), showThunks
                        ? thunkModules.map((thunk) => (SP_JSX.jsx(DFL.ToggleField, { label: thunk.label, checked: thunks[thunk.module] !== false, onChange: (value) => setThunk(thunk.module, value) }, thunk.module)))
                        : null] }), !editingDefault ? (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: resetGame, children: "Reset to Default" }) })) : (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: resettingAll, onClick: confirmResetAllGames, children: resettingAll ? "Resetting..." : "Reset All Games" }) }))] }));
}

// gamescope only ever drives one embedded output at a time (--prefer-output
// picks the first available from a priority list at startup, there's no
// live multi-monitor/hotplug re-pick) - so "primary display" here means
// which single connector the whole game-mode session targets, not an
// extend/mirror choice.
const INTERNAL = "__internal__";
function Display() {
    const [state, setState] = SP_REACT.useState(null);
    const [loadMessage, setLoadMessage] = SP_REACT.useState("Loading");
    const [errorMessage, setErrorMessage] = SP_REACT.useState("");
    const [saving, setSaving] = SP_REACT.useState(false);
    const [restarting, setRestarting] = SP_REACT.useState(false);
    SP_REACT.useEffect(() => {
        getDisplayState()
            .then(setState)
            .catch((error) => setLoadMessage(String(error)));
    }, []);
    if (!state) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: "DISPLAY", children: SP_JSX.jsx(DFL.Field, { label: loadMessage }) }));
    }
    const externals = state.connectors.filter((c) => !c.internal);
    const selectedConnector = state.useExternal ? state.connector : INTERNAL;
    const primaryOptions = [
        { data: INTERNAL, label: "Internal Screen" },
        ...externals.map((c) => ({
            data: c.connector,
            label: !c.connected ? `${c.connector} (disconnected)` : c.connector,
        })),
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
        persist({
            useExternal: true,
            connector,
            width: previous?.width || w || 1920,
            height: previous?.height || h || 1080,
            // gamescope has no way to rotate a non-internal output (there's no
            // Rotation control here for that reason) - orientation is meaningless
            // for an external display, always "normal".
            orientation: "normal",
        });
    };
    const selectMode = (mode) => {
        const [w, h] = mode.split("x").map(Number);
        if (!w || !h)
            return;
        persist({ width: w, height: h });
    };
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "EXTERNAL DISPLAY", children: [SP_JSX.jsx(SelectEdit, { label: "Primary Display", value: selectedConnector, options: primaryOptions, onChange: selectPrimary, disabled: saving }), state.useExternal && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: "Resolution", value: currentMode, options: modeOptions, onChange: selectMode, disabled: saving || activeDisconnected }), SP_JSX.jsx(DFL.Field, { label: "Rotation isn't available for an external display (gamescope only rotates the internal screen)." })] })), externals.length === 0 && (SP_JSX.jsx(DFL.Field, { label: "No external display detected. Connect one (dock/USB-C/HDMI) to choose it here." })), activeDisconnected && (SP_JSX.jsx(DFL.Field, { label: "This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered." })), errorMessage && SP_JSX.jsx(DFL.Field, { label: `Error: ${errorMessage}` }), SP_JSX.jsx("div", { className: "nebel-reset-row", children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: restarting, onClick: () => {
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
                    }, children: "Apply & Restart Game Mode" }) })] }));
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
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { className: "nebel-color-preview-row", children: [label !== undefined && SP_JSX.jsx("span", { className: "nebel-color-preview-label", children: label }), SP_JSX.jsx("div", { className: "nebel-color-swatch", style: { backgroundColor: `#${hex}` } }), SP_JSX.jsxs("span", { className: "nebel-color-preview-hex", children: ["#", hex] })] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { className: "nebel-color-picker", children: [SP_JSX.jsxs("div", { className: "nebel-color-sv-wrap", style: { width: SV_WIDTH, height: SV_HEIGHT }, children: [SP_JSX.jsx("canvas", { ref: svCanvasRef, width: SV_WIDTH, height: SV_HEIGHT, className: "nebel-color-sv-canvas", onPointerDown: handleSvPointer, onPointerMove: (event) => event.buttons === 1 && handleSvPointer(event) }), SP_JSX.jsx("div", { className: "nebel-color-cursor", style: { left: svCursorX, top: svCursorY, backgroundColor: `#${hex}` } })] }), SP_JSX.jsxs("div", { className: "nebel-color-hue-wrap", style: { width: SV_WIDTH, height: HUE_HEIGHT }, children: [SP_JSX.jsx("canvas", { ref: hueCanvasRef, width: SV_WIDTH, height: HUE_HEIGHT, className: "nebel-color-hue-canvas", onPointerDown: handleHuePointer, onPointerMove: (event) => event.buttons === 1 && handleHuePointer(event) }), SP_JSX.jsx("div", { className: "nebel-color-hue-cursor", style: { left: hueCursorX } })] })] }) })] }));
}

// Small animated preview of the selected stick-lighting mode: four dots
// arranged like the real HTR3212 LED ring (N/E/S/W, matching the actual
// 4-zone-per-stick hardware layout), animated with a simplified version of
// each mode's real algorithm. Not a pixel-exact simulation of the backend
// (ambilight in particular can't be, since it mirrors the screen) - just
// enough motion to tell the modes apart at a glance before committing to one,
// same job Steam's own settings previews do.
const SIZE = 96;
const CENTER = SIZE / 2;
const DOT_RADIUS = 10;
const RING_RADIUS = SIZE / 2 - DOT_RADIUS - 4;
// Two dots on top, two on the bottom - matches the physical HTR3212 ring
// layout (zones 1=SW, 2=NW, 3=NE, 4=SE) when the stick is viewed from above.
// Ordered clockwise: NE (top-right), SE (bottom-right), SW (bottom-left), NW (top-left).
const ZONE_ANGLES = [-45, 45, 135, 225];
function rgbCss([r, g, b], alpha = 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}
function zonePosition(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CENTER + RING_RADIUS * Math.cos(rad), y: CENTER + RING_RADIUS * Math.sin(rad) };
}
function ModePreview({ mode, color, duotoneColorA, duotoneColorB }) {
    const canvasRef = SP_REACT.useRef(null);
    SP_REACT.useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx)
            return;
        const base = hexToRgb(color);
        const colorA = hexToRgb(duotoneColorA);
        const colorB = hexToRgb(duotoneColorB);
        let raf = 0;
        const start = performance.now();
        // A handful of fixed pseudo-random phases so "starlight" twinkles look
        // scattered instead of perfectly synchronized - not meant to match the
        // backend's actual RNG, just to avoid an obviously-fake unison blink.
        const twinklePhases = [0.15, 0.6, 0.35, 0.85];
        function zoneColor(i, t) {
            switch (mode) {
                case "static":
                    return base;
                case "breathing": {
                    const level = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2));
                    return [base[0] * level, base[1] * level, base[2] * level];
                }
                case "rainbow": {
                    const [r, g, b] = hsbToRgb((t * 70) % 360, 100, 100);
                    return [r, g, b];
                }
                case "wave": {
                    const [r, g, b] = hsbToRgb((t * 70 + i * 90) % 360, 100, 100);
                    return [r, g, b];
                }
                case "starlight": {
                    const phase = twinklePhases[i];
                    const level = 0.15 + 0.85 * Math.max(0, Math.sin((t * 1.4 + phase * 8) % (Math.PI * 2)));
                    return [base[0] * level, base[1] * level, base[2] * level];
                }
                case "spin": {
                    const litIndex = Math.floor((t * 1.6) % 4);
                    const dist = Math.min((i - litIndex + 4) % 4, (litIndex - i + 4) % 4);
                    const level = dist === 0 ? 1 : dist === 1 ? 0.25 : 0.05;
                    return [base[0] * level, base[1] * level, base[2] * level];
                }
                case "reactive": {
                    // Simplified stand-in for a button flash: a soft pulse every ~1.6s
                    // rather than a real input event, since there's nothing to react to here.
                    const pulse = Math.max(0, Math.sin(t * 1.2 - Math.PI / 2));
                    const level = 0.2 + 0.8 * Math.pow(pulse, 3);
                    return [base[0] * level, base[1] * level, base[2] * level];
                }
                case "multidot": {
                    const litIndex = Math.floor((t * 2.4) % 4);
                    const trailIndex = (litIndex + 3) % 4;
                    if (i === litIndex)
                        return base;
                    if (i === trailIndex)
                        return [base[0] * 0.35, base[1] * 0.35, base[2] * 0.35];
                    return [0, 0, 0];
                }
                case "ambilight": {
                    // Real mode mirrors the screen - approximated here with a slow,
                    // generic hue drift so it still reads as "alive" rather than static.
                    const [r, g, b] = hsbToRgb((t * 25 + i * 30) % 360, 70, 90);
                    return [r, g, b];
                }
                case "duotone": {
                    const level = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.8));
                    const [pr, pg, pb] = i % 2 === 0 ? colorA : colorB;
                    return i % 2 === 0
                        ? [pr, pg, pb]
                        : [pr * level, pg * level, pb * level];
                }
                default:
                    return base;
            }
        }
        function draw(now) {
            const t = (now - start) / 1000;
            ctx.clearRect(0, 0, SIZE, SIZE);
            // Faint ring guide so empty/dim zones still read as "part of the stick".
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(CENTER, CENTER, RING_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ZONE_ANGLES.forEach((angle, i) => {
                const { x, y } = zonePosition(angle);
                const rgb = zoneColor(i, t);
                ctx.beginPath();
                ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = rgbCss(rgb);
                ctx.shadowColor = rgbCss(rgb, 0.9);
                ctx.shadowBlur = 8;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            raf = requestAnimationFrame(draw);
        }
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [mode, color, duotoneColorA, duotoneColorB]);
    return (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { className: "nebel-mode-preview-wrap", children: SP_JSX.jsx("canvas", { ref: canvasRef, width: SIZE, height: SIZE, className: "nebel-mode-preview-canvas" }) }) }));
}

const PRESET_COLORS = [
    { label: "Blue", value: "0050FF" },
    { label: "Cyan", value: "00E5FF" },
    { label: "Purple", value: "8000FF" },
    { label: "Pink", value: "FF0080" },
    { label: "Red", value: "FF0000" },
    { label: "Orange", value: "FF8000" },
    // Matches stick-led-color's DEFAULT_DUOTONE_COLOR_B - pure gold (FFD700)
    // read as noticeably greenish on this LED.
    { label: "Yellow", value: "FFAA00" },
    { label: "Green", value: "00FF00" },
    { label: "White", value: "FFFFFF" },
];
function patchSide(stickLed, side, patch) {
    return { ...stickLed, sides: { ...stickLed.sides, [side]: { ...stickLed.sides[side], ...patch } } };
}
const SIDE_OPTIONS = [
    { data: "l", label: "Left Stick" },
    { data: "r", label: "Right Stick" },
];
const MODE_OPTIONS = [
    { data: "static", label: "Static" },
    { data: "breathing", label: "Breathing" },
    { data: "rainbow", label: "Rainbow" },
    { data: "wave", label: "Wave (rainbow spread around the ring)" },
    { data: "starlight", label: "Starlight (random zone twinkle)" },
    { data: "spin", label: "Spin" },
    { data: "reactive", label: "Reactive (sticks + buttons)" },
    { data: "multidot", label: "Multidot (RGB chase)" },
    { data: "ambilight", label: "Ambilight (matches screen)" },
    { data: "duotone", label: "Duotone (two-color split)" },
];
const COLOR_VISIBLE_MODES = new Set(["static", "breathing", "spin"]);
const COLOR_SOURCE_OPTIONS = [
    { data: "static", label: "Custom color" },
    { data: "battery", label: "Battery level" },
    { data: "random", label: "Random (unpredictable color shift)" },
    { data: "shimmer", label: "Shimmer (pale/cool to rich/warm)" },
];
const DUOTONE_ORIENTATION_OPTIONS = [
    { data: "horizontal", label: "Horizontal" },
    { data: "vertical", label: "Vertical" },
    { data: "diagonal", label: "Diagonal" },
];
const FLASH_BUTTON_OPTIONS = [
    { data: "south", label: "South" },
    { data: "east", label: "East" },
    { data: "north", label: "North" },
    { data: "west", label: "West" },
    { data: "l1", label: "L1" },
    { data: "r1", label: "R1" },
    { data: "l3", label: "L3 (left stick click)" },
    { data: "r3", label: "R3 (right stick click)" },
    { data: "l4", label: "L4 (left paddle)" },
    { data: "r4", label: "R4 (right paddle)" },
    { data: "start", label: "Start" },
    { data: "select", label: "Select" },
    { data: "dpad_up", label: "D-Pad Up" },
    { data: "dpad_down", label: "D-Pad Down" },
    { data: "dpad_left", label: "D-Pad Left" },
    { data: "dpad_right", label: "D-Pad Right" },
    { data: "other", label: "Other buttons" },
];
const DEFAULT_FLASH_COLOR = "FFFFFF";
const PARAM_UI = {
    speed: {
        label: "Speed",
        min: 25,
        max: 300,
        step: 25,
        modes: new Set(["breathing", "rainbow", "spin", "multidot", "ambilight", "duotone", "wave", "starlight"]),
        toBackend: (v) => v / 100,
        fromBackend: (v) => Math.round(v * 100),
    },
    intensity: {
        label: "Intensity (min brightness)",
        min: 0,
        max: 50,
        step: 5,
        modes: new Set(["breathing", "spin", "multidot", "reactive", "duotone", "starlight"]),
        toBackend: (v) => v / 100,
        fromBackend: (v) => Math.round(v * 100),
    },
    size: {
        label: "Size",
        min: 1,
        max: 3,
        step: 1,
        modes: new Set(["spin", "multidot", "reactive"]),
        toBackend: (v) => v,
        fromBackend: (v) => v,
    },
};
const PARAM_DEFAULTS = { speed: 1.0, intensity: 0.15, size: 2 };
function Lighting({ config, setConfig }) {
    const [colorsExpanded, setColorsExpanded] = SP_REACT.useState(false);
    const [customColorExpanded, setCustomColorExpanded] = SP_REACT.useState(false);
    const [flashExpanded, setFlashExpanded] = SP_REACT.useState(false);
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
    const setStickLedChargingIndicator$1 = async (value) => {
        if (!stickLed || !sideState)
            return;
        const sides = targetSides;
        const previous = sides.map((s) => stickLed.sides[s].chargingIndicator);
        setConfig((current) => {
            if (!current)
                return current;
            let sl = current.stickLed;
            for (const s of sides)
                sl = patchSide(sl, s, { chargingIndicator: value });
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
                sides.forEach((s, i) => { sl = patchSide(sl, s, { chargingIndicator: previous[i] }); });
                return { ...current, stickLed: sl };
            });
        }
    };
    const makeToggleSetter = (field, apply) => async (value) => {
        if (!stickLed || !sideState)
            return;
        const sides = targetSides;
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
    const setStickLedFlip$1 = makeToggleSetter("flip", setStickLedFlip);
    if (!stickLed?.supported || !sideState) {
        return (SP_JSX.jsx(DFL.PanelSection, { title: "Stick Lighting", children: SP_JSX.jsx(DFL.Field, { label: "No addressable stick lighting hardware detected on this device." }) }));
    }
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Stick Lighting", children: [SP_JSX.jsx(ToggleRow, { label: "Enable", description: "Turn both sticks off entirely, without losing the mode/color settings below", value: stickLed.enabled, onChange: setStickLedEnabled$1 }), !stickLed.enabled && SP_JSX.jsx(DFL.Field, { label: "Sticks are off - settings below are kept, not applied." }), stickLed.enabled && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(ToggleRow, { label: "Follow screen brightness", description: "Dim both sticks along with the display backlight", value: !!stickLed.screenLink, onChange: setStickLedScreenLink$1 }), !stickLed.screenLink && (SP_JSX.jsx(SliderEdit, { label: "Max Brightness", value: Math.round((stickLed.maxBrightness ?? 1) * 100), min: 0, max: 100, step: 5, onChange: (value) => setStickLedMaxBrightness$1(value / 100) })), SP_JSX.jsx(ToggleRow, { label: "Configure each stick separately", description: "Off: changes below apply to both sticks at once. On: pick a stick and edit just that one.", value: separate, onChange: setSeparate }), separate && (SP_JSX.jsx(SelectEdit, { label: "Stick", value: selectedSide, options: SIDE_OPTIONS, onChange: (value) => setSelectedSide(value) })), SP_JSX.jsx(SelectEdit, { label: "Mode", value: mode, options: MODE_OPTIONS, onChange: setStickLedMode$1 }), SP_JSX.jsx(ModePreview, { mode: mode, color: sideState.color, duotoneColorA: sideState.duotoneColorA, duotoneColorB: sideState.duotoneColorB }), mode === "spin" && (SP_JSX.jsx(ToggleRow, { label: "Soft trail", description: "Trailing fade (uses Size below) instead of a single hard-edged dot", value: !!sideState.chase, onChange: setStickLedChase$1 })), mode === "reactive" && (SP_JSX.jsx(ToggleRow, { label: "Compass", description: "Point the lit zone(s) at the stick's push direction instead of lighting evenly", value: !!sideState.compass, onChange: setStickLedCompass$1 })), mode === "duotone" && (SP_JSX.jsx(ToggleRow, { label: "Seesaw", description: "Breathe the two color groups against each other instead of a static split", value: !!sideState.seesaw, onChange: setStickLedSeesaw$1 })), Object.entries(PARAM_UI)
                        .filter(([, spec]) => spec.modes.has(mode))
                        .map(([param, spec]) => {
                        const key = `${param}_${mode}`;
                        const raw = sideState.params[key] ?? PARAM_DEFAULTS[param];
                        return (SP_JSX.jsx(SliderEdit, { label: spec.label, value: spec.fromBackend(raw), min: spec.min, max: spec.max, step: spec.step, onChange: (value) => setStickLedParam$1(param, spec.toBackend(value)) }, param));
                    }), COLOR_VISIBLE_MODES.has(mode) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setColorsExpanded((expanded) => !expanded), children: colorsExpanded ? "Hide colors ▲" : "Colors ▼" }), colorsExpanded && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: "Color Source", value: sideState.colorSource || "static", options: COLOR_SOURCE_OPTIONS, onChange: setStickLedColorSource$1 }), sideState.colorSource === "battery" && (SP_JSX.jsx(ToggleRow, { label: "Charging indicator", description: "Spin a blue dot around the stick while charging", value: sideState.chargingIndicator, onChange: setStickLedChargingIndicator$1 })), sideState.colorSource !== "battery" && sideState.colorSource !== "random" && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(PresetSwatchGrid, { colors: PRESET_COLORS, selected: sideState.color, onSelect: setStickLedColor$1 }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setCustomColorExpanded((expanded) => !expanded), children: customColorExpanded ? "Hide custom color ▲" : "Custom color (advanced) ▼" }), customColorExpanded && (SP_JSX.jsx(ColorPicker, { hex: sideState.color, onChange: setStickLedColor$1 }))] }))] }))] })), mode === "reactive" && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setFlashExpanded((expanded) => !expanded), children: flashExpanded ? "Hide flash colors ▲" : "Show flash colors ▼" }), flashExpanded && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: "Button", value: flashButton, options: FLASH_BUTTON_OPTIONS, onChange: setFlashButton }), SP_JSX.jsx(PresetSwatchGrid, { colors: PRESET_COLORS, selected: stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR, onSelect: setStickLedFlashColor$1 }), SP_JSX.jsx(ColorPicker, { hex: stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR, onChange: setStickLedFlashColor$1 })] }))] })), mode === "duotone" && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(SelectEdit, { label: "Split", value: sideState.duotoneOrientation || "horizontal", options: DUOTONE_ORIENTATION_OPTIONS, onChange: setStickLedDuotoneOrientation$1 }), SP_JSX.jsx(ColorPicker, { label: "Color A", hex: sideState.duotoneColorA, onChange: (hex) => setStickLedDuotoneColor$1("a", hex) }), SP_JSX.jsx(ColorPicker, { label: "Color B", hex: sideState.duotoneColorB, onChange: (hex) => setStickLedDuotoneColor$1("b", hex) })] })), SP_JSX.jsx(ToggleRow, { label: "Flip stick ring", description: "Rotate the LED ring 180\u00B0 for stick variants wired upside-down (fixes compass/direction on some RP6 units)", value: !!sideState.flip, onChange: setStickLedFlip$1 })] }))] }));
}

const underclocks = [
    { data: "none", label: "None" },
    { data: "small", label: "Small" },
    { data: "medium", label: "Medium" },
    { data: "large", label: "Large" },
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
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSection, { title: "EDIT POWER PROFILE", children: SP_JSX.jsx(SelectEdit, { value: profile, options: profiles, onChange: setProfile }) }), SP_JSX.jsxs(DFL.PanelSection, { title: "PROFILE SETTINGS", children: [SP_JSX.jsx(SelectEdit, { label: "Fan Curve", value: p.fan_curve, options: fanCurves, onChange: (v) => setProfileValue("fan_curve", v) }), supportsUnderclockPresets ? (SP_JSX.jsx(SelectEdit, { label: "CPU Underclock", value: underclockLevel, options: underclocks, onChange: (v) => setProfileValue("cpu_underclock", v) })) : (SP_JSX.jsx(SliderEdit, { label: "CPU Max (%)", value: Math.round(Number(p.cpu_max || 0) * 100), min: 35, max: 100, step: 1, onChange: (v) => setProfileValue("cpu_max", (v / 100).toFixed(2)) })), SP_JSX.jsx(SliderEdit, { label: "GPU Min (%)", value: Math.round(Number(p.gpu_min || 0) * 100), min: 0, max: 100, step: 1, onChange: (v) => setGpuValue("gpu_min", (v / 100).toFixed(2)) }), SP_JSX.jsx(SliderEdit, { label: "GPU Max (%)", value: Math.round(Number(p.gpu_max || 0) * 100), min: 35, max: 100, step: 1, onChange: (v) => setGpuValue("gpu_max", (v / 100).toFixed(2)) }), SP_JSX.jsx("div", { className: "nebel-reset-row", children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: resetProfile, children: "Reset to Default" }) })] })] }));
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
        ? "Checking controller..."
        : !canApply
            ? "This device can't save calibration, but you can check stick and trigger response here."
            : phase === "recording"
                ? "Move both sticks in full circles and fully press both triggers, then Save."
                : "Press Start, then move sticks and triggers through full range.";
    return (SP_JSX.jsxs(DFL.ModalRoot, { onCancel: close, children: [SP_JSX.jsxs(DFL.DialogBody, { children: [SP_JSX.jsxs("div", { style: { ...gridTwoCol, alignItems: "start", marginBottom: "22px" }, children: [SP_JSX.jsx(StickPlot, { title: "Left Stick", xName: "left_x", yName: "left_y", state: state }), SP_JSX.jsx(StickPlot, { title: "Right Stick", xName: "right_x", yName: "right_y", state: state })] }), SP_JSX.jsxs("div", { style: { ...gridTwoCol, marginBottom: "16px" }, children: [SP_JSX.jsx(TriggerBar, { title: "LT", name: "left_trigger", state: state }), SP_JSX.jsx(TriggerBar, { title: "RT", name: "right_trigger", state: state })] }), SP_JSX.jsx("div", { style: { fontSize: "13px", lineHeight: "18px", opacity: 0.72, textAlign: "center" }, children: instructions })] }), SP_JSX.jsxs(DFL.DialogFooter, { children: [SP_JSX.jsx("style", { children: focusStyles }), !canApply ? (SP_JSX.jsx("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: "Close" }) })) : phase === "recording" ? (SP_JSX.jsxs("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: save, disabled: !capture, children: "Save Calibration" }), SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: "Close" })] })) : (SP_JSX.jsxs("div", { className: "nebel-cal-footer", style: { display: "flex", gap: "10px" }, children: [SP_JSX.jsx(DFL.DialogButton, { onClick: start, children: "Start Calibration" }), SP_JSX.jsx(DFL.DialogButton, { onClick: reset, children: "Reset to Defaults" }), SP_JSX.jsx(DFL.DialogButton, { onClick: close, children: "Close" })] }))] })] }));
}
function openCalibration() {
    DFL.showModal(SP_JSX.jsx(CalibrationModal, {}));
}

function Settings({ config, setConfig }) {
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
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Controller", children: [SP_JSX.jsx(SelectEdit, { label: "Emulation", value: config.controllerType || "deck-uhid", options: config.controllerTypes || [], onChange: setControllerType$1 }), SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: openCalibration, children: "Launch Calibration" })] }), SP_JSX.jsxs(DFL.PanelSection, { title: "System", children: [SP_JSX.jsx(ToggleRow, { label: "Enable SSH", value: !!config.sshEnabled, onChange: setSshEnabled$1 }), SP_JSX.jsx(ToggleRow, { label: "Mount shared storage", description: "Mount ARMADA_SHARED partition at ~/Shared", value: !!config.sharedStorageEnabled, onChange: setSharedStorageEnabled$1 }), SP_JSX.jsx(DFL.Field, { label: "OS Version", description: config.osVersion || "unknown" })] })] }));
}

function AddDeviceModal({ closeModal, onAdd }) {
    const [deviceId, setDeviceId] = SP_REACT.useState("");
    const [name, setName] = SP_REACT.useState("");
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
    return (SP_JSX.jsx(DFL.ModalRoot, { onCancel: closeModal, children: SP_JSX.jsxs(DFL.DialogBody, { children: [SP_JSX.jsx("div", { style: { marginBottom: "6px", fontSize: "13px", opacity: 0.8 }, children: "Device ID of the other console (shown on its Sync tab)" }), SP_JSX.jsx("input", { type: "text", placeholder: "XXXXXXX-XXXXXXX-...", value: deviceId, onChange: (e) => setDeviceId(e.target.value), style: inputStyle }), SP_JSX.jsx("input", { type: "text", placeholder: "Name (e.g. Mini V2)", value: name, onChange: (e) => setName(e.target.value), style: inputStyle }), SP_JSX.jsx(DFL.DialogFooter, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy || deviceId.trim().length < 20, onClick: () => {
                            setBusy(true);
                            void onAdd(deviceId, name).finally(() => {
                                setBusy(false);
                                closeModal?.();
                            });
                        }, children: "Add device" }) })] }) }));
}
function Sync() {
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
        return SP_JSX.jsx(DFL.PanelSection, { title: "Sync", children: SP_JSX.jsx(DFL.Field, { label: "Loading" }) });
    const connectedCount = state.devices.filter((d) => d.connected).length;
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(DFL.PanelSection, { title: "Syncthing", children: [!state.installed && SP_JSX.jsx(DFL.Field, { label: "Syncthing is not installed in this OS image" }), SP_JSX.jsx(ToggleRow, { label: "Sync service", description: state.serviceActive ? "Running" : "Stopped", value: state.serviceEnabled && state.serviceActive, disabled: busy || !state.installed, onChange: (enabled) => void run(async () => { await setSyncServiceEnabled(enabled); await refresh(); }) }), state.myId && (SP_JSX.jsx(DFL.Field, { label: "This device ID", description: state.myId })), state.devices.length > 0 && (SP_JSX.jsx(DFL.Field, { label: "Status", description: `${connectedCount} of ${state.devices.length} device(s) connected` })), !!error && SP_JSX.jsx(DFL.Field, { label: "Error", description: error })] }), state.serviceActive && (SP_JSX.jsxs(DFL.PanelSection, { title: "Devices", children: [state.devices.map((device) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.Field, { label: `${device.name}${device.connected ? " (connected)" : ""}`, description: device.id.slice(0, 13) + "...", children: SP_JSX.jsx(DFL.DialogButton, { style: { minWidth: "90px" }, disabled: busy, onClick: () => void run(() => syncRemoveDevice(device.id)), children: "Remove" }) }) }, device.id))), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DialogButton, { disabled: busy, onClick: () => DFL.showModal(SP_JSX.jsx(AddDeviceModal, { onAdd: async (deviceId, name) => {
                                    await run(() => syncAddDevice(deviceId, name));
                                } })), children: "Add device" }) })] })), state.serviceActive && (SP_JSX.jsxs(DFL.PanelSection, { title: "Folders", children: [state.devices.length === 0 && (SP_JSX.jsx(DFL.Field, { label: "Add a device first - folders sync only to paired devices" })), state.folders.map((folder) => (SP_JSX.jsx(ToggleRow, { label: folder.label, description: folder.path.replace("/var/home/armada", "~"), value: folder.enabled, disabled: busy, onChange: (enabled) => void run(() => syncSetFolderEnabled(folder.id, enabled)) }, folder.id)))] }))] }));
}

function Content() {
    const [tab, setTab] = SP_REACT.useState("Compatibility");
    const [config, setConfig] = SP_REACT.useState(null);
    const [message, setMessage] = SP_REACT.useState("Loading");
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
    if (!config)
        return SP_JSX.jsx(DFL.PanelSection, { title: "Nebel Control", children: SP_JSX.jsx(DFL.Field, { label: message }) });
    const tabContent = (content) => (SP_JSX.jsx("div", { className: "nebel-control-tab-content", children: content }));
    return (SP_JSX.jsxs("div", { className: "nebel-control-tabs", children: [SP_JSX.jsx("style", { children: styles }), SP_JSX.jsx(DFL.Tabs, { activeTab: tab, onShowTab: setTab, tabs: [
                    { id: "Compatibility", title: tabIcons.Compatibility, content: tabContent(SP_JSX.jsx(Compatibility, { config: config, setConfig: setConfig })) },
                    { id: "Power", title: tabIcons.Power, content: tabContent(SP_JSX.jsx(Power, { config: config, setConfig: setConfig })) },
                    { id: "Display", title: tabIcons.Display, content: tabContent(SP_JSX.jsx(Display, {})) },
                    { id: "Lighting", title: tabIcons.Lighting, content: tabContent(SP_JSX.jsx(Lighting, { config: config, setConfig: setConfig })) },
                    { id: "Sync", title: tabIcons.Sync, content: tabContent(SP_JSX.jsx(Sync, {})) },
                    { id: "Advanced", title: tabIcons.Advanced, content: tabContent(SP_JSX.jsx(Settings, { config: config, setConfig: setConfig })) },
                ] })] }));
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
    return {
        name: "Nebel Control",
        content: SP_JSX.jsx(Content, {}),
        onDismount() {
            cancelled = true;
            unregisterDownloadWatcher();
        },
        icon: (SP_JSX.jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [SP_JSX.jsx("path", { d: "M14 17H5" }), SP_JSX.jsx("path", { d: "M19 7h-9" }), SP_JSX.jsx("circle", { cx: "17", cy: "17", r: "3" }), SP_JSX.jsx("circle", { cx: "7", cy: "7", r: "3" })] })),
        alwaysRender: true,
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
