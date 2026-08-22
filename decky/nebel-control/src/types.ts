export interface PowerProfile {
  label: string;
  cpu_governor: string;
  cpu_max: string;
  cpu_underclock: string;
  gpu_max: string;
  gpu_min: string;
  fan_curve: string;
}

export interface FanCurve {
  label: string;
  curve: string;
}

export interface PowerConfig {
  general: { default_profile: string };
  profiles: Record<string, PowerProfile>;
  fan_curves: Record<string, FanCurve>;
  fan: Record<string, string>;
  underclocks: Record<string, Record<string, Record<string, string>>>;
}

export interface GameTweak {
  enabled?: boolean;
  name?: string;
  fexProfile?: string;
  fexConfig?: Record<string, string>;
  thunks?: Record<string, boolean>;
  [key: string]: any;
}

export interface Tweaks {
  global: Record<string, any>;
  games: Record<string, GameTweak>;
}

export interface InstalledGame {
  appid: string;
  name: string;
}

export interface FexProfile {
  label: string;
  config?: Record<string, string>;
}

export interface AbsControl {
  value: number;
  min: number;
  max: number;
  flat: number;
  fuzz: number;
  resolution: number;
}

export interface CalibrationState {
  supported: boolean;
  reason: string;
  controls: Record<string, AbsControl>;
  event: any;
  canApply?: boolean;
  backend?: string;
  saved?: boolean;
  params?: Record<string, number>;
}

export interface GameRef {
  appid: string;
  name: string;
}

export interface StickLedSideState {
  mode: string;
  color: string;
  colorSource: string;
  chargingIndicator: boolean;
  duotoneColorA: string;
  duotoneColorB: string;
  duotoneOrientation: string;
  chase: boolean;
  compass: boolean;
  seesaw: boolean;
  flip: boolean;
  params: Record<string, number>;
}

export interface StickLedState {
  supported: boolean;
  screenLink: boolean;
  enabled: boolean;
  maxBrightness: number;
  notifyEnabled: boolean;
  notifyColor: string;
  sides: { l: StickLedSideState; r: StickLedSideState };
  flashColors: Record<string, string>;
}

export interface SystemMonitor {
  cpuTemp: number | null;
  gpuTemp: number | null;
  skinTemp: number | null;
  fanPct: number | null;
  batteryPct: number | null;
  batteryStatus: string;
  batteryWatts: number | null;
  overlayEnabled: boolean;
}

export interface Config {
  power: PowerConfig;
  powerDefaults: PowerConfig;
  tweaks: Tweaks;
  installedGames: InstalledGame[];
  fexProfiles: Record<string, FexProfile>;
  cpuDeviceClass: string;
  osVersion: string;
  sshEnabled: boolean;
  controllerType: string;
  controllerTypes: DropdownChoice[];
  calibration?: CalibrationState;
  game?: GameRef | null;
  selectedGame?: GameRef | null;
  stickLed: StickLedState;
  sharedStorageEnabled: boolean;
}

export interface DisplayConnector {
  connector: string;
  connected: boolean;
  internal: boolean;
  modes: string[];
}

export interface RememberedDisplay {
  width: number;
  height: number;
  orientation: string;
}

export interface DisplayState {
  connectors: DisplayConnector[];
  primaryConnector: string;
  useExternal: boolean;
  connector: string;
  width: number;
  height: number;
  orientation: string;
  remembered: Record<string, RememberedDisplay>;
}

export type Capture = Record<string, { center: number; min: number; max: number; range: number }>;

export interface DropdownChoice {
  data: string;
  label: string;
}

export interface SyncDevice {
  id: string;
  name: string;
  connected: boolean;
}

export interface SyncFolder {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
  pathExists: boolean;
  sharedWith: string[];
  custom: boolean;
  syncState?: string;
}

export interface SyncPendingDevice {
  id: string;
  name: string;
}

export interface SyncPendingFolder {
  id: string;
  label: string;
  offeredBy: string[];
}

export interface SyncState {
  installed: boolean;
  serviceEnabled: boolean;
  serviceActive: boolean;
  configReady: boolean;
  myId: string;
  devices: SyncDevice[];
  folders: SyncFolder[];
  pendingDevices: SyncPendingDevice[];
  pendingFolders: SyncPendingFolder[];
  error: string;
}
