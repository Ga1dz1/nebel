import { ButtonItem, PanelSection } from "@decky/ui";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { SelectEdit, SliderEdit } from "../components/widgets";
import { t } from "../i18n";
import { clone, titleCase, update } from "../lib/util";
import type { Config, PowerProfile } from "../types";

const underclocks = [
  { data: "none", label: t("None") },
  { data: "small", label: t("Small") },
  { data: "medium", label: t("Medium") },
  { data: "large", label: t("Large") },
];

export function Power({ config, setConfig }: { config: Config; setConfig: Dispatch<SetStateAction<Config | null>> }) {
  const [profile, setProfile] = useState(config.power.general.default_profile || "balanced");
  const p = config.power.profiles[profile] || ({} as PowerProfile);
  const profiles = Object.entries(config.power.profiles || {}).map(([name, profile]) => ({
    data: name,
    label: profile.label || titleCase(name),
  }));
  const fanCurves = Object.entries(config.power.fan_curves || {}).map(([name, curve]) => ({
    data: name,
    label: curve.label || titleCase(name),
  }));
  const setProfileValue = (name: string, value: any) => {
    setConfig((current) => (current ? update(current, ["power", "profiles", profile, name], value) : current));
  };
  const setGpuValue = (name: string, value: any) => {
    setConfig((current) => {
      if (!current) return current;
      const next = clone(current);
      const target: any = next.power.profiles[profile];
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
    if (!defaults) return;
    setConfig((current) => (current ? update(current, ["power", "profiles", profile], defaults) : current));
  };
  const underclockLevel = p.cpu_underclock || "";
  const supportsUnderclockPresets = !!config.power.underclocks?.[config.cpuDeviceClass];
  return (
    <>
      <PanelSection title={t("EDIT POWER PROFILE")}>
        <SelectEdit value={profile} options={profiles} onChange={setProfile} />
      </PanelSection>
      <PanelSection title={t("PROFILE SETTINGS")}>
        <SelectEdit label={t("Fan Curve")} value={p.fan_curve} options={fanCurves} onChange={(v) => setProfileValue("fan_curve", v)} />
        {supportsUnderclockPresets ? (
          <SelectEdit label={t("CPU Underclock")} value={underclockLevel} options={underclocks} onChange={(v) => setProfileValue("cpu_underclock", v)} />
        ) : (
          <SliderEdit label={t("CPU Max (%)")} value={Math.round(Number(p.cpu_max || 0) * 100)} min={35} max={100} step={1} onChange={(v) => setProfileValue("cpu_max", (v / 100).toFixed(2))} />
        )}
        <SliderEdit label={t("GPU Min (%)")} value={Math.round(Number(p.gpu_min || 0) * 100)} min={0} max={100} step={1} onChange={(v) => setGpuValue("gpu_min", (v / 100).toFixed(2))} />
        <SliderEdit label={t("GPU Max (%)")} value={Math.round(Number(p.gpu_max || 0) * 100)} min={35} max={100} step={1} onChange={(v) => setGpuValue("gpu_max", (v / 100).toFixed(2))} />
        <div className="nebel-reset-row">
          <ButtonItem layout="below" onClick={resetProfile}>{t("Reset to Default")}</ButtonItem>
        </div>
      </PanelSection>
    </>
  );
}
