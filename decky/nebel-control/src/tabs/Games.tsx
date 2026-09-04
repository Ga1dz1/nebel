import {
  ButtonItem,
  DialogBody,
  DialogButton,
  DialogFooter,
  Field,
  ModalRoot,
  PanelSection,
  TextField,
  ToggleField,
  showModal,
} from "@decky/ui";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { saveCompatApplied, listDir, getDepsStatus, getLsfgAvailability, installDeps } from "../backend";
import type { DepsStatus, DirListing, LsfgAvailability } from "../backend";
import { Collapsible, OpenFullScreenButton, SelectEdit } from "../components/widgets";
import { HeroicSection } from "../components/HeroicSection";
import { t } from "../i18n";
import { getGlobalResolution, setGlobalResolution } from "../lib/steamSettings";
import { clone } from "../lib/util";
import { availableGames, editTargetOptions, gameRefFromAppid } from "../lib/games";
import {
  ARM64_MODE_THUNKS,
  DEFAULT_WINDOWS_COMPAT_TOOL,
  DEFAULT_X86_64_COMPAT_TOOL,
  FOLLOW_STEAM_COMPAT,
  USE_DEFAULT_COMPAT,
  X86_64_MODE_THUNKS,
  applyLaunchWrapperToGame,
  compatSelection,
  getAppCompatTools,
  getProtonTools,
  handledGameAppids,
  markCompatHandled,
  migrateWindowsCompatTool,
  resetCompatToolToDefault,
  resetAllCompatTools,
  resolveCompatState,
  resolveGameAppids,
  setAutoApplyCompat,
  setWindowsCompatTool,
  specifyCompatTool,
} from "../lib/steamCompat";
import type { CompatTool } from "../lib/steamCompat";
import type { Config } from "../types";

const resolutionOptions = [
  { data: "Default", label: t("Default") },
  { data: "Native", label: t("Native") },
  { data: "1280x720", label: "1280x720" },
  { data: "960x540", label: "960x540" },
];
const compatModeOptions = [
  { data: "arm64", label: t("ARM64 (native, recommended)") },
  { data: "x86_64", label: t("x86_64 (emulated via FEX)") },
];
const perGameModeOptions = [
  { data: FOLLOW_STEAM_COMPAT, label: t("Follow Steam") },
  ...compatModeOptions,
];
const gameEraOptions = [
  { data: "", label: t("Modern (Windows 10/11)") },
  { data: "xp", label: t("Old-school (Windows XP)") },
];
const windowsVersionOptions = [
  { data: "auto", label: t("Auto") },
  { data: "win10", label: t("Windows 10/11 (default)") },
  { data: "winxp", label: "Windows XP" },
];
const legacyRendererOptions = [
  { data: "auto", label: t("Auto (on for XP era)") },
  { data: "on", label: t("WineD3D (DirectX 1-7)") },
  { data: "off", label: t("DXVK (DirectX 8+)") },
];
const virtualDesktopOptions = [
  { data: "", label: t("Off") },
  { data: "640x480", label: "640x480" },
  { data: "800x600", label: "800x600" },
  { data: "1024x768", label: "1024x768" },
];
const memoryLimitOptions = [
  { data: "0", label: t("Off") },
  { data: "256", label: "256 MB" },
  { data: "512", label: "512 MB" },
  { data: "1024", label: "1 GB" },
  { data: "2048", label: "2 GB" },
];
const gpuSpoofOptions = [
  { data: "", label: t("Default") },
  { data: "steamdeck", label: "Steam Deck (AMD VanGogh)" },
  { data: "gtx1060", label: "NVIDIA GeForce GTX 1060" },
  { data: "rx580", label: "AMD Radeon RX 580" },
];
const dxvkVersionOptions = [
  { data: "", label: t("Default (Proton's built-in)") },
  { data: "dxvk-2.7.1", label: "DXVK 2.7.1" },
  { data: "dxvk-sarek", label: "DXVK-Sarek" },
  { data: "dxvk-async-1.10.3", label: "DXVK-async 1.10.3" },
];
const vkd3dVersionOptions = [
  { data: "", label: t("Default (Proton's built-in)") },
  { data: "vkd3d-3.0.1", label: "VKD3D-Proton 3.0.1" },
  { data: "vkd3d-3.0", label: "VKD3D-Proton 3.0" },
  { data: "vkd3d-2.14.1", label: "VKD3D-Proton 2.14.1" },
];
const DEPENDENCY_VERBS = [
  { id: "d3dx9", label: "DirectX 9 Runtime" },
  { id: "d3dx10", label: "DirectX 10 Runtime" },
  { id: "d3dx11_43", label: "DirectX 11 Runtime" },
  { id: "d3dcompiler_47", label: "D3D Compiler 47 (DirectX 11.1/12)" },
  { id: "xact", label: "XAudio2 (XACT)" },
  { id: "physx", label: "NVIDIA PhysX" },
  { id: "vcrun2005", label: "Visual C++ 2005" },
  { id: "vcrun2008", label: "Visual C++ 2008" },
  { id: "vcrun2010", label: "Visual C++ 2010" },
  { id: "vcrun2012", label: "Visual C++ 2012" },
  { id: "vcrun2013", label: "Visual C++ 2013" },
  { id: "vcrun2022", label: "Visual C++ 2015-2022" },
  { id: "dotnet35", label: t(".NET 3.5 (slow)") },
  { id: "dotnet40", label: ".NET 4.0" },
  { id: "dotnet48", label: t(".NET 4.8 (slow)") },
  { id: "xna40", label: "XNA Framework 4.0" },
  { id: "flash", label: "Flash Player" },
];
const RECOMMENDED_XP_DEPS = ["d3dx9", "vcrun2005"];
// SM8250's cpu0-3 are the 1.8GHz LITTLE cluster, cpu4-7 the 2.4-2.84GHz
// big+prime cluster - same split ROCKNIX's own SM8250 profile uses.
const cpuAffinityOptions = [
  { data: "", label: t("Default (any core)") },
  { data: "big", label: t("Big cores only (cpu4-7)") },
  { data: "little", label: t("Little cores only (cpu0-3)") },
  { data: "one", label: t("Single core (cpu4)") },
  { data: "two", label: t("Two cores (cpu4-5)") },
];
const powerProfileOptions = [
  { data: "", label: t("Default") },
  { data: "eco", label: "Eco" },
  { data: "balanced", label: "Balanced" },
  { data: "performance", label: "Performance" },
];
const lsfgMultiplierOptions = [
  { data: "2", label: "x2" },
  { data: "3", label: "x3" },
  { data: "4", label: "x4" },
];
const fexKnobs = [
  { key: "TSOEnabled", label: "TSO Enabled" },
  { key: "X87ReducedPrecision", label: "X87 Reduced Precision" },
  { key: "Multiblock", label: "Multiblock" },
  { key: "VectorTSOEnabled", label: "Vector TSO Enabled" },
  { key: "MemcpySetTSOEnabled", label: "Memcpy Set TSO Enabled" },
  { key: "HalfBarrierTSOEnabled", label: "Half Barrier TSO Enabled" },
];
const thunkModules = [
  { module: "Vulkan", label: "Host Vulkan" },
  { module: "GL", label: "Host OpenGL" },
  { module: "EGL", label: "Host EGL" },
  { module: "asound", label: "Host ALSA" },
  { module: "drm", label: "Host DRM" },
  { module: "WaylandClient", label: "Host Wayland" },
];

function ConfirmResetAllModal({ closeModal, onConfirm }: { closeModal?: () => void; onConfirm: () => void }) {
  const confirm = () => {
    closeModal?.();
    onConfirm();
  };
  return (
    <ModalRoot onCancel={closeModal}>
      <DialogBody>
        {t("This removes all per-game Nebel settings, resets resolution overrides, applies the default Proton where Steam selects Proton, and leaves native Linux selections with Steam.")}
      </DialogBody>
      <DialogFooter>
        <DialogButton onClick={confirm}>{t("Reset All Games")}</DialogButton>
        <DialogButton onClick={closeModal}>{t("Cancel")}</DialogButton>
      </DialogFooter>
    </ModalRoot>
  );
}

export function Games({ config, setConfig, qam, lockedAppid, injected }: { config: Config; setConfig: Dispatch<SetStateAction<Config | null>>; qam?: boolean; lockedAppid?: string; injected?: boolean }) {
  const [resolution, setResolution] = useState("Default");
  const [defaultResolution, setDefaultResolution] = useState(getGlobalResolution());
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [resettingAll, setResettingAll] = useState(false);
  const [customSelected, setCustomSelected] = useState(false);
  const [showThunks, setShowThunks] = useState(false);
  const [compatTools, setCompatTools] = useState<CompatTool[]>([]);
  const [perGameTools, setPerGameTools] = useState<CompatTool[]>([]);
  const [currentTool, setCurrentTool] = useState("");
  const [lsfgAvailability, setLsfgAvailability] = useState<LsfgAvailability | null>(null);
  const [globalTool, setGlobalTool] = useState(
    String(config.tweaks?.global?.windowsCompatTool || DEFAULT_WINDOWS_COMPAT_TOOL),
  );
  const runtimeGame = config.game;
  const games = availableGames(config);
  // lockedAppid: the injected Properties-page variant pins the editor to the
  // app whose Properties is open - no game picker, no "Default" target.
  // injected: rendered inside Steam's own Properties -> Compatibility page,
  // which already has Steam's compat-mode/tool pickers - so ours are hidden,
  // and x86_64-only knobs (FEX, DXVK/VKD3D versions, thunks) appear only when
  // the game actually resolves to an x86_64 tool.
  const selectedGame = lockedAppid
    ? gameRefFromAppid(lockedAppid)
    : config.selectedGame || runtimeGame || null;
  const game = selectedGame;
  const selectedAppidRef = useRef("");
  selectedAppidRef.current = game?.appid || "";
  const tweaks = config.tweaks;
  const apps = window.SteamClient?.Apps;
  const persistHandledGames = () => saveCompatApplied(handledGameAppids()).catch(() => {});
  useEffect(() => {
    let cancelled = false;
    async function loadResolution() {
      if (!game?.appid || !apps?.GetResolutionOverrideForApp) {
        setResolution("Default");
        setResolutionMessage("");
        return;
      }
      try {
        const current = await apps.GetResolutionOverrideForApp(Number(game.appid));
        if (!cancelled) {
          setResolution(current || "Default");
          setResolutionMessage("");
        }
      } catch (error) {
        if (!cancelled) setResolutionMessage(t("Resolution override is unavailable"));
      }
    }
    loadResolution();
    return () => {
      cancelled = true;
    };
  }, [apps, game?.appid]);
  useEffect(() => {
    setCustomSelected(false);
  }, [game?.appid]);
  useEffect(() => {
    let cancelled = false;
    getProtonTools().then((tools) => {
      if (!cancelled) setCompatTools(tools);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    getLsfgAvailability().then((availability) => {
      if (!cancelled) setLsfgAvailability(availability);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!game?.appid) {
      setCurrentTool("");
      setPerGameTools([]);
      return;
    }
    const appid = game.appid;
    let cancelled = false;
    setCurrentTool(FOLLOW_STEAM_COMPAT);
    // Non-Steam shortcuts added mid-session never pass the bootstrap sweep -
    // make sure the launch wrapper is in place once the game is opened here.
    applyLaunchWrapperToGame(appid).catch(() => {});
    resolveCompatState(appid).then((state) => {
      if (!cancelled) setCurrentTool(compatSelection(state));
    });
    getAppCompatTools(appid).then((tools) => {
      if (!cancelled) setPerGameTools(tools);
    });
    return () => {
      cancelled = true;
    };
  }, [game?.appid]);
  useEffect(() => {
    if (!apps?.RegisterForAppOverviewChanges) return;
    let cancelled = false;
    let timer: number | undefined;
    const handle = apps.RegisterForAppOverviewChanges(() => {
      const appid = selectedAppidRef.current;
      if (!appid || cancelled) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        resolveCompatState(appid).then((state) => {
          if (!cancelled && selectedAppidRef.current === appid) setCurrentTool(compatSelection(state));
        }).catch(() => {});
      }, 250);
    });
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      try {
        handle?.unregister?.();
      } catch (error) {
      }
    };
  }, [apps]);
  useEffect(() => {
    setDefaultResolution(getGlobalResolution());
  }, []);
  const gameSettings = game?.appid ? tweaks.games[game.appid] || {} : {};
  const editingDefault = !game?.appid;
  const values = editingDefault ? tweaks.global : { ...tweaks.global, ...gameSettings };
  const patchSettings = (patch: Record<string, any>) => {
    setConfig((current) => {
      if (!current) return current;
      const next = clone(current);
      if (editingDefault) {
        Object.assign(next.tweaks.global, patch);
      } else if (game?.appid) {
        const existing = next.tweaks.games[game.appid] || {};
        next.tweaks.games[game.appid] = { ...existing, name: game.name || "", ...patch };
      }
      return next;
    });
  };
  const envPresets: Record<string, boolean> = values.envPresets || {};
  const setEnvPreset = (key: string, on: boolean) => {
    const next = { ...envPresets };
    if (on) next[key] = true;
    else delete next[key];
    patchSettings({ envPresets: Object.keys(next).length ? next : undefined });
  };
  const resetGame = async () => {
    if (!game?.appid) return;
    const appid = game.appid;
    setConfig((current) => {
      if (!current) return current;
      const next = clone(current);
      delete next.tweaks.games[appid];
      return next;
    });
    try {
      const tool = await resetCompatToolToDefault(appid);
      setCurrentTool(tool === globalTool ? USE_DEFAULT_COMPAT : tool || FOLLOW_STEAM_COMPAT);
      persistHandledGames();
    } catch (error) {
    }
    if (apps?.SetAppResolutionOverride) {
      try {
        await apps.SetAppResolutionOverride(Number(appid), "Default");
        setResolution("Default");
        setResolutionMessage("");
      } catch (error) {
      }
    }
  };
  const setSteamResolution = async (value: string) => {
    setResolution(value);
    if (!game?.appid || !apps?.SetAppResolutionOverride) return;
    try {
      await apps.SetAppResolutionOverride(Number(game.appid), value);
      setResolutionMessage("");
    } catch (error) {
      setResolutionMessage(t("Failed to set resolution override"));
    }
  };
  const setSteamDefaultResolution = async (value: string) => {
    setDefaultResolution(value);
    try {
      const applied = await setGlobalResolution(value);
      setResolutionMessage("");
      setDefaultResolution(applied || "Default");
    } catch (error) {
      setResolutionMessage(t("Failed to set default resolution"));
    }
  };
  const resetAllGames = async () => {
    if (resettingAll) return;
    setResettingAll(true);
    setConfig((current) => {
      if (!current) return current;
      const next = clone(current);
      next.tweaks.games = {};
      return next;
    });
    try {
      const gameAppids = await resolveGameAppids(games.map((installed) => installed.appid));
      let nextResolution = 0;
      const resetResolution = async () => {
        while (nextResolution < gameAppids.length) {
          const appid = gameAppids[nextResolution++];
          if (!apps?.SetAppResolutionOverride) continue;
          try {
            await apps.SetAppResolutionOverride(Number(appid), "Default");
          } catch (error) {
          }
        }
      };
      await Promise.all([
        resetAllCompatTools(gameAppids),
        Promise.all(Array.from({ length: Math.min(10, gameAppids.length) }, resetResolution)),
      ]);
      await saveCompatApplied(handledGameAppids());
      setResolution("Default");
      if (game?.appid) setCurrentTool(compatSelection(await resolveCompatState(game.appid)));
    } catch (error) {
    } finally {
      setResettingAll(false);
    }
  };
  const confirmResetAllGames = () => {
    showModal(<ConfirmResetAllModal onConfirm={() => { void resetAllGames(); }} />);
  };
  const gameOptions = editTargetOptions(config);
  // "" is the explicit Default target, not "nothing selected"; store a sentinel
  // so it doesn't fall back to the running game in the selectedGame derivation.
  const setSelectedGame = (appid: any) => {
    const id = String(appid);
    if (!id) {
      setConfig((current) => (current ? { ...current, selectedGame: { appid: "", name: "Default" } } : current));
      return;
    }
    const saved = games.find((candidate) => candidate.appid === id);
    setConfig((current) => (current ? { ...current, selectedGame: saved || null } : current));
  };

  const toolOptions = compatTools.map((tool) => ({ data: tool.id, label: tool.label }));
  const onSelectGlobalDefault = async (choice: any) => {
    const name = String(choice);
    const oldTool = String(tweaks.global.windowsCompatTool || DEFAULT_WINDOWS_COMPAT_TOOL);
    setGlobalTool(name);
    setWindowsCompatTool(name);
    patchSettings({ windowsCompatTool: name });
    await migrateWindowsCompatTool(config.installedGames.map((installed) => installed.appid), oldTool, name);
    persistHandledGames();
  };
  // Not a separate stored field - inferred from which default Proton is
  // selected, since that's what actually drives behavior. Anything other
  // than our own bundled ARM64 build counts as "x86_64 mode" for this
  // switch's purposes, even if the user picked a specific tool by hand via
  // "Default Proton" below rather than through this switch.
  const compatMode = globalTool === DEFAULT_WINDOWS_COMPAT_TOOL ? "arm64" : "x86_64";
  const onSelectCompatMode = async (choice: any) => {
    const mode = String(choice);
    if (mode === compatMode) return;
    patchSettings({ thunks: mode === "arm64" ? ARM64_MODE_THUNKS : X86_64_MODE_THUNKS });
    await onSelectGlobalDefault(mode === "arm64" ? DEFAULT_WINDOWS_COMPAT_TOOL : DEFAULT_X86_64_COMPAT_TOOL);
  };
  const selectableTools = new Map<string, CompatTool>();
  for (const tool of [...perGameTools, ...compatTools]) selectableTools.set(tool.id, tool);
  if (currentTool && currentTool !== USE_DEFAULT_COMPAT && currentTool !== FOLLOW_STEAM_COMPAT && !selectableTools.has(currentTool)) {
    selectableTools.set(currentTool, { id: currentTool, label: currentTool });
  }
  const perGameToolOptions = [
    { data: USE_DEFAULT_COMPAT, label: t("Use Default") },
    { data: FOLLOW_STEAM_COMPAT, label: t("Follow Steam") },
    ...Array.from(selectableTools.values()).map((tool) => ({ data: tool.id, label: tool.label })),
  ];
  const onSelectPerGameTool = async (choice: any) => {
    if (!game?.appid) return;
    const selection = String(choice);
    const target = selection === USE_DEFAULT_COMPAT
      ? globalTool
      : selection === FOLLOW_STEAM_COMPAT
        ? ""
        : selection;
    try {
      await specifyCompatTool(game.appid, target);
      markCompatHandled(game.appid);
      persistHandledGames();
      setCurrentTool(selection);
    } catch (error) {
    }
  };
  // FEX-Emu itself is an emulator layer Steam auto-prepends to any x86_64
  // tool's command chain (its toolmanifest has filter_exclusive_priority) -
  // it never appears in per-game pickers, so the per-game "FEX on/off" lever
  // is really "x86_64 Proton vs ARM64 Proton". Picking x86_64 also flips the
  // FEX thunks for this game: an x86_64 Proton needs them on to bridge its
  // binaries to the host, while the global default keeps them off (ARM64
  // mode), which is why a bare per-game tool switch used to fail to boot.
  const perGameMode = (() => {
    if (!currentTool || currentTool === FOLLOW_STEAM_COMPAT) return FOLLOW_STEAM_COMPAT;
    const tool = currentTool === USE_DEFAULT_COMPAT ? globalTool : currentTool;
    return tool.toLowerCase().includes("arm64") ? "arm64" : "x86_64";
  })();
  // Effective architecture for this game: an explicit per-game pick wins,
  // "Follow Steam" resolves against the global default mode. Drives which
  // knobs are meaningful in the injected view.
  const isX86Mode = perGameMode === "x86_64" || (perGameMode === FOLLOW_STEAM_COMPAT && compatMode === "x86_64");
  // Mirrors Steam's "Force the use of a specific Steam Play compatibility
  // tool" checkbox: a concrete tool is pinned in config.vdf. "Use Default"
  // also counts - it pins the global default tool. Per-game profile knobs
  // and the dependency installer only appear once a tool is forced, so the
  // page stays stock-looking for untouched games.
  const forcedTool = currentTool !== "" && currentTool !== FOLLOW_STEAM_COMPAT;
  const onSelectPerGameMode = async (choice: any) => {
    if (!game?.appid) return;
    const mode = String(choice);
    if (mode === perGameMode) return;
    patchSettings({
      thunks: mode === "arm64" ? ARM64_MODE_THUNKS : mode === "x86_64" ? X86_64_MODE_THUNKS : undefined,
    });
    const target = mode === "arm64"
      ? DEFAULT_WINDOWS_COMPAT_TOOL
      : mode === "x86_64"
        ? DEFAULT_X86_64_COMPAT_TOOL
        : "";
    try {
      await specifyCompatTool(game.appid, target);
      markCompatHandled(game.appid);
      persistHandledGames();
      const state = await resolveCompatState(game.appid);
      setCurrentTool(compatSelection(state));
    } catch (error) {
    }
  };

  const presets = config.fexProfiles || {};
  const presetEntries = Object.entries(presets);
  const storedProfile = values.fexProfile as string | undefined;
  const storedConfig = values.fexConfig as Record<string, string> | undefined;
  const ownConfig = (editingDefault ? tweaks.global.fexConfig : gameSettings.fexConfig) as Record<string, string> | undefined;
  const hasPreset = !!(storedProfile && presets[storedProfile]);
  const isCustom = customSelected || (!hasPreset && !!storedConfig);
  const fexValue = isCustom ? "custom" : hasPreset ? storedProfile! : "default";
  const fexConfig: Record<string, string> = (isCustom ? storedConfig : presets[fexValue]?.config) || presets.default?.config || {};
  const fexOptions = [...presetEntries.map(([id, profile]) => ({ data: id, label: profile.label })), { data: "custom", label: t("Custom") }];
  const onSelectFex = (id: any) => {
    if (id === "custom") {
      setCustomSelected(true);
      // First Custom for this target seeds from the Default preset; afterwards the
      // stored config is kept, including across visits to a preset.
      patchSettings({ fexProfile: "custom", fexConfig: { ...(ownConfig || presets.default?.config || {}) } });
      return;
    }
    setCustomSelected(false);
    patchSettings({ fexProfile: id });
  };
  const setKnob = (key: string, on: boolean) => patchSettings({ fexProfile: "custom", fexConfig: { ...fexConfig, [key]: on ? "1" : "0" } });
  const thunks: Record<string, boolean> = values.thunks || {};
  const setThunk = (module: string, on: boolean) => patchSettings({ thunks: { ...thunks, [module]: on } });

  return (
    <>
      {!lockedAppid && (
      <PanelSection title={t("Edit Game Profile")}>
        <SelectEdit value={game?.appid || ""} options={gameOptions} onChange={setSelectedGame} />
        <div className="nebel-compat-note">{t("Compatibility changes apply on next launch")}</div>
      </PanelSection>
      )}
      {(editingDefault || !injected || forcedTool) && (
      <PanelSection title={t("Profile Settings")}>
        {editingDefault ? (
          <>
            <SelectEdit
              labelBelow
              label={t("Compatibility Mode")}
              value={compatMode}
              options={compatModeOptions}
              onChange={onSelectCompatMode}
            />
            <SelectEdit labelBelow label={t("Default Proton")} value={globalTool} options={toolOptions} onChange={onSelectGlobalDefault} />
            <ToggleField
              label={t("Apply to New Games")}
              checked={tweaks.global.autoApplyCompat !== false}
              onChange={(enabled) => {
                setAutoApplyCompat(enabled);
                patchSettings({ autoApplyCompat: enabled });
              }}
            />
            <SelectEdit
              labelBelow
              label={t("Game Era")}
              value={String(values.gameEra || "")}
              options={gameEraOptions}
              onChange={(value) => patchSettings({ gameEra: value || undefined })}
            />
            {values.gameEra === "xp" ? (
              <div className="nebel-compat-note">{t("XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced")}</div>
            ) : null}
            <SelectEdit label={t("Game Resolution")} value={defaultResolution} options={resolutionOptions} onChange={setSteamDefaultResolution} />
            {!qam && (
              <ToggleField
                label={t("Performance Overlay")}
                description={t("FPS/CPU/GPU/temps overlay via gamescope's built-in --mangoapp - applies on next session restart")}
                checked={tweaks.global.mangoapp === true}
                onChange={(enabled) => patchSettings({ mangoapp: enabled })}
              />
            )}
          </>
        ) : (
          <>
            {!injected && (
              <>
                <SelectEdit labelBelow label={t("Compatibility Mode")} value={perGameMode} options={perGameModeOptions} onChange={onSelectPerGameMode} />
                <SelectEdit labelBelow label={t("Compatibility Tool")} value={currentTool} options={perGameToolOptions} onChange={onSelectPerGameTool} />
              </>
            )}
            {forcedTool && (
              <>
                <SelectEdit
                  labelBelow
                  label={t("Game Era")}
                  value={String(values.gameEra || "")}
                  options={gameEraOptions}
                  onChange={(value) => patchSettings({ gameEra: value || undefined })}
                />
                {values.gameEra === "xp" ? (
                  <div className="nebel-compat-note">{t("XP era presets Windows version, old-DirectX renderer and two CPU cores - fine-tune under Advanced")}</div>
                ) : null}
                <SelectEdit label={t("Game Resolution")} value={resolution} options={resolutionOptions} onChange={setSteamResolution} />
              </>
            )}
          </>
        )}
        {resolutionMessage ? <Field label={t("Status")} description={resolutionMessage} /> : null}
        {!qam && (!injected || (forcedTool && isX86Mode)) && (
          <>
            <SelectEdit label={t("FEX Preset")} value={fexValue} options={fexOptions} onChange={onSelectFex} />
            {isCustom
              ? fexKnobs.map((knob) => (
                  <ToggleField key={knob.key} label={knob.label} checked={fexConfig[knob.key] === "1"} onChange={(value) => setKnob(knob.key, value)} />
                ))
              : null}
          </>
        )}
      </PanelSection>
      )}
      {!editingDefault && game?.appid ? (
        <HeroicSection
          appid={game.appid}
          forced={gameSettings.heroicForce === true}
          onToggleForce={(enabled) => patchSettings({ heroicForce: enabled || undefined })}
        />
      ) : null}
      {!qam && (!injected || forcedTool) && (
        <>
          <PanelSection>
            <Collapsible label={t("Advanced")}>
              <SelectEdit
                label={t("CPU Cores")}
                value={String(values.cores || "")}
                options={cpuAffinityOptions}
                onChange={(value) => patchSettings({ cores: value || undefined })}
              />
              <SelectEdit
                label={t("Power Profile")}
                value={String(values.powerProfile || "")}
                options={powerProfileOptions}
                onChange={(value) => patchSettings({ powerProfile: value || undefined })}
              />
              <div className="nebel-compat-note">{t("Switches the system power profile for this game and restores it after exit")}</div>
              {lsfgAvailability?.layer && lsfgAvailability?.lossless ? (
                <>
                  <ToggleField
                    label={t("LSFG")}
                    description={t("Frame generation via Lossless Scaling; requires V-Sync in game")}
                    checked={values.lsfg === true}
                    onChange={(enabled) => patchSettings({ lsfg: enabled || undefined })}
                  />
                  {values.lsfg === true ? (
                    <SelectEdit
                      label={t("LSFG Multiplier")}
                      value={String(values.lsfgMultiplier || 2)}
                      options={lsfgMultiplierOptions}
                      onChange={(value) => patchSettings({ lsfgMultiplier: Number(value) || undefined })}
                    />
                  ) : null}
                </>
              ) : lsfgAvailability?.layer ? (
                <div className="nebel-compat-note">{t("LSFG: frame generation unlocks here once Lossless Scaling is installed from Steam")}</div>
              ) : null}
              {(!injected || values.gameEra === "xp") && (
              <Collapsible label={t("Old games (legacy Windows)")}>
                <SelectEdit
                  label={t("Windows Version (reported)")}
                  value={String(values.windowsVersion || "auto")}
                  options={windowsVersionOptions}
                  onChange={(value) => patchSettings({ windowsVersion: value === "auto" ? undefined : value })}
                />
                <SelectEdit
                  label={t("Old DirectX renderer")}
                  value={String(values.legacyRenderer || "auto")}
                  options={legacyRendererOptions}
                  onChange={(value) => patchSettings({ legacyRenderer: value === "auto" ? undefined : value })}
                />
                <SelectEdit
                  label={t("Virtual Desktop")}
                  value={String(values.virtualDesktop || "")}
                  options={virtualDesktopOptions}
                  onChange={(value) => patchSettings({ virtualDesktop: value || undefined })}
                />
                <SelectEdit
                  label={t("Memory Limit")}
                  value={String(values.memoryLimitMB || 0)}
                  options={memoryLimitOptions}
                  onChange={(value) => patchSettings({ memoryLimitMB: Number(value) || undefined })}
                />
                <div className="nebel-compat-note">{t("Caps memory the game can allocate - last resort for very old titles; can crash modern games")}</div>
              </Collapsible>
              )}
              <SelectEdit
                label={t("GPU Spoof")}
                value={String(values.gpuSpoof || "")}
                options={gpuSpoofOptions}
                onChange={(value) => patchSettings({ gpuSpoof: value || undefined })}
              />
              {(!injected || isX86Mode) && (
              <>
              <SelectEdit
                label={t("DXVK version")}
                value={String(values.dxvkVersion || "")}
                options={dxvkVersionOptions}
                onChange={(value) => patchSettings({ dxvkVersion: value || undefined })}
              />
              <SelectEdit
                label={t("D3D12 (VKD3D) version")}
                value={String(values.vkd3dVersion || "")}
                options={vkd3dVersionOptions}
                onChange={(value) => patchSettings({ vkd3dVersion: value || undefined })}
              />
              <div className="nebel-compat-note">{t("Older builds can help on Adreno GPUs where newer DXVK/VKD3D refuse to start - default uses Proton's built-in version")}</div>
              <ButtonItem layout="below" onClick={() => setShowThunks((value) => !value)}>
                {showThunks ? t("Hide Host Thunks") : t("Host Thunks")}
              </ButtonItem>
              {showThunks
                ? thunkModules.map((thunk) => (
                    <ToggleField key={thunk.module} label={thunk.label} checked={thunks[thunk.module] !== false} onChange={(value) => setThunk(thunk.module, value)} />
                  ))
                : null}
              </>
              )}
            </Collapsible>
            <Collapsible label={t("Launch flags")}>
              <ToggleField label={t("D3D12 feature level 12_1")} description={t("For DirectX 12 games that black-screen or refuse to start")} checked={envPresets.dx12Fl121 === true} onChange={(value) => setEnvPreset("dx12Fl121", value)} />
              <ToggleField label={t("Disable DirectX 12")} description={t("For games whose DirectX 12 mode crashes - they fall back to DX11")} checked={envPresets.noD3d12 === true} onChange={(value) => setEnvPreset("noD3d12", value)} />
              <ToggleField label={t("WineD3D instead of DXVK")} description={t("For old DirectX 9-11 games that won't start on DXVK")} checked={envPresets.wineD3d === true} onChange={(value) => setEnvPreset("wineD3d", value)} />
              <ToggleField label={t("Old OpenGL compatibility")} description={t("For old OpenGL games that misdetect the graphics driver")} checked={envPresets.oldGlString === true} onChange={(value) => setEnvPreset("oldGlString", value)} />
              <ToggleField label={t("Large address aware (32-bit games)")} description={t("For 32-bit era games crashing with out-of-memory errors")} checked={envPresets.largeAddress === true} onChange={(value) => setEnvPreset("largeAddress", value)} />
              <ToggleField label={t("Mod/launcher DLL override")} description={t("Needed by mod loaders and third-party launchers (winhttp)")} checked={envPresets.winhttpOverride === true} onChange={(value) => setEnvPreset("winhttpOverride", value)} />
              <ToggleField label={t("Disable fsync")} description={t("For games that hang at startup or in anti-cheat init")} checked={envPresets.noFsync === true} onChange={(value) => setEnvPreset("noFsync", value)} />
              <ToggleField label={t("Disable esync")} description={t("For games that hang at startup or in anti-cheat init")} checked={envPresets.noEsync === true} onChange={(value) => setEnvPreset("noEsync", value)} />
              <ToggleField label={t("Skip Larian launcher")} description={t("Baldur's Gate 3 and Divinity: Original Sin 2 - goes straight into the game")} checked={envPresets.skipLauncherLarian === true} onChange={(value) => setEnvPreset("skipLauncherLarian", value)} />
              <ToggleField label={t("Skip intro videos")} description={t("Passes -novid for Source-engine and other games that stall on intro videos")} checked={envPresets.skipIntroVid === true} onChange={(value) => setEnvPreset("skipIntroVid", value)} />
              <TextField
                label={t("Extra launch arguments")}
                value={values.extraArgs || ""}
                onChange={(e) => patchSettings({ extraArgs: e.target.value || undefined })}
              />
              <div className="nebel-compat-note">{t("Launch switches applied to the game's environment - variables set directly in Launch Options take precedence")}</div>
            </Collapsible>
          </PanelSection>
          {!editingDefault && game?.appid && forcedTool ? (
            <DependenciesSection appid={game.appid} eraXp={values.gameEra === "xp"} />
          ) : null}
          {!editingDefault ? (
            <PanelSection>
              <ButtonItem layout="below" onClick={resetGame}>
                {t("Reset to Default")}
              </ButtonItem>
            </PanelSection>
          ) : (
            <PanelSection>
              <ButtonItem layout="below" disabled={resettingAll} onClick={confirmResetAllGames}>
                {resettingAll ? t("Resetting...") : t("Reset All Games")}
              </ButtonItem>
            </PanelSection>
          )}
        </>
      )}
      {!lockedAppid && <AddGameSection />}
      {qam && <OpenFullScreenButton />}
    </>
  );
}

// Per-game winetricks verbs ("Dependencies"): installs run in a backend
// worker thread, so the UI polls deps_status while busy instead of blocking.
function DependenciesSection({ appid, eraXp }: { appid: string; eraXp: boolean }) {
  const [status, setStatus] = useState<DepsStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const load = async () => {
      try {
        const next = await getDepsStatus(appid);
        if (cancelled) return;
        setStatus(next);
        if (next.busy) timer = window.setTimeout(load, 1500);
      } catch (error) {
      }
    };
    load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [appid]);
  if (!status) return null;
  const install = (verbs: string[]) => {
    installDeps(appid, verbs).then(setStatus).catch(() => {});
    // Start polling right away - deps_install returns before the worker flips busy.
    window.setTimeout(() => {
      getDepsStatus(appid).then(setStatus).catch(() => {});
    }, 500);
  };
  if (!status.available) {
    return (
      <PanelSection>
        <Collapsible label={t("Dependencies")}>
          <Field description={t("Dependency installer (winetricks) is missing in this OS build")} />
        </Collapsible>
      </PanelSection>
    );
  }
  if (!status.prefixFound) {
    return (
      <PanelSection>
        <Collapsible label={t("Dependencies")}>
          <Field description={t("Game prefix not found - launch the game once first")} />
        </Collapsible>
      </PanelSection>
    );
  }
  const errorText = (() => {
    switch (status.error) {
      case "":
        return "";
      case "busy":
        return t("Another installation is already running");
      case "timeout":
        return t("Installation timed out");
      case "no-prefix":
        return t("Game prefix not found - launch the game once first");
      case "unavailable":
        return t("Dependency installer (winetricks) is missing in this OS build");
      default:
        return t("Installation failed - check the network connection");
    }
  })();
  const recommendedMissing = RECOMMENDED_XP_DEPS.filter((verb) => !status.installed.includes(verb));
  return (
    <PanelSection>
      <Collapsible label={t("Dependencies")}>
        <div className="nebel-compat-note">{t("Installing dependencies needs an internet connection")}</div>
        {eraXp && recommendedMissing.length ? (
          <ButtonItem
            layout="below"
            disabled={status.busy}
            description={t("Recommended for Windows XP-era games")}
            onClick={() => install(recommendedMissing)}
          >
            {t("Install recommended (DirectX 9 + VC++ 2005)")}
          </ButtonItem>
        ) : null}
        {DEPENDENCY_VERBS.map((verb) => {
          const installed = status.installed.includes(verb.id);
          const installing = status.busy && status.currentVerb === verb.id;
          return (
            <ButtonItem key={verb.id} layout="below" disabled={installed || status.busy} onClick={() => install([verb.id])}>
              {verb.label} — {installed ? `✓ ${t("Installed")}` : installing ? t("Installing...") : t("Install")}
            </ButtonItem>
          );
        })}
        {errorText ? <Field label={t("Status")} description={errorText} /> : null}
      </Collapsible>
    </PanelSection>
  );
}

// The stock "Browse..." button in Steam's Add Non-Steam Game dialog is broken
// in the ARM64 client (OpenFileDialog fails before reaching the portal), and
// native dialogs never appear in the gamescope session — so the picker lives
// right here and the pick is registered through Steam's AddShortcut API.
// Heroic games are intentionally NOT offered here: Heroic's own "Add to
// Steam" writes their shortcuts (with artwork and the right launch line) -
// this picker is for everything else.
export function AddGameSection() {
  const [picker, setPicker] = useState<DirListing | null>(null);
  const [addResult, setAddResult] = useState("");

  const navigate = async (path: string) => {
    try {
      setPicker(await listDir(path));
    } catch {
      setAddResult(t("Failed to add shortcut"));
      setPicker(null);
    }
  };
  const pick = async (fullPath: string) => {
    setPicker(null);
    setAddResult("");
    try {
      const name = fullPath.split("/").pop()?.replace(/\.[^.]+$/, "") || fullPath;
      const startDir = fullPath.slice(0, fullPath.lastIndexOf("/")) || "/";
      // Steam quotes the Exe field itself — passing a pre-quoted path yields ""..."".
      // AddShortcut on this client IGNORES the name and launchOptions arguments
      // (it names the shortcut after the exe basename and writes empty options) -
      // both have to be applied afterwards through the dedicated setters.
      // The wrapper goes into Launch Options so per-game tweaks apply from the
      // first launch (the bootstrap sweep would add it later anyway).
      const appid = await SteamClient?.Apps?.AddShortcut?.(name, fullPath, startDir, "");
      if (typeof appid === "number" && appid > 0) {
        try { await SteamClient.Apps.SetShortcutName(appid, name); } catch {}
        try { await SteamClient.Apps.SetShortcutLaunchOptions(appid, "/usr/libexec/nebel/nebel-game-launch %command%"); } catch {}
      }
      setAddResult(typeof appid === "number" && appid > 0 ? t("Added to Steam library") : t("Failed to add shortcut"));
    } catch {
      setAddResult(t("Failed to add shortcut"));
    }
  };
  const shortcutLabel = (s: { id: string; label: string }) =>
    s.id === "home" ? t("Internal storage") : `${t("SD card")}: ${s.label}`;

  if (picker) {
    return (
      <PanelSection title={t("Select the game's executable")}>
        <Field label={picker.path} />
        {(picker.shortcuts || []).map((s) => (
          <ButtonItem key={`s:${s.path}`} layout="below" onClick={() => navigate(s.path)}>
            {shortcutLabel(s)}/
          </ButtonItem>
        ))}
        {picker.parent !== null && (
          <ButtonItem layout="below" onClick={() => navigate(picker.parent || "/")}>..</ButtonItem>
        )}
        {picker.dirs.map((dir) => (
          <ButtonItem key={`d:${dir}`} layout="below" onClick={() => navigate(`${picker.path}/${dir}`)}>
            {dir}/
          </ButtonItem>
        ))}
        {picker.files.map((file) => (
          <ButtonItem key={`f:${file}`} layout="below" onClick={() => pick(`${picker.path}/${file}`)}>
            {file}
          </ButtonItem>
        ))}
        <ButtonItem layout="below" onClick={() => setPicker(null)}>{t("Cancel")}</ButtonItem>
      </PanelSection>
    );
  }
  return (
    <PanelSection title={t("Add non-Steam game")}>
      <ButtonItem layout="below" onClick={() => navigate("")}>{t("Select the game's executable")}</ButtonItem>
      {addResult && <Field label={addResult} />}
    </PanelSection>
  );
}
