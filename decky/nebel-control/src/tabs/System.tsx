import { ButtonItem, PanelSection } from "@decky/ui";
import type { Dispatch, SetStateAction } from "react";
import { setControllerType as applyControllerType, setSharedStorageEnabled as applySharedStorageEnabled, setSshEnabled as applySshEnabled } from "../backend";
import { openCalibration } from "../components/Calibration";
import { SelectEdit, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import type { Config } from "../types";

export function System({ config, setConfig }: {
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
    <>
      <PanelSection title={t("Controller")}>
        <SelectEdit
          label={t("Emulation")}
          value={config.controllerType || "deck-uhid"}
          options={config.controllerTypes || []}
          onChange={setControllerType}
        />
        <ButtonItem layout="below" onClick={openCalibration}>{t("Launch Calibration")}</ButtonItem>
      </PanelSection>
      <PanelSection title={t("System")}>
        <ToggleRow label={t("Enable SSH")} value={!!config.sshEnabled} onChange={setSshEnabled} />
        <ToggleRow
          label={t("Mount shared storage")}
          description={t("Mount NEBEL_SHARED partition at ~/Shared")}
          value={!!config.sharedStorageEnabled}
          onChange={setSharedStorageEnabled}
        />
      </PanelSection>
    </>
  );
}
