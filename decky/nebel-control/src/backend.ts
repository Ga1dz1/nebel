import { call } from "@decky/api";
import type { CalibrationState, Capture, Config, DisplayState, InstalledGame, PowerConfig, StickLedState, SyncState, SystemMonitor, Tweaks } from "./types";

export const getConfig = () => call<[], Config>("get_config");
export const getInstalledGames = () => call<[], InstalledGame[]>("get_installed_games");
export const savePowerConfig = (data: PowerConfig) => call<[PowerConfig], Config>("save_power_config", data);
export const saveTweaks = (data: Tweaks) => call<[Tweaks], Config>("save_tweaks", data);
export interface LsfgAvailability {
  layer: boolean;
  lossless: boolean;
}
export const getLsfgAvailability = () => call<[], LsfgAvailability>("get_lsfg_availability");
export const getCompatApplied = () => call<[], string[]>("get_compat_applied");
let compatAppliedSaveChain = Promise.resolve<unknown>(undefined);
export const saveCompatApplied = (appids: string[]) => {
  const snapshot = [...appids];
  const request = compatAppliedSaveChain
    .catch(() => {})
    .then(() => call<[string[]], string[]>("save_compat_applied", snapshot));
  compatAppliedSaveChain = request;
  return request;
};
export const setSshEnabled = (enabled: boolean) => call<[boolean], boolean>("set_ssh_enabled", enabled);
export interface SupporterState {
  present: boolean;
  valid: boolean;
  masked: string;
  unlocked: boolean;
}
export const getSupporterState = () => call<[], SupporterState>("get_supporter_state");
export const setSupporterKey = (key: string) => call<[string], SupporterState>("set_supporter_key", key);
export const clearSupporterKey = () => call<[], SupporterState>("clear_supporter_key");
export const setControllerType = (value: string) => call<[string], string>("set_controller_type", value);
export const setSharedStorageEnabled = (enabled: boolean) => call<[boolean], boolean>("set_shared_storage_enabled", enabled);
export interface DirListing {
  path: string;
  parent: string | null;
  dirs: string[];
  files: string[];
  shortcuts: { id: string; label: string; path: string }[];
}
export const listDir = (path: string) => call<[string], DirListing>("list_dir", path);
export interface HeroicGame {
  appName: string;
  title: string;
  runner: string;
  installPath: string;
}
export const listHeroicGames = () => call<[], HeroicGame[]>("heroic_games");
export const heroicMatch = (path: string) => call<[string], HeroicGame | null>("heroic_match", path);
export const heroicLaunch = (game: HeroicGame) => call<[HeroicGame], { name: string; exe: string; args: string }>("heroic_launch", game);
export interface HeroicShortcutInfo {
  style: "wrapper" | "heroic";
  appName: string;
  runner: string;
  name: string;
  exe: string;
  launchOptions: string;
  launcher: string;
}
export const heroicShortcut = (appid: string) => call<[string], HeroicShortcutInfo | null>("heroic_shortcut", appid);
export interface HeroicConfig {
  appName: string;
  wineVersionBin: string;
  wineVersionName: string;
  wineVersionType: string;
  winePrefix: string;
  enableEsync: boolean;
  enableFsync: boolean;
  enableMsync: boolean;
  enableWoW64: boolean;
}
export const getHeroicConfig = (appName: string) => call<[string], HeroicConfig>("heroic_config", appName);
export const setHeroicConfig = (appName: string, patch: Partial<HeroicConfig> & { wineVersion?: { bin: string; name: string; type: string } }) =>
  call<[string, typeof patch], HeroicConfig>("heroic_set_config", appName, patch);
export interface HeroicVersion { name: string; type: string; bin: string; }
export const listHeroicVersions = () => call<[], HeroicVersion[]>("heroic_versions");
export interface DepsStatus {
  appid: string;
  available: boolean;
  prefixFound: boolean;
  installed: string[];
  busy: boolean;
  currentVerb: string;
  error: string;
  logTail: string;
}
export const getDepsStatus = (appid: string) => call<[string], DepsStatus>("deps_status", appid);
export const installDeps = (appid: string, verbs: string[]) =>
  call<[string, string[]], DepsStatus>("deps_install", appid, verbs);
export const setStickLedColor = (side: "l" | "r", value: string) =>
  call<[string, string], StickLedState>("set_stick_led_color", side, value);
export const setStickLedMode = (side: "l" | "r", mode: string) =>
  call<[string, string], StickLedState>("set_stick_led_mode", side, mode);
export const setStickLedScreenLink = (enabled: boolean) => call<[boolean], StickLedState>("set_stick_led_screen_link", enabled);
export const setStickLedParam = (side: "l" | "r", param: string, mode: string, value: number) =>
  call<[string, string, string, number], StickLedState>("set_stick_led_param", side, param, mode, value);
export const setStickLedFlashColor = (button: string, value: string) =>
  call<[string, string], StickLedState>("set_stick_led_flash_color", button, value);
export const setStickLedDuotoneColor = (side: "l" | "r", slot: "a" | "b", value: string) =>
  call<[string, string, string], StickLedState>("set_stick_led_duotone_color", side, slot, value);
export const setStickLedDuotoneOrientation = (side: "l" | "r", orientation: string) =>
  call<[string, string], StickLedState>("set_stick_led_duotone_orientation", side, orientation);
export const setStickLedColorSource = (side: "l" | "r", source: string) =>
  call<[string, string], StickLedState>("set_stick_led_color_source", side, source);
export const setStickLedChargingIndicator = (side: "l" | "r", enabled: boolean) =>
  call<[string, boolean], StickLedState>("set_stick_led_charging_indicator", side, enabled);
export const setStickLedChase = (side: "l" | "r", enabled: boolean) =>
  call<[string, boolean], StickLedState>("set_stick_led_chase", side, enabled);
export const setStickLedCompass = (side: "l" | "r", enabled: boolean) =>
  call<[string, boolean], StickLedState>("set_stick_led_compass", side, enabled);
export const setStickLedSeesaw = (side: "l" | "r", enabled: boolean) =>
  call<[string, boolean], StickLedState>("set_stick_led_seesaw", side, enabled);
export const setStickLedFlip = (side: "l" | "r", enabled: boolean) =>
  call<[string, boolean], StickLedState>("set_stick_led_flip", side, enabled);
export const setStickLedEnabled = (enabled: boolean) =>
  call<[boolean], StickLedState>("set_stick_led_enabled", enabled);
export const setStickLedNotify = (enabled: boolean) =>
  call<[boolean], StickLedState>("set_stick_led_notify", enabled);
export const setStickLedNotifyColor = (value: string) =>
  call<[string], StickLedState>("set_stick_led_notify_color", value);
export const getSystemMonitor = () => call<[], SystemMonitor>("get_system_monitor");
export const setOverlayEnabled = (enabled: boolean) => call<[boolean], boolean>("set_overlay_enabled", enabled);
export const setStickLedMaxBrightness = (value: number) =>
  call<[number], StickLedState>("set_stick_led_max_brightness", value);
export const getControllerState = () => call<[], CalibrationState>("get_controller_state");
export const saveCalibration = (capture: Capture) => call<[Capture], CalibrationState>("save_calibration", capture);
export const resetCalibration = () => call<[], CalibrationState>("reset_calibration");
export const beginCalibrationSession = (token: string) => call<[string], boolean>("begin_calibration_session", token);
export const endCalibrationSession = (token: string) => call<[string], boolean>("end_calibration_session", token);
export const getDisplayState = () => call<[], DisplayState>("get_display_state");
export const setDisplayConfig = (useExternal: boolean, connector: string, width: number, height: number, orientation: string) =>
  call<[boolean, string, number, number, string], DisplayState>("set_display_config", useExternal, connector, width, height, orientation);
export const restartGamescopeSession = () => call<[], { ok: boolean }>("restart_gamescope_session");
export const setInternalTouchpad = (mode: number) => call<[number], number>("set_internal_touchpad", mode);
export const getSyncState = () => call<[], SyncState>("get_sync_state");
export const setSyncServiceEnabled = (enabled: boolean) =>
  call<[boolean], { enabled: boolean; active: boolean }>("set_sync_service_enabled", enabled);
export const syncAddDevice = (deviceId: string, name: string) =>
  call<[string, string], SyncState>("sync_add_device", deviceId, name);
export interface DiscoveredDevice { deviceID: string; short: string; addresses: string[] }
export const syncDiscoveredDevices = () => call<[], DiscoveredDevice[]>("sync_discovered_devices");
export const syncRemoveDevice = (deviceId: string) => call<[string], SyncState>("sync_remove_device", deviceId);
export const syncSetFolderEnabled = (presetId: string, enabled: boolean) =>
  call<[string, boolean], SyncState>("sync_set_folder_enabled", presetId, enabled);
export const syncAddCustomFolder = (path: string, label: string) =>
  call<[string, string], SyncState>("sync_add_custom_folder", path, label);
export const syncRemoveCustomFolder = (folderId: string) =>
  call<[string], SyncState>("sync_remove_custom_folder", folderId);
export const syncDismissDevice = (deviceId: string) => call<[string], SyncState>("sync_dismiss_device", deviceId);
export const syncAcceptFolder = (folderId: string) => call<[string], SyncState>("sync_accept_folder", folderId);
export const syncDismissFolder = (folderId: string, deviceId: string) =>
  call<[string, string], SyncState>("sync_dismiss_folder", folderId, deviceId);
export interface RomSystem { id: string; label: string; dir: string; count: number }
export interface RomsScan { root: string; systems: RomSystem[] }
export interface RomsImportResult { added: string[]; skipped: string[]; error: string }
export interface RomsArtworkResult { matched: number; missed: string[]; error: string }
export const romsScan = () => call<[], RomsScan>("roms_scan");
export const romsImport = () => call<[], RomsImportResult>("roms_import");
export const romsArtwork = () => call<[], RomsArtworkResult>("roms_artwork");
export interface SgdbKeyState { present: boolean; masked: string }
export const getSgdbKeyState = () => call<[], SgdbKeyState>("get_sgdb_key_state");
export const setSgdbKey = (key: string) => call<[string], SgdbKeyState>("set_sgdb_key", key);
export const syncNow = () => call<[], { ok: boolean; scanned: number }>("sync_now");
