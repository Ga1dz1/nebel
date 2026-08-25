import { ButtonItem, DropdownItemInternal, ErrorBoundary, PanelSection, afterPatch, findInReactTree, findModuleByExport, getReactRoot } from "@decky/ui";
import { useEffect, useState } from "react";
import type { Patch } from "@decky/ui";
import { getDisplayState, restartGamescopeSession, setDisplayConfig, setStickLedEnabled, setStickLedMaxBrightness } from "../backend";
import { SelectEdit, SliderEdit, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import { MonitorRows } from "../tabs/Home";
import { titleCase, update } from "../lib/util";
import type { DisplayState } from "../types";
import { useInjectedConfig } from "./injectedConfig";

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
  const [state, setState] = useState<DisplayState | null>(null);
  useEffect(() => {
    getDisplayState().then(setState).catch(() => {});
  }, []);
  const externals = state?.connectors.filter((c) => !c.internal && c.connected) || [];
  if (!state || !externals.length) return null;
  // Own section (renders only while an external panel is connected): the
  // select + restart button don't belong inside the native toggles group.
  return (
    <PanelSection>
      <QuickDisplayRowsInner state={state} setState={setState} externals={externals} />
    </PanelSection>
  );
}

function QuickDisplayRowsInner({ state, setState, externals }: { state: DisplayState; setState: (s: DisplayState) => void; externals: DisplayState["connectors"] }) {
  const [busy, setBusy] = useState(false);
  const INTERNAL = "__internal__";
  const selectPrimary = (connector: string) => {
    setBusy(true);
    const finish = (promise: Promise<DisplayState>) =>
      promise.then(setState).catch(() => {}).finally(() => setBusy(false));
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
  return (
    <>
      <SelectEdit
        label={t("Primary Display")}
        value={state.useExternal ? state.connector : INTERNAL}
        options={[
          { data: INTERNAL, label: t("Internal Screen") },
          ...externals.map((c) => ({ data: c.connector, label: c.name ? `${c.name} (${c.connector})` : c.connector })),
        ]}
        onChange={selectPrimary}
        disabled={busy}
      />
      <ButtonItem
        layout="below"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          // A successful restart tears down this session (and Decky with it);
          // only a failure comes back here, and the button must re-enable then.
          restartGamescopeSession().catch(() => {}).finally(() => setBusy(false));
        }}
      >
        {t("Apply & Restart Game Mode")}
      </ButtonItem>
    </>
  );
}

// Stick lighting toggle + brightness, rendered WITHOUT a section wrapper:
// they are appended into the native "Other" toggles section so they sit in
// the same visual group as Wi-Fi/Bluetooth/Night mode.
function QuickLightingRows() {
  const { config, setConfig } = useInjectedConfig();
  const stickLed = config?.stickLed?.supported ? config.stickLed : null;
  if (!config || !stickLed) return null;
  // Optimistic set + immediate backend apply, rolling back on failure (same
  // pattern as the Lighting tab).
  const applyLighting = (patch: Partial<{ enabled: boolean; maxBrightness: number }>, call: () => Promise<any>) => {
    const previous = config.stickLed;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, ...patch } } : current));
    call()
      .then((applied) => setConfig((current) => (current ? { ...current, stickLed: applied } : current)))
      .catch(() => setConfig((current) => (current ? { ...current, stickLed: previous } : current)));
  };
  return (
    <>
      <ToggleRow
        label={t("Stick Lighting")}
        value={stickLed.enabled}
        onChange={(value) => applyLighting({ enabled: value }, () => setStickLedEnabled(value))}
      />
      {stickLed.enabled && !stickLed.screenLink && (
        <SliderEdit
          label={t("Max Brightness")}
          value={Math.round((stickLed.maxBrightness ?? 1) * 100)}
          min={0}
          max={100}
          step={5}
          onChange={(value) => applyLighting({ maxBrightness: value / 100 }, () => setStickLedMaxBrightness(value / 100))}
        />
      )}
    </>
  );
}

// Power-profile pick only (no editing - that stays in Settings -> Power).
// Takes the place of Steam's dead native profile dropdown in the Perf tab.
function QuickPowerProfileRow() {
  const { config, setConfig } = useInjectedConfig();
  if (!config) return null;
  const profile = config.power?.general?.default_profile || "balanced";
  const profiles = Object.entries(config.power?.profiles || {}).map(([name, p]) => ({
    data: name,
    label: p.label || titleCase(name),
  }));
  if (!profiles.length) return null;
  return (
    <SelectEdit
      label={t("Power Profile")}
      value={profile}
      options={profiles}
      onChange={(value) => setConfig((current) => (current ? update(current, ["power", "general", "default_profile"], value) : current))}
    />
  );
}

const LOG = "[Nebel Control] qam-quick-panel:";
const QUICK_ACCESS_TAB_SETTINGS = 4;
const QUICK_ACCESS_TAB_PERFORMANCE = 5;
const WRAPPED = "__nebelQamQuickPanel";
const WRAPPED_TYPE = "__nebelQamTypeWrapped";

// Steam's native Perf-tab "Performance Profile" dropdown component (the
// dead-on-this-hardware one). Found once at install time by its unique
// localization token; null means "couldn't identify" (fallback path).
let nativePerfProfileType: any = null;

// Wraps a function component type so its render output can be visited (and
// mutated) before React commits it. Cached per original type - a fresh
// wrapper per wrap would remount the subtree every time Steam rebuilds the
// tabs array. Idempotent: already-wrapped types pass through.
const wrapTypeCache = new WeakMap<any, any>();
function wrapRenderType(type: any, visit: (ret: any) => any): any {
  if (!type || typeof type !== "function" || type.prototype?.isReactComponent || type[WRAPPED_TYPE]) return type;
  const cached = wrapTypeCache.get(type);
  if (cached) return cached;
  const wrapped = (props: any) => {
    const ret = type(props);
    let extra: any = null;
    try {
      extra = visit(ret);
    } catch (error) {
      console.warn(LOG, "visit failed", error);
    }
    return extra ? (<>{ret}{extra}</>) : ret;
  };
  Object.assign(wrapped, type);
  wrapped.toString = () => type.toString();
  (wrapped as any)[WRAPPED_TYPE] = true;
  wrapTypeCache.set(type, wrapped);
  return wrapped;
}

// The Quick Settings panel (De) returns its sections as direct children of a
// Fragment. Find the native "Other" section by its localized title and
// append the lighting rows into it; if Steam ever moves/renames it, fall
// back to a small section of our own so the controls don't vanish.
function visitQuickSettings(ret: any): any {
  let merged = false;
  try {
    // Steam hands the section the raw localization TOKEN as its title (not
    // the localized string) - match both so locale never breaks the merge.
    const otherToken = "#QuickAccess_Tab_Settings_Section_Other_Title";
    const otherTitle = (window as any).LocalizationManager?.LocalizeString?.(otherToken);
    const kids = ret?.props?.children;
    const arr = Array.isArray(kids) ? kids : [kids];
    const section = arr.find((el: any) => el?.props?.title && (el.props.title === otherToken || el.props.title === otherTitle));
    if (section) {
      const sc = section.props.children;
      section.props.children = [
        ...(Array.isArray(sc) ? sc : [sc]),
        <ErrorBoundary key="nebel-lighting">
          <QuickLightingRows />
        </ErrorBoundary>,
      ];
      merged = true;
      console.log(LOG, "lighting rows merged into native Other section");
    }
  } catch (error) {
    console.warn(LOG, "quick settings merge failed", error);
  }
  if (!merged) console.log(LOG, "native Other section not found, using own panel");
  return (
    <>
      {!merged && (
        <PanelSection>
          <ErrorBoundary>
            <QuickLightingRows />
          </ErrorBoundary>
        </PanelSection>
      )}
      <ErrorBoundary>
        <QuickDisplayRows />
      </ErrorBoundary>
    </>
  );
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
  if (!config) return null;
  const profile = config.power?.general?.default_profile || "balanced";
  const profiles = Object.entries(config.power?.profiles || {}).map(([name, p]) => ({
    data: name,
    label: p.label || titleCase(name),
  }));
  if (!profiles.length) return null;
  return (
    <DropdownItemInternal
      label={t("Power Profile")}
      childrenContainerWidth="max"
      selectedOption={profile}
      rgOptions={profiles}
      onChange={(option) => setConfig((current) => (current ? update(current, ["power", "general", "default_profile"], option.data) : current))}
    />
  );
}

// Matches the native perf-profile dropdown element whether its type is the
// raw Steam component or our own wrapped copy of it. cascadeWrapTypes swaps
// element types for wrapped versions, so a strict === against
// nativePerfProfileType can never fire once the cascade has passed; the
// wrapper forwards toString to the original source, so the token survives.
const isNativePerfProfileEl = (el: any): boolean => {
  const t = el?.type;
  if (!t || !nativePerfProfileType) return false;
  if (t === nativePerfProfileType) return true;
  try {
    return typeof t.toString === "function" && t.toString().includes("PlatformPerformanceProfile_Label");
  } catch {
    return false;
  }
};

function replaceNativePerfProfile(node: any, depth: number): boolean {
  if (!node || typeof node !== "object" || depth > 8) return false;
  // Single-child case: <Row><SG/></Row> reached via props.children. The
  // monitor rows go ABOVE the profile pick (live temps/fan/battery readout
  // heads the Perf tab, the lever follows).
  if (isNativePerfProfileEl(node.props?.children)) {
    node.props.children = (
      <ErrorBoundary>
        <>
          <MonitorRows />
          <QuickPowerProfileDropdown />
        </>
      </ErrorBoundary>
    );
    return true;
  }
  const kids = node.props?.children;
  const arr = Array.isArray(kids) ? kids : kids ? [kids] : [];
  for (let i = 0; i < arr.length; i++) {
    const child = arr[i];
    if (!child || typeof child !== "object") continue;
    if (isNativePerfProfileEl(child) || isNativePerfProfileEl(child.props?.children)) {
      arr[i] = (
        <ErrorBoundary key="nebel-power">
          <MonitorRows />
          <QuickPowerProfileRow />
        </ErrorBoundary>
      );
      if (Array.isArray(kids)) node.props.children = arr;
      else node.props.children = arr[0];
      return true;
    }
    if (replaceNativePerfProfile(child, depth + 1)) return true;
  }
  return false;
}

function cascadeWrapTypes(node: any, depth: number) {
  if (!node || typeof node !== "object" || depth > 4) return;
  if (Array.isArray(node)) {
    for (const child of node) cascadeWrapTypes(child, depth);
    return;
  }
  const nextType = wrapRenderType(node.type, visitPerf);
  if (nextType !== node.type) node.type = nextType;
  cascadeWrapTypes(node.props?.children, depth + 1);
}

function visitPerf(ret: any): any {
  if (!nativePerfProfileType) {
    // Couldn't identify the native dropdown - append ours so the feature
    // isn't lost, leaving Steam's control alone.
    return (
      <PanelSection>
        <ErrorBoundary>
          <MonitorRows />
          <QuickPowerProfileRow />
        </ErrorBoundary>
      </PanelSection>
    );
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
function wrapTabs(tabsNode: any) {
  const tabs = tabsNode?.props?.tabs;
  if (!Array.isArray(tabs)) return;
  for (const tab of tabs) {
    if (!tab || tab[WRAPPED] || !tab.panel) continue;
    const key = String(tab.key);
    const visit = key === String(QUICK_ACCESS_TAB_SETTINGS) ? visitQuickSettings : key === String(QUICK_ACCESS_TAB_PERFORMANCE) ? visitPerf : null;
    if (!visit) continue;
    const original = tab.panel;
    const wrappedType = wrapRenderType(original.type, visit);
    if (wrappedType === original.type) continue;
    tab[WRAPPED] = original;
    tab.panel = { ...original, type: wrappedType };
    console.log(LOG, key === String(QUICK_ACCESS_TAB_SETTINGS) ? "quick settings panel wrapped" : "performance panel wrapped");
  }
}

function unwrapTabs() {
  try {
    const root = getReactRoot(document.getElementById("root") as any);
    const tabsNode =
      root &&
      findInReactTree(root, (n: any) => Array.isArray(n?.memoizedProps?.tabs) && n.memoizedProps.tabs[0] && "key" in n.memoizedProps.tabs[0]);
    for (const tab of tabsNode?.memoizedProps?.tabs || []) {
      if (tab?.[WRAPPED]) {
        tab.panel = tab[WRAPPED];
        delete tab[WRAPPED];
      }
    }
  } catch (error) {
  }
}

// Installs the patch; returns the uninstaller for onDismount. Never throws -
// if a Steam update moves the QAM anchors, only the quick block disappears.
export function installQamQuickPanel(): () => void {
  const patches: Patch[] = [];
  try {
    const qamModule = findModuleByExport((e: any) => e?.type?.toString?.()?.includes("QuickAccessMenuBrowserView"));
    const renderers = Object.values(qamModule || {}).filter(
      (e: any) => e?.type?.toString?.()?.includes("QuickAccessMenuBrowserView") || e?.type?.toString?.()?.includes("QuickAccessMenuEmbedded"),
    );
    if (!renderers.length) {
      console.log(LOG, "no QAM renderer export found");
      return () => {};
    }
    // Steam's native Perf-tab "Performance Profile" dropdown - identified by
    // its unique localization token (module 38747's SG export at the time of
    // writing). Null means we couldn't find it: visitPerf then appends our
    // power-profile row instead of replacing, leaving Steam's control alone.
    try {
      const perfModule = findModuleByExport(
        (e: any) => typeof e === "function" && !e.prototype?.isReactComponent && e.toString().includes("PlatformPerformanceProfile_Label"),
      );
      nativePerfProfileType =
        Object.values(perfModule || {}).find(
          (e: any) => typeof e === "function" && e.toString().includes("PlatformPerformanceProfile_Label"),
        ) || null;
      console.log(LOG, nativePerfProfileType ? "native perf profile dropdown found" : "native perf profile dropdown NOT found");
    } catch (error) {
      console.warn(LOG, "perf profile lookup failed", error);
    }
    const handler = (_args: any[], ret: any) => {
      try {
        const tabsNode = findInReactTree(ret, (x: any) => x?.props?.tabs);
        if (tabsNode) wrapTabs(tabsNode);
      } catch (error) {
        console.warn(LOG, "tab scan failed", error);
      }
      return ret;
    };
    for (const renderer of renderers) {
      try {
        patches.push(afterPatch(renderer as any, "type", handler));
      } catch (error) {
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
        const root = getReactRoot(document.getElementById("root") as any);
        const tabsNode =
          root &&
          findInReactTree(root, (n: any) => Array.isArray(n?.memoizedProps?.tabs) && n.memoizedProps.tabs[0] && "key" in n.memoizedProps.tabs[0]);
        if (!tabsNode) return;
        const tabs = tabsNode.memoizedProps.tabs;
        const needsWrap = tabs.some(
          (tab: any) =>
            tab &&
            !tab[WRAPPED] &&
            (String(tab.key) === String(QUICK_ACCESS_TAB_SETTINGS) || String(tab.key) === String(QUICK_ACCESS_TAB_PERFORMANCE)),
        );
        if (needsWrap) {
          console.log(LOG, "tabs array rebuilt by Steam, re-wrapping");
          wrapTabs({ props: { tabs } });
        }
      } catch (error) {
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
        } catch (error) {
        }
      }
      unwrapTabs();
    };
  } catch (error) {
    console.warn(LOG, "install failed", error);
  }
  return () => {
    for (const patch of patches) {
      try {
        patch.unpatch();
      } catch (error) {
      }
    }
    unwrapTabs();
  };
}
