import { ButtonItem, Field, PanelSection } from "@decky/ui";
import { useEffect, useState } from "react";
import { getDisplayState, restartGamescopeSession, setDisplayConfig } from "../backend";
import { SelectEdit } from "../components/widgets";
import { t } from "../i18n";
import type { DisplayState } from "../types";

// gamescope only ever drives one embedded output at a time (--prefer-output
// picks the first available from a priority list at startup, there's no
// live multi-monitor/hotplug re-pick) - so "primary display" here means
// which single connector the whole game-mode session targets, not an
// extend/mirror choice.
const INTERNAL = "__internal__";

export function Display(_props: { qam?: boolean }) {
  const [state, setState] = useState<DisplayState | null>(null);
  const [loadMessage, setLoadMessage] = useState(t("Loading"));
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    getDisplayState()
      .then(setState)
      .catch((error) => setLoadMessage(String(error)));
  }, []);

  if (!state) {
    return (
      <PanelSection title={t("DISPLAY")}>
        <Field label={loadMessage} />
      </PanelSection>
    );
  }

  const externals = state.connectors.filter((c) => !c.internal);
  const selectedConnector = state.useExternal ? state.connector : INTERNAL;
  const primaryOptions = [
    { data: INTERNAL, label: t("Internal Screen") },
    ...externals.map((c) => ({
      data: c.connector,
      label: !c.connected ? t("{connector} (disconnected)", { connector: c.connector }) : c.connector,
    })),
  ];
  const activeExternal = externals.find((c) => c.connector === state.connector);
  // A disconnected display has nothing meaningful to configure right now -
  // its remembered settings come back when it's plugged in again.
  const activeDisconnected = state.useExternal && (!activeExternal || !activeExternal.connected);
  const currentMode = `${state.width}x${state.height}`;
  const modeChoices = activeExternal?.modes.length ? activeExternal.modes : [currentMode];
  const modeOptions = modeChoices.map((mode) => ({ data: mode, label: mode }));

  const persist = (next: Partial<DisplayState>) => {
    const merged = { ...state, ...next };
    setSaving(true);
    setErrorMessage("");
    setDisplayConfig(merged.useExternal, merged.connector, merged.width, merged.height, merged.orientation)
      .then(setState)
      .catch((error) => setErrorMessage(String(error)))
      .finally(() => setSaving(false));
  };

  const selectPrimary = (connector: string) => {
    if (connector === INTERNAL) {
      persist({ useExternal: false });
      return;
    }
    const target = externals.find((c) => c.connector === connector);
    const previous = state.remembered[connector];
    const [w, h] = (target?.modes[0] || "1920x1080").split("x").map(Number);
    persist({
      useExternal: true,
      connector,
      width: previous?.width || w || 1920,
      height: previous?.height || h || 1080,
      // gamescope has no way to rotate a non-internal output (there's no
      // Rotation control here for that reason) - orientation is meaningless
      // for an external display, always "normal".
      orientation: "normal",
    });
  };

  const selectMode = (mode: string) => {
    const [w, h] = mode.split("x").map(Number);
    if (!w || !h) return;
    persist({ width: w, height: h });
  };

  return (
    <PanelSection title={t("EXTERNAL DISPLAY")}>
      <SelectEdit label={t("Primary Display")} value={selectedConnector} options={primaryOptions} onChange={selectPrimary} disabled={saving} />
      {state.useExternal && (
        <>
          <SelectEdit label={t("Resolution")} value={currentMode} options={modeOptions} onChange={selectMode} disabled={saving || activeDisconnected} />
          <Field label={t("Rotation isn't available for an external display (gamescope only rotates the internal screen).")} />
        </>
      )}
      {externals.length === 0 && (
        <Field label={t("No external display detected. Connect one (dock/USB-C/HDMI) to choose it here.")} />
      )}
      {activeDisconnected && (
        <Field label={t("This display isn't connected right now - game mode runs on the internal screen until it's plugged back in. Its settings are remembered.")} />
      )}
      {errorMessage && <Field label={t("Error: {message}", { message: errorMessage })} />}
      <div className="nebel-reset-row">
        <ButtonItem
          layout="below"
          disabled={restarting}
          onClick={() => {
            setRestarting(true);
            setErrorMessage("");
            // A successful restart tears down this very session (and Decky
            // with it), so there's nothing to update on success - only a
            // failure ever reaches this component again, and the button
            // must re-enable then or a failed restart looks identical to a
            // silently-still-in-progress one with no way to retry.
            restartGamescopeSession()
              .catch((error) => setErrorMessage(String(error)))
              .finally(() => setRestarting(false));
          }}
        >
          {t("Apply & Restart Game Mode")}
        </ButtonItem>
      </div>
    </PanelSection>
  );
}
