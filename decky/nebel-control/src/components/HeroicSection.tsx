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
import { useEffect, useRef, useState } from "react";
import { ButtonItem, DialogCheckbox, Field, PanelSection, ToggleField } from "@decky/ui";
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

export function HeroicSection({ appid, forced, onToggleForce }: { appid: string; forced: boolean; onToggleForce: (enabled: boolean) => void }) {
  const [info, setInfo] = useState<HeroicShortcutInfo | null>(null);
  const [cfg, setCfg] = useState<HeroicConfig | null>(null);
  const [versions, setVersions] = useState<HeroicVersion[]>([]);
  const [message, setMessage] = useState("");
  const [fixing, setFixing] = useState(false);
  // Auto-repair attempted for this appid - guards against a fix<->reload loop.
  const fixAttempted = useRef("");

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
    fixAttempted.current = "";
    load();
  }, [appid]);

  const fixShortcut = async (target: HeroicShortcutInfo) => {
    setFixing(true);
    try {
      const id = Number(appid);
      const apps = window.SteamClient?.Apps;
      const dir = target.launcher.substring(0, target.launcher.lastIndexOf("/") + 1);
      await apps?.SetShortcutExe?.(id, target.launcher);
      await apps?.SetShortcutStartDir?.(id, dir);
      await apps?.SetShortcutLaunchOptions?.(id, `"${target.appName}" ${target.runner}`);
      await apps?.SpecifyCompatTool?.(id, "");
      setMessage(t("Shortcut fixed - the game now launches directly, without the Heroic client"));
      await load();
    } catch {
      setMessage(t("Failed to fix shortcut"));
    }
    setFixing(false);
  };

  // heroic:// shortcuts silently die in game mode (they forward the URL to
  // any running Heroic instance and exit, so Steam thinks the game ended
  // instantly) - repair on sight instead of waiting for a click. Runs from
  // an effect so fixShortcut sees the loaded info, not a stale render scope.
  useEffect(() => {
    if (info?.style === "heroic" && fixAttempted.current !== appid) {
      fixAttempted.current = appid;
      fixShortcut(info);
    }
  }, [info, appid]);

  if (!info) return null;

  // Steam styles its own compatibility checkbox with a page-local class the
  // borrowed DialogCheckbox component doesn't get - adopt it so both rows are
  // pixel-identical (a CSS fallback in NativeStyles covers the same values).
  const [hostClass, setHostClass] = useState("");
  useEffect(() => {
    const host = document.querySelector(".DialogBody .DialogCheckbox_Container");
    if (!host) return;
    const skip = new Set(["DialogCheckbox_Container", "_DialogLayout", "Panel"]);
    setHostClass(host.className.split(/\s+/).filter((c) => c && !skip.has(c)).join(" "));
  }, []);

  const patch = async (value: Parameters<typeof setHeroicConfig>[1]) => {
    try {
      setCfg(await setHeroicConfig(info.appName, value));
    } catch {
    }
  };

  const sarekAvailable = versions.some((version) => /sarek/i.test(version.name));
  const sarekActive = /sarek/i.test(cfg?.wineVersionName || "");

  return (
    <>
      {info.style === "heroic" ? (
        <PanelSection>
          <Field
            label={t("Heroic game")}
            description={t("This shortcut goes through the Heroic client - in game mode the game may not appear on screen")}
          />
          <ButtonItem layout="below" disabled={fixing} onClick={() => fixShortcut(info)}>
            {fixing ? t("Fixing...") : t("Fix shortcut")}
          </ButtonItem>
        </PanelSection>
      ) : null}
      <DialogCheckbox
        className={hostClass || undefined}
        label={t("Force Heroic launch settings")}
        checked={forced}
        onChange={onToggleForce}
        bottomSeparator="none"
      />
      {forced ? (
        <PanelSection>
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
            <div className="nebel-compat-note">
              {t("A Sarek (legacy DXVK) build is installed - choose it for games that black-screen or report that no adapters were found")}
            </div>
          ) : null}
          {!cfg ? (
            <div className="nebel-compat-note">{t("Heroic configuration not found - launch the game once from Heroic first")}</div>
          ) : null}
          {cfg ? (
            <>
              <ToggleField label="Esync" checked={cfg.enableEsync} onChange={(value) => patch({ enableEsync: value })} />
              <ToggleField label="Fsync" checked={cfg.enableFsync} onChange={(value) => patch({ enableFsync: value })} />
              <ToggleField label="Msync" checked={cfg.enableMsync} onChange={(value) => patch({ enableMsync: value })} />
              <ToggleField label={t("WoW64 mode")} checked={cfg.enableWoW64} onChange={(value) => patch({ enableWoW64: value })} />
            </>
          ) : null}
        </PanelSection>
      ) : null}
      {message ? (
        <PanelSection>
          <Field label={message} />
        </PanelSection>
      ) : null}
    </>
  );
}
