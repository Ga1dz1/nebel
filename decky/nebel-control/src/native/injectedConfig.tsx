import { classMap } from "@decky/ui";
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
  return <style>{styles}{nativeSpacingOverrides()}</style>;
}

// The injected blocks reuse the QuickAccessMenu-styled PanelSection inside
// Steam's full-page settings, whose own groups are spaced differently: no
// side inset (rows span the full content width and pad themselves), 24px
// margin-top between groups, plain white 36px headers instead of the QAM's
// small grey uppercase ones. These overrides (scoped to .nebel-native) make
// the duplicates line up with the host page's own sections. Steam ships
// several copies of the QAM CSS module and the hashes shift between client
// builds, so collect every module exposing the semantic keys and target all
// of them, plus the tested client's hashes as a fallback.
const QAM_CLASS_FALLBACK: Record<string, string> = {
  PanelSection: "_3gY0aBuNR8_NPTpXIYfkby",
  PanelSectionTitle: "_1IigUZ3GHaZS2Y-3V3T2rT",
};

function qamClasses(key: string): string[] {
  const found = new Set<string>([QAM_CLASS_FALLBACK[key]]);
  try {
    for (const mod of classMap as any[]) {
      const value = mod?.[key];
      if (typeof value === "string" && value) found.add(value);
    }
  } catch (error) {
  }
  return Array.from(found);
}

function nativeSpacingOverrides(): string {
  const selector = (key: string) => qamClasses(key).map((cls) => `.nebel-native .${cls}`).join(", ");
  return `
      ${selector("PanelSection")} {
        padding-left: 0;
        padding-right: 0;
        margin: 24px 0 0;
      }
      ${qamClasses("PanelSection").map((cls) => `.nebel-native .${cls}:first-of-type`).join(", ")} {
        margin: 24px 0 0;
      }
      ${selector("PanelSectionTitle")} {
        padding-bottom: 0;
        line-height: 36px;
        color: rgb(220, 222, 223);
        font-weight: 500;
        letter-spacing: normal;
        text-transform: none;
      }
    `;
}
