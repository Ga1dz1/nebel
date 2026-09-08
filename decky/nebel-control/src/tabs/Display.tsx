import { ButtonItem, Field, PanelSection, ToggleField } from "@decky/ui";
import { useEffect, useState } from "react";
import { getDisplayState, restartGamescopeSession, setDisplayConfig, setSeatAConfig } from "../backend";
import { InternalTouchpadRow } from "../components/InternalTouchpadRow";
import { SelectEdit } from "../components/widgets";
import { t } from "../i18n";
import type { DisplayConnector, DisplayState } from "../types";

// "Display mode" here is game mode's output routing: the internal panel
// alone, an external display alone (dock mode), or both at once (duo).
// gamescope picks its output(s) from STARTUP flags (see sessions.d/steam),
// so a mode change only takes effect on a session restart - there's no live
// re-pick. Mirroring/extending beyond duo is desktop-mode-only (Plasma's
// display settings).
const INTERNAL = "__internal__";
const DUO = "__duo__";

// An external panel can be physically portrait (the Retroid Dual Screen
// addon exposes only 1080x1920 but mounts landscape). gamescope rotates it
// via --force-external-orientation + the rotation shader (armada patches
// 0014/0005); portrait WITHOUT a rotation is rejected by the backend and by
// the session script, so pre-select one the user can flip if it's wrong.
const ORIENTATION_OPTIONS = [
  { data: "normal", label: t("Normal") },
  { data: "left", label: t("90°") },
  { data: "right", label: t("270°") },
  { data: "upsidedown", label: t("180°") },
];

const isPortrait = (width: number, height: number) => width > 0 && height > 0 && width < height;

// What the second Steam window (seat A) shows while a game runs on the main
// screen. Stored in /etc/nebel/seat-a.conf and read live by the dualscreen
// stack (seatctl's /config endpoint, seatA-autostart), so changes apply
// without a session restart.
const SEAT_CONTENT_OPTIONS = [
  { data: "card", label: t("Game card") },
  { data: "qam", label: t("Quick menu (QAM)") },
  { data: "pause", label: t("Pause menu") },
  { data: "off", label: t("Second screen off") },
];

const connectorLabel = (c: DisplayConnector) => {
  const base = c.name ? `${c.name} (${c.connector})` : c.connector;
  return c.connected ? base : t("{connector} (disconnected)", { connector: base });
};

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
      <PanelSection title={t("Display")}>
        <Field label={loadMessage} />
      </PanelSection>
    );
  }

  const externals = state.connectors.filter((c) => !c.internal);
  const mode = state.mode || (state.useExternal ? "external" : "internal");
  const selectedMode = mode === "duo" ? DUO : mode === "external" ? state.connector : INTERNAL;
  const modeOptions = [
    { data: INTERNAL, label: t("Internal Screen") },
    ...externals.map((c) => ({ data: c.connector, label: connectorLabel(c) })),
    { data: DUO, label: t("Duo (both screens)") },
  ];
  const activeExternal = externals.find((c) => c.connector === state.connector);
  // A disconnected display has nothing meaningful to configure right now -
  // its remembered settings come back when it's plugged in again.
  const activeDisconnected = mode === "external" && (!activeExternal || !activeExternal.connected);
  const currentMode = `${state.width}x${state.height}`;
  const modeChoices = activeExternal?.modes.length ? activeExternal.modes : [currentMode];
  const resolutionOptions = modeChoices.map((m) => ({ data: m, label: m }));

  const persist = (next: Partial<DisplayState>) => {
    const merged = { ...state, ...next };
    const mergedMode = merged.mode || (merged.useExternal ? "external" : "internal");
    setSaving(true);
    setErrorMessage("");
    setDisplayConfig(mergedMode !== "internal", merged.connector, merged.width, merged.height, merged.orientation, mergedMode, merged.autoDuo)
      .then(setState)
      .catch((error) => setErrorMessage(String(error)))
      .finally(() => setSaving(false));
  };

  const selectMode = (choice: string) => {
    if (choice === INTERNAL) {
      persist({ mode: "internal", useExternal: false });
      return;
    }
    if (choice === DUO) {
      persist({ mode: "duo", useExternal: true });
      return;
    }
    const target = externals.find((c) => c.connector === choice);
    const previous = state.remembered[choice];
    const [w, h] = (target?.modes[0] || "1920x1080").split("x").map(Number);
    const width = previous?.width || w || 1920;
    const height = previous?.height || h || 1080;
    let orientation = previous?.orientation || "normal";
    if (isPortrait(width, height) && orientation === "normal") {
      // Portrait panel + no rotation would be rejected by the backend (and
      // ignored by the session) - pre-select one; the user flips it below
      // if the image comes up the wrong way round.
      orientation = "left";
    }
    persist({ mode: "external", useExternal: true, connector: choice, width, height, orientation });
  };

  const selectResolution = (value: string) => {
    const [w, h] = value.split("x").map(Number);
    if (!w || !h) return;
    persist({
      width: w,
      height: h,
      orientation: isPortrait(w, h) && state.orientation === "normal" ? "left" : state.orientation,
    });
  };

  const selectOrientation = (orientation: string) => {
    persist({ orientation });
  };

  const persistSeat = (next: Partial<Pick<DisplayState, "seatContent" | "seatFullSteam">>) => {
    setSaving(true);
    setErrorMessage("");
    const merged = { ...state, ...next };
    setSeatAConfig(merged.seatContent, merged.seatFullSteam)
      .then(setState)
      .catch((error) => setErrorMessage(String(error)))
      .finally(() => setSaving(false));
  };

  return (
    <>
      <PanelSection title={t("Internal Screen")}>
        <InternalTouchpadRow />
      </PanelSection>
      <PanelSection title={t("Dock Station")}>
      <SelectEdit label={t("Display Mode")} value={selectedMode} options={modeOptions} onChange={selectMode} disabled={saving} />
      {mode === "internal" && (
        <ToggleField
          label={t("Auto-Duo on connect")}
          description={t("Switch to Duo automatically when an external display is plugged in")}
          checked={state.autoDuo !== false}
          onChange={(enabled) => persist({ autoDuo: enabled })}
        />
      )}
      {mode === "duo" && (
        <Field label={t("Game mode runs on the external display while a second Steam window stays on the internal screen. Falls back to the internal screen when no external display is connected. Applied on game mode restart.")} />
      )}
      {mode === "external" && (
        <>
          <SelectEdit label={t("Resolution")} value={currentMode} options={resolutionOptions} onChange={selectResolution} disabled={saving || activeDisconnected} />
          <SelectEdit label={t("Rotation")} value={state.orientation} options={ORIENTATION_OPTIONS} onChange={selectOrientation} disabled={saving || activeDisconnected} />
          {isPortrait(state.width, state.height) && (
            <Field label={t("This is a portrait panel - pick the rotation that makes the image upright. Applied on game mode restart.")} />
          )}
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
      {(mode === "duo" || externals.some((c) => c.connected)) && (
        <PanelSection title={t("Second Screen (Duo)")}>
          <SelectEdit
            label={t("Second screen while gaming")}
            value={state.seatContent}
            options={SEAT_CONTENT_OPTIONS}
            onChange={(seatContent) => persistSeat({ seatContent })}
            disabled={saving}
          />
          <Field label={t("Applies live while a game runs on the main screen. \"Second screen off\" closes the second Steam window; the panel itself stays powered by the session.")} />
          <ToggleField
            label={t("Full Steam on the second screen")}
            description={t("The second screen runs the full Steam interface instead of the companion view. Experimental - applies when the second window is (re)created.")}
            checked={state.seatFullSteam}
            disabled={saving || state.seatContent === "off"}
            onChange={(seatFullSteam) => persistSeat({ seatFullSteam })}
          />
          <Field label={t("Window management: in Steam's Switch Windows menu, Y sends a window to the internal screen. Touch on the second screen controls the window shown there.")} />
        </PanelSection>
      )}
    </>
  );
}
