import { Field, Focusable, PanelSection, Tabs } from "@decky/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { getConfig, getInstalledGames, savePowerConfig, saveTweaks } from "./backend";
import { useDebouncedSave } from "./hooks/useDebouncedSave";
import { t } from "./i18n";
import { tabIcons } from "./icons";
import { currentGame } from "./lib/games";
import { styles } from "./styles";
import { Display } from "./tabs/Display";
import { Games } from "./tabs/Games";
import { Home } from "./tabs/Home";
import { Lighting } from "./tabs/Lighting";
import { Power } from "./tabs/Power";
import { Sync } from "./tabs/Sync";
import { System } from "./tabs/System";
import type { Config } from "./types";

type SetConfig = Dispatch<SetStateAction<Config | null>>;

interface PluginTab {
  id: string;
  icon: ReactNode;
  label: string;
  content: ReactNode;
}

function usePluginConfig(): { config: Config | null; setConfig: SetConfig; message: string } {
  const [config, setConfig] = useState<Config | null>(null);
  const [message, setMessage] = useState(t("Loading"));
  const savedPowerSnapshot = useRef("");
  const savedTweaksSnapshot = useRef("");
  const installedGamesRequested = useRef(false);
  const load = useCallback(async () => {
    try {
      const next = await getConfig();
      next.game = currentGame();
      next.selectedGame = next.game || null;
      savedPowerSnapshot.current = JSON.stringify(next.power);
      savedTweaksSnapshot.current = JSON.stringify(next.tweaks);
      setConfig((current) => ({ ...next, installedGames: current?.installedGames || next.installedGames }));
    } catch (error) {
      setMessage(String(error));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!config || installedGamesRequested.current) return;
    installedGamesRequested.current = true;
    let cancelled = false;
    getInstalledGames()
      .then((installedGames) => {
        if (cancelled) return;
        setConfig((current) => (current ? { ...current, installedGames } : current));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [!!config]);
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    const refreshRuntime = async () => {
      try {
        const runtimeGame = currentGame();
        if (cancelled) return;
        setConfig((current) => {
          if (!current) return current;
          const currentApp = current.game?.appid || "";
          const nextApp = runtimeGame?.appid || "";
          const currentName = current.game?.name || "";
          const nextName = runtimeGame?.name || "";
          if (currentApp === nextApp && currentName === nextName) return current;
          return { ...current, game: runtimeGame };
        });
      } catch (error) {
      }
    };
    const timer = window.setInterval(refreshRuntime, 2000);
    refreshRuntime();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [!!config]);
  useDebouncedSave({ config, field: "power", snapshot: savedPowerSnapshot, save: savePowerConfig, setConfig, onError: load });
  useDebouncedSave({ config, field: "tweaks", snapshot: savedTweaksSnapshot, save: saveTweaks, setConfig, onError: load });
  return { config, setConfig, message };
}

// One tab model feeds both surfaces: the QAM Tabs bar and the fullscreen
// page sidebar. `qam` switches each tab to its simplified subset (full
// controls live on the fullscreen page).
function buildTabs(config: Config, setConfig: SetConfig, qam: boolean): PluginTab[] {
  return [
    { id: "Home", icon: tabIcons.Home, label: t("TabHome"), content: <Home config={config} setConfig={setConfig} qam={qam} /> },
    { id: "Games", icon: tabIcons.Games, label: t("TabGames"), content: <Games config={config} setConfig={setConfig} qam={qam} /> },
    { id: "Display", icon: tabIcons.Display, label: t("TabDisplay"), content: <Display qam={qam} /> },
    { id: "Power", icon: tabIcons.Power, label: t("TabPower"), content: <Power config={config} setConfig={setConfig} qam={qam} /> },
    { id: "Lighting", icon: tabIcons.Lighting, label: t("TabLighting"), content: <Lighting config={config} setConfig={setConfig} qam={qam} /> },
    { id: "Sync", icon: tabIcons.Sync, label: t("TabSync"), content: <Sync qam={qam} /> },
    { id: "System", icon: tabIcons.System, label: t("TabSystem"), content: <System config={config} setConfig={setConfig} qam={qam} /> },
  ];
}

const tabTitle = (icon: ReactNode, label: string) => (
  <div className="nc-tab-title">{icon}<span>{label}</span></div>
);

// The QAM keeps the tab bar with all 7 tabs, each showing its simplified
// subset; the fullscreen /nebel-control page has the full controls.
export function Content() {
  const { config, setConfig, message } = usePluginConfig();
  const [tab, setTab] = useState("Home");
  if (!config) return <PanelSection title="Nebel Control"><Field label={message} /></PanelSection>;
  return (
    <div className="nebel-control-tabs nebel-control-root">
      <style>{styles}</style>
      <Tabs
        activeTab={tab}
        onShowTab={setTab}
        tabs={buildTabs(config, setConfig, true).map((pluginTab) => ({
          id: pluginTab.id,
          title: tabTitle(pluginTab.icon, pluginTab.label),
          content: <div className="nebel-control-tab-content">{pluginTab.content}</div>,
        }))}
      />
    </div>
  );
}

// Fullscreen variant registered as the /nebel-control route: Steam-settings-
// style layout with a vertical tab list on the left and content on the right.
// Steam's global back (B button) pops the route, so no back affordance here.
export function FullPage() {
  const { config, setConfig, message } = usePluginConfig();
  const [tab, setTab] = useState("Home");
  const pageShell = (content: ReactNode) => (
    <div className="nebel-control-page nebel-control-root">
      <style>{styles}</style>
      {content}
    </div>
  );
  if (!config) {
    return pageShell(
      <div className="nc-page-content">
        <div className="nc-page-content-inner">
          <PanelSection title="Nebel Control"><Field label={message} /></PanelSection>
        </div>
      </div>,
    );
  }
  const tabs = buildTabs(config, setConfig, false);
  const active = tabs.find((candidate) => candidate.id === tab) || tabs[0];
  return pageShell(
    <>
      <div className="nc-page-sidebar">
        {tabs.map((candidate) => (
          <Focusable
            key={candidate.id}
            className={`nc-page-tab${candidate.id === active.id ? " nc-active" : ""}`}
            onActivate={() => setTab(candidate.id)}
            onClick={() => setTab(candidate.id)}
          >
            {candidate.icon}
            <span>{candidate.label}</span>
          </Focusable>
        ))}
      </div>
      <div className="nc-page-content">
        <div className="nc-page-content-inner">{active.content}</div>
      </div>
    </>,
  );
}
