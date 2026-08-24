import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { Fragment, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  getSystemMonitor,
  setOverlayEnabled,
  setStickLedNotify as applyStickLedNotify,
  setStickLedNotifyColor as applyStickLedNotifyColor,
} from "../backend";
import { ColorPicker } from "../components/ColorPicker";
import { Collapsible, OpenFullScreenButton, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import type { Config, SystemMonitor } from "../types";

export function Home({ config, setConfig, qam }: { config: Config; setConfig: Dispatch<SetStateAction<Config | null>>; qam?: boolean }) {
  const [mon, setMon] = useState<SystemMonitor | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await getSystemMonitor();
        if (alive) setMon(next);
      } catch {}
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  const setOverlay = async (enabled: boolean) => {
    setMon((current) => (current ? { ...current, overlayEnabled: enabled } : current));
    try {
      const applied = await setOverlayEnabled(enabled);
      setMon((current) => (current ? { ...current, overlayEnabled: applied } : current));
    } catch {
      setMon((current) => (current ? { ...current, overlayEnabled: !enabled } : current));
    }
  };
  const stickLed = config.stickLed;
  const setStickLedNotify = async (value: boolean) => {
    if (!stickLed) return;
    const previous = stickLed.notifyEnabled;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyEnabled: value } } : current));
    try {
      const applied = await applyStickLedNotify(value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyEnabled: previous } } : current));
    }
  };
  const setStickLedNotifyColor = async (hex: string) => {
    if (!stickLed) return;
    const previous = stickLed.notifyColor;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyColor: hex } } : current));
    try {
      const applied = await applyStickLedNotifyColor(hex);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, notifyColor: previous } } : current));
    }
  };
  const fmtTemp = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)} °C`);
  const batteryLine = (m: SystemMonitor) =>
    [
      m.batteryPct != null ? `${m.batteryPct}%` : "—",
      t(m.batteryStatus || "Unknown"),
      m.batteryWatts != null ? `${m.batteryWatts} W` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    <>
      {qam && <OpenFullScreenButton />}
      <PanelSection title={t("Monitor")}>
        {mon && (
          <>
            <Field label="CPU / GPU" description={`${fmtTemp(mon.cpuTemp)} / ${fmtTemp(mon.gpuTemp)}`} />
            <Field label={t("Fan")} description={mon.fanPct != null ? `${mon.fanPct}%` : "—"} />
            <Field label={t("Battery")} description={batteryLine(mon)} />
          </>
        )}
      </PanelSection>
      <PanelSection title={t("Quick toggles")}>
        <ToggleRow
          label={t("FPS overlay (all games)")}
          description={t("Shows FPS in every game, incl. non-Steam. Applies after reboot.")}
          value={!!mon?.overlayEnabled}
          onChange={setOverlay}
        />
        {stickLed?.supported && (
          <>
            <ToggleRow
              label={t("Notification flash")}
              description={t("Stick LEDs flash on notifications")}
              value={!!stickLed.notifyEnabled}
              onChange={setStickLedNotify}
            />
            {/* The flash color picker is fullscreen-only - not quick-toggle material. */}
            {!qam && stickLed.notifyEnabled && (
              <ColorPicker label={t("Flash color")} hex={stickLed.notifyColor || "33AAFF"} onChange={setStickLedNotifyColor} />
            )}
          </>
        )}
      </PanelSection>
      <PanelSection title={t("System")}>
        <Field label={t("OS Version")} description={config.osVersion || t("unknown")} />
      </PanelSection>
      {/* Static cheat-sheet of the hotkeys that actually exist on the
          console (nebel-desktop-hotkeys in Plasma, InputPlumber
          QuickAccess button/chord). No rebinding - reference only.
          Collapsed by default to keep the QAM short. */}
      <PanelSection title={t("Hotkeys")}>
        <PanelSectionRow>
          <Collapsible label={t("Show hotkeys")}>
            {HOTKEYS.map((row, index) => (
              <Fragment key={index}>
                {(index === 0 || HOTKEYS[index - 1].mode !== row.mode) && <Field label={t(row.mode)} />}
                <Field label={t(row.action)} description={row.combo} />
              </Fragment>
            ))}
          </Collapsible>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}

// Physical button names (Home/Back/D-Pad/Start/Select) stay untranslated -
// they are what is printed on the device.
const HOTKEYS: { mode: string; action: string; combo: string }[] = [
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
