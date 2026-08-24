import {
  ButtonItem,
  DialogBody,
  DialogButton,
  DialogFooter,
  Field,
  ModalRoot,
  PanelSection,
  ToggleField,
  showModal,
} from "@decky/ui";
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { saveCompatApplied, listDir } from "../backend";
import type { DirListing } from "../backend";
import { Collapsible, OpenFullScreenButton, SelectEdit } from "../components/widgets";
import { t } from "../i18n";
import { getGlobalResolution, setGlobalResolution } from "../lib/steamSettings";
import { clone } from "../lib/util";
import { availableGames, editTargetOptions } from "../lib/games";
import {
  ARM64_MODE_THUNKS,
  DEFAULT_WINDOWS_COMPAT_TOOL,
  DEFAULT_X86_64_COMPAT_TOOL,
  FOLLOW_STEAM_COMPAT,
  USE_DEFAULT_COMPAT,
  X86_64_MODE_THUNKS,
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
  { data: "", label: t("Default") },
  { data: "xp", label: t("Windows XP era (older games)") },
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
// SM8250's cpu0-3 are the 1.8GHz LITTLE cluster, cpu4-7 the 2.4-2.84GHz
// big+prime cluster - same split ROCKNIX's own SM8250 profile uses.
const cpuAffinityOptions = [
  { data: "", label: t("Default (any core)") },
  { data: "big", label: t("Big cores only (cpu4-7)") },
  { data: "little", label: t("Little cores only (cpu0-3)") },
  { data: "one", label: t("Single core (cpu4)") },
  { data: "two", label: t("Two cores (cpu4-5)") },
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

export function Games({ config, setConfig, qam }: { config: Config; setConfig: Dispatch<SetStateAction<Config | null>>; qam?: boolean }) {
  const [resolution, setResolution] = useState("Default");
  const [defaultResolution, setDefaultResolution] = useState(getGlobalResolution());
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [resettingAll, setResettingAll] = useState(false);
  const [customSelected, setCustomSelected] = useState(false);
  const [showThunks, setShowThunks] = useState(false);
  const [compatTools, setCompatTools] = useState<CompatTool[]>([]);
  const [perGameTools, setPerGameTools] = useState<CompatTool[]>([]);
  const [currentTool, setCurrentTool] = useState("");
  const [globalTool, setGlobalTool] = useState(
    String(config.tweaks?.global?.windowsCompatTool || DEFAULT_WINDOWS_COMPAT_TOOL),
  );
  const runtimeGame = config.game;
  const games = availableGames(config);
  const selectedGame = config.selectedGame || runtimeGame || null;
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
    if (!game?.appid) {
      setCurrentTool("");
      setPerGameTools([]);
      return;
    }
    const appid = game.appid;
    let cancelled = false;
    setCurrentTool(FOLLOW_STEAM_COMPAT);
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
      <PanelSection title={t("EDIT GAME PROFILE")}>
        <SelectEdit value={game?.appid || ""} options={gameOptions} onChange={setSelectedGame} />
        <div className="nebel-compat-note">{t("Compatibility changes apply on next launch")}</div>
      </PanelSection>
      <PanelSection title={t("PROFILE SETTINGS")}>
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
            <SelectEdit labelBelow label={t("Compatibility Mode")} value={perGameMode} options={perGameModeOptions} onChange={onSelectPerGameMode} />
            <SelectEdit labelBelow label={t("Compatibility Tool")} value={currentTool} options={perGameToolOptions} onChange={onSelectPerGameTool} />
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
        {resolutionMessage ? <Field label={t("Status")} description={resolutionMessage} /> : null}
        {!qam && (
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
      {!qam && (
        <>
          <PanelSection>
            <Collapsible label={t("ADVANCED")}>
              <SelectEdit
                label={t("CPU Cores")}
                value={String(values.cores || "")}
                options={cpuAffinityOptions}
                onChange={(value) => patchSettings({ cores: value || undefined })}
              />
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
              <SelectEdit
                label={t("GPU Spoof")}
                value={String(values.gpuSpoof || "")}
                options={gpuSpoofOptions}
                onChange={(value) => patchSettings({ gpuSpoof: value || undefined })}
              />
              <ButtonItem layout="below" onClick={() => setShowThunks((value) => !value)}>
                {showThunks ? t("Hide Host Thunks") : t("Host Thunks")}
              </ButtonItem>
              {showThunks
                ? thunkModules.map((thunk) => (
                    <ToggleField key={thunk.module} label={thunk.label} checked={thunks[thunk.module] !== false} onChange={(value) => setThunk(thunk.module, value)} />
                  ))
                : null}
            </Collapsible>
          </PanelSection>
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
      <AddGameSection />
      {qam && <OpenFullScreenButton />}
    </>
  );
}

// The stock "Browse..." button in Steam's Add Non-Steam Game dialog is broken
// in the ARM64 client (OpenFileDialog fails before reaching the portal), and
// native dialogs never appear in the gamescope session — so the picker lives
// right here and the pick is registered through Steam's AddShortcut API.
function AddGameSection() {
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
      // Steam quotes the Exe field itself — passing a pre-quoted path yields ""..."".
      const appid = await SteamClient?.Apps?.AddShortcut?.(name, fullPath, "", "");
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
