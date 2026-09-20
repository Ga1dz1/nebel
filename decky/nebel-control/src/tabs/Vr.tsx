import { ButtonItem, PanelSection } from "@decky/ui";
import { useEffect, useState } from "react";
import { getScxState, getVrState, setScxEnabled, setVrEnabled } from "../backend";
import { ToggleRow } from "../components/widgets";
import { t } from "../i18n";

// VR / Cinema tab (1.4.4). Backend: py_modules/nebel_control/vr.py +
// privileged nebel-control actions (scx). All toggles are opt-in and
// survive OTA: wivrn as a user unit, nebel-scx as a system unit.
export function Vr(_props: { qam?: boolean }) {
  const [vr, setVr] = useState<{ installed: boolean; enabled: boolean; active: boolean; dashboard: boolean; error?: string } | null>(null);
  const [scx, setScx] = useState<{ available: boolean; enabled: boolean; active: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVrState().then((s) => { if (!cancelled) setVr(s); }).catch(() => {});
    getScxState().then((s) => { if (!cancelled) setScx(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const toggleVr = async (value: boolean) => {
    setBusy(true);
    try {
      setVr(await setVrEnabled(value));
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const toggleScx = async (value: boolean) => {
    setBusy(true);
    try {
      setScx(await setScxEnabled(value));
    } catch {
    } finally {
      setBusy(false);
    }
  };

  if (vr && !vr.installed) {
    return (
      <PanelSection title={t("VR & Cinema")}>
        <div>{t("WiVRn is not installed on this system image.")}</div>
      </PanelSection>
    );
  }

  return (
    <>
      <PanelSection title={t("VR & Cinema")}>
        <ToggleRow
          label={t("VR server (WiVRn)")}
          description={t("Stream games and the desktop to a headset (Quest 3, etc.) over Wi-Fi. When a headset connects, it gets its own virtual screen.")}
          value={!!vr?.enabled}
          disabled={busy}
          onChange={toggleVr}
        />
        {vr?.enabled && (
          <div style={{ padding: "4px 0", opacity: 0.8 }}>
            {vr.active
              ? t("Status: running — connect the headset over the same Wi-Fi network and accept pairing.")
              : t("Status: enabled, not running yet. It starts with the gaming session.")}
          </div>
        )}
      </PanelSection>
      <PanelSection title={t("CPU Scheduler (experimental)")}>
        <ToggleRow
          label={t("scx_lavd gaming scheduler")}
          description={t("sched-ext BPF scheduler for frame pacing (opt-in). Off by default — enable only for A/B testing, disable immediately if anything feels wrong.")}
          value={!!scx?.enabled}
          disabled={busy || (scx ? !scx.available && !scx.enabled : true)}
          onChange={toggleScx}
        />
        {scx && !scx.available && (
          <div style={{ padding: "4px 0", opacity: 0.8 }}>
            {t("scx_lavd binary not installed (scx-scheds package) — toggle will take effect once it ships.")}
          </div>
        )}
        {scx?.enabled && (
          <div style={{ padding: "4px 0", opacity: 0.8 }}>
            {scx.active ? t("Status: active") : t("Status: enabled, not active (binary missing?)")}
          </div>
        )}
        {scx?.enabled && (
          <div className="nebel-reset-row">
            <ButtonItem layout="below" disabled={busy} onClick={() => toggleScx(false)}>{t("Disable scx_lavd")}</ButtonItem>
          </div>
        )}
      </PanelSection>
    </>
  );
}
