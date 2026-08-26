// Per-game "Heroic" block for the Compatibility page.
//
// Shows up only for shortcuts that launch through Heroic. Two jobs:
//  1. Repair Heroic's own `heroic --no-gui heroic://launch...` shortcuts:
//     with any Heroic instance already running that form just forwards the
//     URL and exits, so Steam thinks the game died instantly and gamescope
//     never shows its window. We repoint the shortcut at nebel-heroic-launch,
//     a foreground wrapper Steam can track.
//  2. Edit the game's Heroic settings (Proton/Wine build, sync primitives)
//     in place - nebel-heroic-launch reads this very config at launch time,
//     so changes apply on the next start.
import { useEffect, useState } from "react";
import { ButtonItem, Field, PanelSection, ToggleField } from "@decky/ui";
import {
  HeroicConfig,
  HeroicShortcutInfo,
  HeroicVersion,
  getHeroicConfig,
  heroicShortcut,
  listHeroicVersions,
  setHeroicConfig,
} from "../backend";
import { t } from "../i18n";
import { SelectEdit } from "./widgets";

export function HeroicSection({ appid }: { appid: string }) {
  const [info, setInfo] = useState<HeroicShortcutInfo | null>(null);
  const [cfg, setCfg] = useState<HeroicConfig | null>(null);
  const [versions, setVersions] = useState<HeroicVersion[]>([]);
  const [message, setMessage] = useState("");
  const [fixing, setFixing] = useState(false);

  const load = async () => {
    try {
      const next = await heroicShortcut(appid);
      setInfo(next);
      if (next) {
        setCfg(await getHeroicConfig(next.appName));
        setVersions(await listHeroicVersions());
      }
    } catch {
      setInfo(null);
    }
  };
  useEffect(() => {
    setInfo(null);
    setCfg(null);
    setMessage("");
    load();
  }, [appid]);

  if (!info) return null;

  const fixShortcut = async () => {
    setFixing(true);
    try {
      const id = Number(appid);
      const apps = window.SteamClient?.Apps;
      const dir = info.launcher.substring(0, info.launcher.lastIndexOf("/") + 1);
      await apps?.SetShortcutExe?.(id, info.launcher);
      await apps?.SetShortcutStartDir?.(id, dir);
      await apps?.SetShortcutLaunchOptions?.(id, `"${info.appName}" ${info.runner}`);
      await apps?.SpecifyCompatTool?.(id, "");
      setMessage(t("Shortcut fixed - the game now launches directly, without the Heroic client"));
      await load();
    } catch {
      setMessage(t("Failed to fix shortcut"));
    }
    setFixing(false);
  };

  const patch = async (value: Parameters<typeof setHeroicConfig>[1]) => {
    try {
      setCfg(await setHeroicConfig(info.appName, value));
    } catch {
    }
  };

  const sarekAvailable = versions.some((version) => /sarek/i.test(version.name));
  const sarekActive = /sarek/i.test(cfg?.wineVersionName || "");

  return (
    <PanelSection title="Heroic">
      {info.style === "heroic" ? (
        <>
          <Field
            label={t("Heroic game")}
            description={t("This shortcut goes through the Heroic client - in game mode the game may not appear on screen")}
          />
          <ButtonItem layout="below" disabled={fixing} onClick={fixShortcut}>
            {fixing ? t("Fixing...") : t("Fix shortcut")}
          </ButtonItem>
        </>
      ) : null}
      {cfg && versions.length > 0 ? (
        <SelectEdit
          label={t("Proton/Wine build (Heroic)")}
          value={cfg.wineVersionBin}
          options={versions.map((version) => ({ data: version.bin, label: version.name }))}
          onChange={(bin) => {
            const version = versions.find((entry) => entry.bin === bin);
            if (version) patch({ wineVersion: { bin: version.bin, name: version.name, type: version.type } });
          }}
        />
      ) : null}
      {sarekAvailable && !sarekActive ? (
        <Field
          label=""
          description={t("A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found")}
        />
      ) : null}
      {cfg ? (
        <>
          <ToggleField label="Esync" checked={cfg.enableEsync} onChange={(value) => patch({ enableEsync: value })} />
          <ToggleField label="Fsync" checked={cfg.enableFsync} onChange={(value) => patch({ enableFsync: value })} />
          <ToggleField label="Msync" checked={cfg.enableMsync} onChange={(value) => patch({ enableMsync: value })} />
          <ToggleField label={t("WoW64 mode")} checked={cfg.enableWoW64} onChange={(value) => patch({ enableWoW64: value })} />
        </>
      ) : null}
      {message ? <Field label={message} /> : null}
    </PanelSection>
  );
}
