import { ButtonItem, PanelSection, PanelSectionRow, TextField } from "@decky/ui";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { setControllerType as applyControllerType, setSharedStorageEnabled as applySharedStorageEnabled, setSshEnabled as applySshEnabled, clearSupporterKey, getSupporterState, setSupporterKey } from "../backend";
import type { SupporterState } from "../backend";
import { openCalibration } from "../components/Calibration";
import { OpenFullScreenButton, SelectEdit, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import type { Config } from "../types";

export function ControllerExtras({ config, setConfig, showEmulation = true }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  showEmulation?: boolean;
}) {
  const setControllerType = async (value: string) => {
    const previous = config.controllerType || "deck-uhid";
    setConfig((current) => (current ? { ...current, controllerType: value } : current));
    try {
      const applied = await applyControllerType(value);
      setConfig((current) => (current ? { ...current, controllerType: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, controllerType: previous } : current));
    }
  };
  return (
    <PanelSection title={t("Controller")}>
      {showEmulation && (
        <SelectEdit
          label={t("Emulation")}
          value={config.controllerType || "deck-uhid"}
          options={config.controllerTypes || []}
          onChange={setControllerType}
        />
      )}
      <ButtonItem layout="below" onClick={openCalibration}>{t("Launch Calibration")}</ButtonItem>
    </PanelSection>
  );
}

export function SshRow({ config, setConfig }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
}) {
  const setSshEnabled = async (enabled: boolean) => {
    if (enabled === !!config.sshEnabled) {
      return;
    }
    setConfig((current) => (current ? { ...current, sshEnabled: enabled } : current));
    try {
      const applied = await applySshEnabled(enabled);
      setConfig((current) => (current ? { ...current, sshEnabled: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, sshEnabled: !enabled } : current));
    }
  };
  return <ToggleRow label={t("Enable SSH")} value={!!config.sshEnabled} onChange={setSshEnabled} />;
}

export function SharedStorageRow({ config, setConfig }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
}) {
  const setSharedStorageEnabled = async (enabled: boolean) => {
    if (enabled === !!config.sharedStorageEnabled) {
      return;
    }
    setConfig((current) => (current ? { ...current, sharedStorageEnabled: enabled } : current));
    try {
      const applied = await applySharedStorageEnabled(enabled);
      setConfig((current) => (current ? { ...current, sharedStorageEnabled: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, sharedStorageEnabled: !enabled } : current));
    }
  };
  return (
    <ToggleRow
      label={t("Mount shared storage")}
      description={t("Mount NEBEL_SHARED partition at ~/Shared")}
      value={!!config.sharedStorageEnabled}
      onChange={setSharedStorageEnabled}
    />
  );
}

export function SupporterKeySection() {
  const [state, setState] = useState<SupporterState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSupporterState().then(setState).catch(() => {});
  }, []);

  const apply = async () => {
    if (!draft.trim()) {
      return;
    }
    setBusy(true);
    try {
      const next = await setSupporterKey(draft);
      setState(next);
      setDraft("");
      setMessage(
        next.unlocked
          ? t("Key accepted - beta and preview update channels unlocked")
          : t("Key saved, but it is not on the supporter list yet (check again tomorrow)")
      );
    } catch (error) {
      setMessage(t("Invalid key format (expected nbl-xxxx-xxxx-xxxx)"));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      setState(await clearSupporterKey());
      setMessage("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection title={t("Supporter Key")}>
      {state?.unlocked ? (
        <>
          <PanelSectionRow>
            <div>{t("Early access active")} · {state.masked}</div>
          </PanelSectionRow>
          <ButtonItem layout="below" onClick={clear} disabled={busy}>{t("Remove key")}</ButtonItem>
        </>
      ) : (
        <>
          <PanelSectionRow>
            <TextField
              label={t("Supporter key")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </PanelSectionRow>
          <ButtonItem layout="below" onClick={apply} disabled={busy || !draft.trim()}>{t("Apply")}</ButtonItem>
        </>
      )}
      {message && (
        <PanelSectionRow>
          <div>{message}</div>
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <div style={{ opacity: 0.7, fontSize: "12px" }}>
          {t("Unlocks the beta and preview update channels. Keys come with Patreon support - the stable channel stays free for everyone.")}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}

export function SystemExtras({ config, setConfig, showStorage = true }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  showStorage?: boolean;
}) {
  return (
    <PanelSection title={t("System")}>
      <SshRow config={config} setConfig={setConfig} />
      {showStorage && <SharedStorageRow config={config} setConfig={setConfig} />}
      {showStorage && <SupporterKeySection />}
    </PanelSection>
  );
}

export function System({ config, setConfig, qam }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  qam?: boolean;
}) {
  return (
    <>
      <ControllerExtras config={config} setConfig={setConfig} showEmulation={!qam} />
      <SystemExtras config={config} setConfig={setConfig} showStorage={!qam} />
      {qam && <OpenFullScreenButton />}
    </>
  );
}
