import { ButtonItem, Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  getSystemMonitor,
  setOverlayEnabled,
  setStickLedNotify as applyStickLedNotify,
  setStickLedNotifyColor as applyStickLedNotifyColor,
} from "../backend";
import { ColorPicker } from "../components/ColorPicker";
import { OpenFullScreenButton, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import { showSteamKeyboard } from "../lib/osk";
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
      {/* Game mode has no working Guide+X OSK chord for third-party
          controllers, so give the keyboard a visible entry point too.
          Rendered in QAM as well - that is where it is needed most. */}
      <PanelSection title={t("Keyboard")}>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => showSteamKeyboard()}>
            {t("On-screen keyboard")}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}
