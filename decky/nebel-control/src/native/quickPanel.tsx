import { ButtonItem, ErrorBoundary, Field, PanelSection, afterPatch, findInReactTree, findModuleByExport, getReactRoot } from "@decky/ui";
import { useEffect, useState } from "react";
import type { Patch } from "@decky/ui";
import { getDisplayState, restartGamescopeSession, setDisplayConfig, setStickLedEnabled, setStickLedMaxBrightness } from "../backend";
import { SelectEdit, SliderEdit, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import { titleCase, update } from "../lib/util";
import type { DisplayState } from "../types";
import { useInjectedConfig } from "./injectedConfig";

// One compact block appended to Steam's own Quick Access "Settings" panel
// (the "..." menu): just the levers worth touching mid-game - stick lighting
// on/off + brightness, the power profile, and the primary-display pick when
// an external panel is connected. Deliberately UNBRANDED (no section title,
// no "Nebel Control" anywhere): it must read as stock quick settings, not a
// plugin ad. The plugin returns no `content` to Decky (so it no longer
// clutters the Decky plugin list); this block is its QAM presence instead,
// and the fullscreen control center is reached from Settings -> System.

// Compact external-display control: only rendered while an external panel is
// actually connected; mirrors Display.tsx's primary-pick semantics (single
// output per gamescope session, portrait panels pre-select a rotation).
function QuickDisplayRows() {
  const [state, setState] = useState<DisplayState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getDisplayState().then(setState).catch(() => {});
  }, []);
  const externals = state?.connectors.filter((c) => !c.internal && c.connected) || [];
  if (!state || !externals.length) return null;
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

function QuickPanel() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) {
    return (
      <PanelSection>
        <Field label={message} />
      </PanelSection>
    );
  }
  const stickLed = config.stickLed?.supported ? config.stickLed : null;
  const profile = config.power?.general?.default_profile || "balanced";
  const profiles = Object.entries(config.power?.profiles || {}).map(([name, p]) => ({
    data: name,
    label: p.label || titleCase(name),
  }));
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
    <PanelSection>
      {stickLed && (
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
      )}
      {profiles.length > 0 && (
        <SelectEdit
          label={t("Power Profile")}
          value={profile}
          options={profiles}
          onChange={(value) => setConfig((current) => (current ? update(current, ["power", "general", "default_profile"], value) : current))}
        />
      )}
      <QuickDisplayRows />
    </PanelSection>
  );
}

const LOG = "[Nebel Control] qam-quick-panel:";
const QUICK_ACCESS_TAB_SETTINGS = 4;
const WRAPPED = "__nebelQamQuickPanel";

// Appends the block to the Quick Settings tab's panel. Two entry points:
// afterPatch on the QAM menu renderer covers Steam rebuilding the tabs array
// on a full re-render, and an install-time in-place wrap covers the array
// that is already live (the menu component does not re-render on open). The
// WRAPPED field stores the original panel, so wrapping never stacks and
// uninstall can restore it.
function wrapTabs(tabsNode: any) {
  const tabs = tabsNode?.props?.tabs;
  if (!Array.isArray(tabs)) return;
  for (const tab of tabs) {
    if (!tab || tab[WRAPPED]) continue;
    if (tab.key !== QUICK_ACCESS_TAB_SETTINGS && String(tab.key) !== String(QUICK_ACCESS_TAB_SETTINGS)) continue;
    const original = tab.panel;
    tab[WRAPPED] = original;
    tab.panel = (
      <>
        {original}
        <ErrorBoundary>
          <QuickPanel />
        </ErrorBoundary>
      </>
    );
    console.log(LOG, "quick settings panel wrapped");
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
        const target = tabs.find((tab: any) => tab && String(tab.key) === String(QUICK_ACCESS_TAB_SETTINGS));
        if (target && !target[WRAPPED]) {
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
