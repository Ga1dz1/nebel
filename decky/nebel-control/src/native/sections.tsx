import { ButtonItem, Field, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { t } from "../i18n";
import { Display } from "../tabs/Display";
import { AddGameSection, Games } from "../tabs/Games";
import { Roms } from "../tabs/Roms";
import { MonitorRows, NotifyFlashRows, OverlayToggleRow } from "../tabs/Home";
import { Lighting } from "../tabs/Lighting";
import { Power } from "../tabs/Power";
import { Sync } from "../tabs/Sync";
import { ControllerExtras, SharedStorageRow, SshRow, SupporterKeySection } from "../tabs/System";
import { NativeStyles, useInjectedConfig } from "./injectedConfig";

// The sections duplicated into Steam's own settings pages. Each one renders
// the corresponding plugin tab as-is (same components, same python backend
// calls - the injected UI is a pure frontend addition) inside the native
// page's content panel, without an extra spoiler around it: the tabs already
// group their controls into titled PanelSections that read like the host
// page's own groups.

function MissingConfig({ message }: { message: string }) {
  return (
    <PanelSection>
      <Field label={message} />
    </PanelSection>
  );
}

// Settings -> Controller: controller-type emulation + calibration first
// (they concern the gamepad itself), then the full Lighting tab.
export function ControllerLightingSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <ControllerExtras config={config} setConfig={setConfig} />
      <Lighting config={config} setConfig={setConfig} />
    </div>
  );
}

// Settings -> Power: live hardware readout (temps, fan, battery) above the
// fan curve / CPU-GPU limits (Power tab).
export function PowerLimitsSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <PanelSection title={t("Monitoring")}>
        <MonitorRows />
      </PanelSection>
      <Power config={config} setConfig={setConfig} />
    </div>
  );
}

// Settings -> Display: external display (Display tab).
export function ExternalDisplaySection() {
  return (
    <div className="nebel-native">
      <NativeStyles />
      <Display />
    </div>
  );
}

// Game page -> Properties (gear): per-game tweaks for the app whose
// Properties page is open (Games tab locked to that appid - works for Steam
// games and non-Steam shortcuts alike, tweaks are keyed by appid). The
// injected variant hides the pickers Steam's own Compatibility page already
// provides and shows x86_64-only knobs only when they apply.
export function GameTweaksSection({ appid }: { appid: string }) {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <Games config={config} setConfig={setConfig} lockedAppid={appid} injected />
    </div>
  );
}

// Settings -> Cloud: Nebel sync (Syncthing pairing, folders) - the Sync tab
// lives next to Steam Cloud since both are "sync my stuff" settings.
export function CloudSyncSection() {
  return (
    <div className="nebel-native">
      <NativeStyles />
      <Sync />
    </div>
  );
}

// Settings -> System: entry point to the fullscreen control center, plus
// shared-storage mounting. Neutrally labeled ("Control Center", not "Nebel
// Control") so the settings page keeps a stock look - the brand only shows
// on the fullscreen page itself, where it belongs.
export function ControlCenterSection() {
  const { config, setConfig } = useInjectedConfig();
  return (
    <div className="nebel-native">
      <NativeStyles />
      <PanelSection title={t("Control Center")}>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => Navigation.Navigate("/nebel-control")}>
            {t("Open Control Center")}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      {config && (
        <PanelSection title={t("Storage")}>
          <SharedStorageRow config={config} setConfig={setConfig} />
        </PanelSection>
      )}
      <SupporterKeySection />
    </div>
  );
}

// Settings -> Library: the working "Add non-Steam game" picker (Steam's own
// Browse dialog is broken in the ARM64 client), plus the ROM library
// (per-system folders, import, covers).
export function LibraryAddGameSection() {
  return (
    <div className="nebel-native">
      <NativeStyles />
      <AddGameSection />
      <Roms qam={false} />
    </div>
  );
}

// Settings -> Internet: SSH access toggle.
export function SshSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <PanelSection title={t("SSH")}>
        <SshRow config={config} setConfig={setConfig} />
      </PanelSection>
    </div>
  );
}

// Settings -> In Game: gamescope FPS overlay for all games (next to Steam's
// own FPS counter options).
export function InGameOverlaySection() {
  return (
    <div className="nebel-native">
      <NativeStyles />
      <PanelSection title={t("Overlay")}>
        <OverlayToggleRow />
      </PanelSection>
    </div>
  );
}

// Settings -> Notifications: stick-LED flash on notifications + flash color.
export function NotificationFlashSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  if (!config.stickLed?.supported) return null;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <PanelSection title={t("Stick Lighting")}>
        <NotifyFlashRows config={config} setConfig={setConfig} />
      </PanelSection>
    </div>
  );
}
