import { Field, PanelSection } from "@decky/ui";
import { Collapsible } from "../components/widgets";
import { t } from "../i18n";
import { Display } from "../tabs/Display";
import { Games } from "../tabs/Games";
import { Lighting } from "../tabs/Lighting";
import { Power } from "../tabs/Power";
import { NativeStyles, useInjectedConfig } from "./injectedConfig";

// The sections duplicated into Steam's own settings pages. Each one renders
// the corresponding plugin tab as-is (same components, same python backend
// calls - the injected UI is a pure frontend addition) inside the native
// page's content panel. Blocks with more than a couple of controls sit in a
// spoiler (Collapsible) so the host page stays tidy; spoilers start open so
// the duplication is discoverable, and collapse state is per-mount.

function MissingConfig({ message }: { message: string }) {
  return (
    <PanelSection title="Nebel">
      <Field label={message} />
    </PanelSection>
  );
}

// Settings -> Controller: stick lighting (full Lighting tab).
export function ControllerLightingSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <>
      <NativeStyles />
      <Collapsible label={t("Nebel: Stick Lighting")} defaultOpen>
        <Lighting config={config} setConfig={setConfig} />
      </Collapsible>
    </>
  );
}

// Settings -> Power: fan curve / CPU-GPU limits (Power tab).
export function PowerLimitsSection() {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <>
      <NativeStyles />
      <Collapsible label={t("Nebel: Power Profile")} defaultOpen>
        <Power config={config} setConfig={setConfig} />
      </Collapsible>
    </>
  );
}

// Settings -> Display: external display (Display tab). Small enough to render
// without a spoiler of its own - it is a single titled group already.
export function ExternalDisplaySection() {
  return (
    <>
      <NativeStyles />
      <Display />
    </>
  );
}

// Game page -> Properties (gear): per-game tweaks for the app whose
// Properties page is open (Games tab locked to that appid - works for Steam
// games and non-Steam shortcuts alike, tweaks are keyed by appid).
export function GameTweaksSection({ appid }: { appid: string }) {
  const { config, setConfig, message } = useInjectedConfig();
  if (!config) return <MissingConfig message={message} />;
  return (
    <>
      <NativeStyles />
      <Collapsible label={t("Nebel: Game Tweaks")} defaultOpen>
        <Games config={config} setConfig={setConfig} lockedAppid={appid} />
      </Collapsible>
    </>
  );
}
