import { ButtonItem, Field, Navigation, PanelSection, PanelSectionRow } from "@decky/ui";
import { t } from "../i18n";
import { Display } from "../tabs/Display";
import { AddGameSection, Games } from "../tabs/Games";
import { Lighting } from "../tabs/Lighting";
import { Power } from "../tabs/Power";
import { Sync } from "../tabs/Sync";
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

// Settings -> Controller: stick lighting (full Lighting tab).
export function ControllerLightingSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
      <Lighting config={config} setConfig={setConfig} />
    </div>
  );
}

// Settings -> Power: fan curve / CPU-GPU limits (Power tab).
export function PowerLimitsSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <div className="nebel-native">
      <NativeStyles />
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

// Settings -> System: entry point to the fullscreen control center, plus the
// "Add non-Steam game" picker (Steam's own Browse dialog is broken in the
// ARM64 client, so this is the working way to register shortcuts - it belongs
// in native settings now that the plugin no longer shows in the QAM list).
// Neutrally labeled ("Control Center", not "Nebel Control") so the settings
// page keeps a stock look - the brand only shows on the fullscreen page
// itself, where it belongs.
export function ControlCenterSection() {
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
      <AddGameSection />
    </div>
  );
}
