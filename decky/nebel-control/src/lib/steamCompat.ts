export interface CompatTool {
  id: string;
  label: string;
}

export interface CompatState {
  tool: string;
  priority: number;
}

type CompatRoute = "windows" | "linux";

const apps = () => window.SteamClient?.Apps;
const settings = () => window.SteamClient?.Settings;

// Keep in sync with PROTON_TOOL_NAME (build) and PROTON_11_STABLE (nebel-fixups).
export const DEFAULT_WINDOWS_COMPAT_TOOL = "proton-cachyos-11.0-arm64";
// Valve's own actively-maintained catalog entry - unlike our bundled ARM64
// build, Steam can auto-download this one itself once it's selected, no
// manual fetch needed. Used as the default for "x86_64 (emulated)" mode.
export const DEFAULT_X86_64_COMPAT_TOOL = "proton_experimental";
export const USE_DEFAULT_COMPAT = "__nebel_default__";
export const FOLLOW_STEAM_COMPAT = "__steam_default__";
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
export const ARM64_MODE_THUNKS: Record<string, boolean> = {
  Vulkan: false, GL: false, EGL: false, drm: false, WaylandClient: false, asound: false,
};
export const X86_64_MODE_THUNKS: Record<string, boolean> = {
  Vulkan: true, GL: true, EGL: true, drm: true, WaylandClient: true, asound: true,
};
let windowsCompatTool = DEFAULT_WINDOWS_COMPAT_TOOL;
let autoApplyCompat = true;
const handledAppids = new Set<string>();
let protonToolsCache: CompatTool[] = [];
let protonToolsCachedAt = 0;
let protonToolsRequest: Promise<CompatTool[]> | null = null;

export function setWindowsCompatTool(toolName: string | undefined): void {
  windowsCompatTool = toolName || DEFAULT_WINDOWS_COMPAT_TOOL;
}

export function configureCompatPolicy(toolName: string | undefined, autoApply: boolean, appids: string[]): void {
  setWindowsCompatTool(toolName);
  autoApplyCompat = autoApply;
  handledAppids.clear();
  for (const appid of appids) {
    const id = String(appid);
    if (/^\d+$/.test(id)) handledAppids.add(id);
  }
}

export function setAutoApplyCompat(enabled: boolean): void {
  autoApplyCompat = enabled;
}

export function handledGameAppids(): string[] {
  return Array.from(handledAppids).sort((a, b) => Number(a) - Number(b));
}

export function markCompatHandled(appid: string): boolean {
  const size = handledAppids.size;
  handledAppids.add(appid);
  return handledAppids.size !== size;
}

function mapCompatTools(raw: any): CompatTool[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tool: any) => ({
      id: String(tool?.strToolName ?? tool?.strName ?? tool?.name ?? ""),
      label: String(tool?.strDisplayName ?? tool?.strToolName ?? tool?.strName ?? ""),
    }))
    .filter((tool: CompatTool) => tool.id);
}

export async function getProtonTools(refresh = false): Promise<CompatTool[]> {
  if (!refresh && protonToolsCache.length && Date.now() - protonToolsCachedAt < 5000) return protonToolsCache;
  if (protonToolsRequest) return protonToolsRequest;
  protonToolsRequest = (async () => {
    try {
      // Steam exposes Proton globally; per-app Linux runtimes only appear in available tools.
      const tools = mapCompatTools(await settings()?.GetGlobalCompatTools?.());
      if (tools.length) {
        protonToolsCache = tools;
        protonToolsCachedAt = Date.now();
      }
      return tools.length ? tools : protonToolsCache;
    } catch (error) {
      return protonToolsCache;
    } finally {
      protonToolsRequest = null;
    }
  })();
  return protonToolsRequest;
}

// A game's supported tools per Steam's OS filtering (Proton, plus SLR for a Linux depot); for the per-game picker.
export async function getAppCompatTools(appid: string): Promise<CompatTool[]> {
  try {
    return mapCompatTools(await apps()?.GetAvailableCompatTools?.(Number(appid)));
  } catch (error) {
    return [];
  }
}

function appDetails(appid: string): any {
  try {
    return window.appDetailsStore?.GetAppDetails?.(Number(appid)) || null;
  } catch (error) {
    return null;
  }
}

export async function resolveCompatState(appid: string): Promise<CompatState | null> {
  const details = await resolveDetails(appid);
  if (!details) return null;
  return {
    tool: String(details.strCompatToolName || ""),
    priority: Number(details.nCompatToolPriority || 0),
  };
}

export function compatSelection(state: CompatState | null): string {
  if (!state || !state.tool || state.priority < 250) return FOLLOW_STEAM_COMPAT;
  return state.tool === windowsCompatTool ? USE_DEFAULT_COMPAT : state.tool;
}

export async function specifyCompatTool(appid: string, toolName: string): Promise<void> {
  const store = apps();
  if (!store?.SpecifyCompatTool) throw new Error("Steam compatibility settings are unavailable");
  await store.SpecifyCompatTool(Number(appid), toolName);
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function requestAppDetails(appid: string): void {
  // Not in @decky/ui's type defs (incomplete); exists on the runtime store.
  try {
    (window.appDetailsStore as any)?.RequestAppDetails?.(Number(appid));
  } catch (error) {
  }
}

// Absolute path: launch options run via a shell without /usr/libexec on PATH.
const LAUNCH_WRAPPER = "/usr/libexec/nebel/nebel-game-launch";
const COMMAND_TOKEN = "%command%";

// null when already wrapped (idempotent); preserves user options around %command%.
export function wrapLaunchOptions(current: string): string | null {
  const opts = current || "";
  if (opts.includes(LAUNCH_WRAPPER)) return null;
  if (opts.includes(COMMAND_TOKEN)) {
    return opts.replace(COMMAND_TOKEN, `${LAUNCH_WRAPPER} ${COMMAND_TOKEN}`);
  }
  // No %command%: Steam appends bare options as args, so keep them after it.
  const trimmed = opts.trim();
  return trimmed
    ? `${LAUNCH_WRAPPER} ${COMMAND_TOKEN} ${trimmed}`
    : `${LAUNCH_WRAPPER} ${COMMAND_TOKEN}`;
}

async function resolveDetails(appid: string, attempts = 5): Promise<any> {
  for (let i = 0; i < attempts; i++) {
    const details = await subscribeAppDetails(appid);
    if (details) return details;
    requestAppDetails(appid);
    await delay(250);
  }
  return appDetails(appid);
}

function subscribeAppDetails(appid: string): Promise<any> {
  return waitForAppDetails(appid, () => true).promise;
}

function resolveSettledCompatDetails(appid: string): Promise<any> {
  return waitForAppDetails(appid, () => true, 1500, 250, true).promise;
}

// app_type: 1 = Game, 0x40000000 = non-Steam shortcut. Polls because overviews
// load a beat after plugin init.
const SHORTCUT_APP_TYPE = 0x40000000;
async function resolveOverviewType(appid: string): Promise<number | null> {
  for (let i = 0; i < 5; i++) {
    try {
      const type = (window as any).appStore?.GetAppOverviewByAppID?.(Number(appid))?.app_type;
      if (type != null) return type;
    } catch (error) {
    }
    await delay(1000);
  }
  return null;
}

async function resolveCompatRoute(currentTool: string): Promise<CompatRoute | null> {
  if (!currentTool) return "linux";
  const protonTools = await getProtonTools();
  if (!protonTools.length) return null;
  return protonTools.some((tool) => tool.id === currentTool) ? "windows" : "linux";
}

function waitForAppDetails(
  appid: string,
  accepts: (details: any) => boolean,
  timeoutMs = 1000,
  refreshMs = 0,
  settleEmpty = false,
): { promise: Promise<any>; cancel: () => void } {
  let cancel = () => {};
  const promise = new Promise<any>((resolve) => {
    const store = apps();
    if (!store?.RegisterForAppDetails) {
      resolve(null);
      return;
    }
    let done = false;
    let handle: any;
    let timeout: number | undefined;
    let refresh: number | undefined;
    let emptyTimer: number | undefined;
    let unregisterPending = false;
    const finish = (details: any) => {
      if (done) return;
      done = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      if (refresh !== undefined) window.clearInterval(refresh);
      if (emptyTimer !== undefined) window.clearTimeout(emptyTimer);
      if (handle) {
        try {
          handle.unregister?.();
        } catch (error) {
        }
      } else {
        unregisterPending = true;
      }
      resolve(details || null);
    };
    cancel = () => finish(null);
    const accept = (details: any) => {
      if (!details || !accepts(details)) return;
      if (!settleEmpty || String(details.strCompatToolName || "")) {
        finish(details);
      } else if (emptyTimer === undefined) {
        emptyTimer = window.setTimeout(() => finish(details), 500);
      }
    };
    try {
      handle = store.RegisterForAppDetails(Number(appid), accept);
      if (unregisterPending) handle?.unregister?.();
    } catch (error) {
      finish(null);
      return;
    }
    if (!done) {
      timeout = window.setTimeout(() => finish(null), timeoutMs);
      if (refreshMs > 0) refresh = window.setInterval(() => requestAppDetails(appid), refreshMs);
    }
  });
  return { promise, cancel };
}

async function clearCompatToolAndResolveRoute(appid: string): Promise<CompatRoute | null> {
  const waiter = waitForAppDetails(
    appid,
    (details) => Number(details.nCompatToolPriority || 0) < 250,
    5000,
    250,
    true,
  );
  try {
    await specifyCompatTool(appid, "");
  } catch (error) {
    waiter.cancel();
    return null;
  }
  requestAppDetails(appid);
  const details = await waiter.promise;
  if (!details) return null;
  return resolveCompatRoute(String(details.strCompatToolName || ""));
}

async function applyCompatDefaultForRoute(appid: string, route: CompatRoute | null): Promise<boolean> {
  if (route === null) return false;
  if (route === "linux") {
    markCompatHandled(appid);
    return true;
  }
  const protonTools = await getProtonTools();
  if (!protonTools.some((tool) => tool.id === windowsCompatTool)) return false;
  const waiter = waitForAppDetails(
    appid,
    (details) => Number(details.nCompatToolPriority || 0) >= 250
      && String(details.strCompatToolName || "") === windowsCompatTool,
    5000,
    250,
  );
  try {
    await specifyCompatTool(appid, windowsCompatTool);
  } catch (error) {
    waiter.cancel();
    return false;
  }
  requestAppDetails(appid);
  if (!(await waiter.promise)) return false;
  markCompatHandled(appid);
  return true;
}

// Wraps only a confirmed game or non-Steam shortcut (app_type 1 /
// 0x40000000), never a tool/runtime. Returns false if the overview/details
// were still cold, so the caller can retry; true once resolved.
export async function applyLaunchWrapperToGame(appid: string): Promise<boolean> {
  const type = await resolveOverviewType(appid);
  if (type === null) return false;
  if (type !== 1 && type !== SHORTCUT_APP_TYPE) return true;
  const details = await resolveDetails(appid);
  if (!details) return false;
  const next = wrapLaunchOptions(String(details.strLaunchOptions || ""));
  if (next === null) return true;
  try {
    await apps()?.SetAppLaunchOptions?.(Number(appid), next);
  } catch (error) {
  }
  return true;
}

async function applyWindowsCompatDefault(appid: string): Promise<boolean> {
  const type = await resolveOverviewType(appid);
  if (type === null) return false;
  if (type !== 1) return true;
  if (handledAppids.has(appid)) return true;
  const details = await resolveSettledCompatDetails(appid);
  if (!details) return false;
  if (!autoApplyCompat || Number(details.nCompatToolPriority || 0) >= 250) {
    markCompatHandled(appid);
    return true;
  }
  const route = await resolveCompatRoute(String(details.strCompatToolName || ""));
  return applyCompatDefaultForRoute(appid, route);
}

async function applyGamePolicy(appid: string): Promise<boolean> {
  const wrapped = await applyLaunchWrapperToGame(appid);
  const compat = await applyWindowsCompatDefault(appid);
  return wrapped && compat;
}

async function applyGamePolicyWithRetries(appid: string, onHandledChange: () => void): Promise<void> {
  const before = handledAppids.size;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await applyGamePolicy(appid)) {
      if (handledAppids.size !== before) onHandledChange();
      return;
    }
    await delay(5000);
  }
}

export async function migrateWindowsCompatTool(appids: string[], oldTool: string, newTool: string): Promise<void> {
  if (!oldTool || oldTool === newTool) return;
  const protonTools = await getProtonTools();
  if (!protonTools.some((tool) => tool.id === newTool)) return;
  setWindowsCompatTool(newTool);
  let next = 0;
  const worker = async () => {
    while (next < appids.length) {
      const appid = appids[next++];
      const type = await resolveOverviewType(appid);
      if (type !== 1) continue;
      const details = await resolveDetails(appid);
      if (!details) continue;
      if (Number(details.nCompatToolPriority || 0) < 250) continue;
      if (String(details.strCompatToolName || "") !== oldTool) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (await applyCompatDefaultForRoute(appid, "windows")) break;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
}

export async function resetCompatToolToDefault(appid: string): Promise<string> {
  const type = await resolveOverviewType(appid);
  if (type !== 1) return "";
  const route = await clearCompatToolAndResolveRoute(appid);
  const applied = await applyCompatDefaultForRoute(appid, route);
  return applied && route === "windows" ? windowsCompatTool : "";
}

export async function resetAllCompatTools(appids: string[]): Promise<void> {
  await getProtonTools(true);
  let next = 0;
  const worker = async () => {
    while (next < appids.length) {
      const appid = appids[next++];
      const type = await resolveOverviewType(appid);
      if (type !== 1) continue;
      await applyCompatDefaultForRoute(appid, await clearCompatToolAndResolveRoute(appid));
    }
  };
  await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
}

// Unknown app_type (overview not loaded yet) is treated as a game so a real game is never hidden.
export function isGameApp(appid: string): boolean {
  try {
    const type = (window as any).appStore?.GetAppOverviewByAppID?.(Number(appid))?.app_type;
    return type == null || type === 1;
  } catch (error) {
    return true;
  }
}

export async function resolveGameAppids(appids: string[]): Promise<string[]> {
  const games: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < appids.length) {
      const appid = appids[next++];
      if (await resolveOverviewType(appid) === 1) games.push(appid);
    }
  };
  await Promise.all(Array.from({ length: Math.min(10, appids.length) }, worker));
  return games;
}

// Manifests include tools/runtimes, so type-check each; cold overviews are retried across rounds, not dropped.
export async function sweepInstalledGames(appids: string[]): Promise<void> {
  const installed = new Set(appids);
  for (const appid of handledAppids) {
    if (!installed.has(appid)) handledAppids.delete(appid);
  }
  let pending = appids.filter(isGameApp);
  for (let round = 0; round < 6 && pending.length; round++) {
    if (round > 0) await delay(5000);
    const unresolved: string[] = [];
    let next = 0;
    const worker = async () => {
      while (next < pending.length) {
        const appid = pending[next++];
        if (!(await applyGamePolicy(appid))) unresolved.push(appid);
      }
    };
    await Promise.all(Array.from({ length: Math.min(10, pending.length) }, worker));
    pending = unresolved;
  }
}

export function registerDownloadWatcher(onHandledChange: () => void): () => void {
  const downloads = window.SteamClient?.Downloads;
  if (!downloads?.RegisterForDownloadItems) return () => {};
  let timer: number | undefined;
  const pending = new Set<string>();
  const flush = () => {
    timer = undefined;
    for (const appid of pending) {
      applyGamePolicyWithRetries(appid, onHandledChange);
    }
    pending.clear();
  };
  // Each queue item is { remote_client_id, item_data: [{ appid, ... }] } - the
  // appids live in the item_data entries, not on the item itself.
  const handle = downloads.RegisterForDownloadItems((_paused: boolean, items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const entries = item?.item_data;
      if (!entries || typeof entries !== "object") continue;
      for (const entry of Object.values(entries) as any[]) {
        const appid = String(entry?.appid ?? "");
        if (appid && appid !== "0" && isGameApp(appid)) pending.add(appid);
      }
    }
    if (timer === undefined) timer = window.setTimeout(flush, 1500);
  });
  return () => {
    if (timer !== undefined) window.clearTimeout(timer);
    try {
      handle?.unregister?.();
    } catch (error) {
    }
  };
}
