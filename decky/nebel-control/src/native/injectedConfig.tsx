import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getConfig, getInstalledGames, savePowerConfig, saveTweaks } from "../backend";
import { useDebouncedSave } from "../hooks/useDebouncedSave";
import { t } from "../i18n";
import { styles } from "../styles";
import type { Config } from "../types";

// Config source for the sections injected into Steam's native settings pages.
// This mirrors Content.tsx's usePluginConfig (same backend calls, same
// debounced whole-object saves for `power` and `tweaks`), but is standalone:
// each injected page holds its own copy, the python backend stays the single
// source of truth. The running-game polling of the QAM/fullpage variant is
// intentionally left out - the injected sections never target "whatever is
// running", only fixed appids or device-wide settings.
export function useInjectedConfig(): { config: Config | null; setConfig: Dispatch<SetStateAction<Config | null>>; message: string } {
  const [config, setConfig] = useState<Config | null>(null);
  const [message, setMessage] = useState(t("Loading"));
  const savedPowerSnapshot = useRef("");
  const savedTweaksSnapshot = useRef("");
  const installedGamesRequested = useRef(false);
  const load = useCallback(async () => {
    try {
      const next = await getConfig();
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
  useDebouncedSave({ config, field: "power", snapshot: savedPowerSnapshot, save: savePowerConfig, setConfig, onError: load });
  useDebouncedSave({ config, field: "tweaks", snapshot: savedTweaksSnapshot, save: saveTweaks, setConfig, onError: load });
  return { config, setConfig, message };
}

// The injected sections live inside Steam's own settings tree, outside
// nebel-control-root, so the plugin stylesheet has to come along - otherwise
// the shared widgets (slider rows, swatch grid, notes) render unstyled.
export function NativeStyles() {
  return <style>{styles}</style>;
}
