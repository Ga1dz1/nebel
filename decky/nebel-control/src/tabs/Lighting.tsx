import { ButtonItem, Field, PanelSection } from "@decky/ui";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  setStickLedChargingIndicator as applyStickLedChargingIndicator,
  setStickLedChase as applyStickLedChase,
  setStickLedColor as applyStickLedColor,
  setStickLedColorSource as applyStickLedColorSource,
  setStickLedCompass as applyStickLedCompass,
  setStickLedDuotoneColor as applyStickLedDuotoneColor,
  setStickLedDuotoneOrientation as applyStickLedDuotoneOrientation,
  setStickLedFlashColor as applyStickLedFlashColor,
  setStickLedMode as applyStickLedMode,
  setStickLedParam as applyStickLedParam,
  setStickLedScreenLink as applyStickLedScreenLink,
  setStickLedEnabled as applyStickLedEnabled,
  setStickLedMaxBrightness as applyStickLedMaxBrightness,
  setStickLedSeesaw as applyStickLedSeesaw,
  setStickLedFlip as applyStickLedFlip,
} from "../backend";
import { ColorPicker } from "../components/ColorPicker";
import { ModePreview } from "../components/ModePreview";
import { PresetSwatchGrid, SelectEdit, SliderEdit, ToggleRow } from "../components/widgets";
import type { Config, StickLedSideState, StickLedState } from "../types";

const PRESET_COLORS: { label: string; value: string }[] = [
  { label: "Blue", value: "0050FF" },
  { label: "Cyan", value: "00E5FF" },
  { label: "Purple", value: "8000FF" },
  { label: "Pink", value: "FF0080" },
  { label: "Red", value: "FF0000" },
  { label: "Orange", value: "FF8000" },
  // Matches stick-led-color's DEFAULT_DUOTONE_COLOR_B - pure gold (FFD700)
  // read as noticeably greenish on this LED.
  { label: "Yellow", value: "FFAA00" },
  { label: "Green", value: "00FF00" },
  { label: "White", value: "FFFFFF" },
];

function patchSide(stickLed: StickLedState, side: "l" | "r", patch: Partial<StickLedSideState>): StickLedState {
  return { ...stickLed, sides: { ...stickLed.sides, [side]: { ...stickLed.sides[side], ...patch } } };
}

const SIDE_OPTIONS: { data: string; label: string }[] = [
  { data: "l", label: "Left Stick" },
  { data: "r", label: "Right Stick" },
];

const MODE_OPTIONS: { data: string; label: string }[] = [
  { data: "static", label: "Static" },
  { data: "breathing", label: "Breathing" },
  { data: "rainbow", label: "Rainbow" },
  { data: "wave", label: "Wave (rainbow spread around the ring)" },
  { data: "starlight", label: "Starlight (random zone twinkle)" },
  { data: "spin", label: "Spin" },
  { data: "reactive", label: "Reactive (sticks + buttons)" },
  { data: "multidot", label: "Multidot (RGB chase)" },
  { data: "ambilight", label: "Ambilight (matches screen)" },
  { data: "duotone", label: "Duotone (two-color split)" },
];
const COLOR_VISIBLE_MODES = new Set(["static", "breathing", "spin"]);
const COLOR_SOURCE_OPTIONS: { data: string; label: string }[] = [
  { data: "static", label: "Custom color" },
  { data: "battery", label: "Battery level" },
  { data: "random", label: "Random (unpredictable color shift)" },
  { data: "shimmer", label: "Shimmer (pale/cool to rich/warm)" },
];

const DUOTONE_ORIENTATION_OPTIONS: { data: string; label: string }[] = [
  { data: "horizontal", label: "Horizontal" },
  { data: "vertical", label: "Vertical" },
  { data: "diagonal", label: "Diagonal" },
];

const FLASH_BUTTON_OPTIONS: { data: string; label: string }[] = [
  { data: "south", label: "South" },
  { data: "east", label: "East" },
  { data: "north", label: "North" },
  { data: "west", label: "West" },
  { data: "l1", label: "L1" },
  { data: "r1", label: "R1" },
  { data: "l3", label: "L3 (left stick click)" },
  { data: "r3", label: "R3 (right stick click)" },
  { data: "l4", label: "L4 (left paddle)" },
  { data: "r4", label: "R4 (right paddle)" },
  { data: "start", label: "Start" },
  { data: "select", label: "Select" },
  { data: "dpad_up", label: "D-Pad Up" },
  { data: "dpad_down", label: "D-Pad Down" },
  { data: "dpad_left", label: "D-Pad Left" },
  { data: "dpad_right", label: "D-Pad Right" },
  { data: "other", label: "Other buttons" },
];
const DEFAULT_FLASH_COLOR = "FFFFFF";

const PARAM_UI: Record<string, { label: string; min: number; max: number; step: number; modes: Set<string>; toBackend: (v: number) => number; fromBackend: (v: number) => number }> = {
  speed: {
    label: "Speed",
    min: 25,
    max: 300,
    step: 25,
    modes: new Set(["breathing", "rainbow", "spin", "multidot", "ambilight", "duotone", "wave", "starlight"]),
    toBackend: (v) => v / 100,
    fromBackend: (v) => Math.round(v * 100),
  },
  intensity: {
    label: "Intensity (min brightness)",
    min: 0,
    max: 50,
    step: 5,
    modes: new Set(["breathing", "spin", "multidot", "reactive", "duotone", "starlight"]),
    toBackend: (v) => v / 100,
    fromBackend: (v) => Math.round(v * 100),
  },
  size: {
    label: "Size",
    min: 1,
    max: 3,
    step: 1,
    modes: new Set(["spin", "multidot", "reactive"]),
    toBackend: (v) => v,
    fromBackend: (v) => v,
  },
};
const PARAM_DEFAULTS: Record<string, number> = { speed: 1.0, intensity: 0.15, size: 2 };

export function Lighting({ config, setConfig }: {
  config: Config;
  setConfig: Dispatch<SetStateAction<Config | null>>;
}) {
  const [colorsExpanded, setColorsExpanded] = useState(false);
  const [customColorExpanded, setCustomColorExpanded] = useState(false);
  const [flashExpanded, setFlashExpanded] = useState(false);
  const [flashButton, setFlashButton] = useState("south");
  const [selectedSide, setSelectedSide] = useState<"l" | "r">("l");
  const [separate, setSeparate] = useState(false);
  const stickLed = config.stickLed;
  const sideState = stickLed?.sides?.[selectedSide];
  const mode = sideState?.mode || "static";
  // When not "separate", every stick-lighting action targets both sticks at
  // once (mirrored) so the panel behaves like a single combined control -
  // the simpler default most people expect. Ticking "separate" scopes
  // everything below to just the selected stick, matching the underlying
  // backend state, which is always independent per stick regardless of
  // this toggle.
  const targetSides: ("l" | "r")[] = separate ? [selectedSide] : ["l", "r"];

  const setStickLedMode = async (nextMode: string) => {
    if (!stickLed) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].mode);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { mode: nextMode });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedMode(s, nextMode);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { mode: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedScreenLink = async (value: boolean) => {
    if (!stickLed) return;
    const previous = stickLed.screenLink;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, screenLink: value } } : current));
    try {
      const applied = await applyStickLedScreenLink(value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, screenLink: previous } } : current));
    }
  };
  const setStickLedEnabled = async (value: boolean) => {
    if (!stickLed) return;
    const previous = stickLed.enabled;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, enabled: value } } : current));
    try {
      const applied = await applyStickLedEnabled(value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, enabled: previous } } : current));
    }
  };
  const setStickLedMaxBrightness = async (value: number) => {
    if (!stickLed) return;
    const previous = stickLed.maxBrightness;
    setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, maxBrightness: value } } : current));
    try {
      const applied = await applyStickLedMaxBrightness(value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => (current ? { ...current, stickLed: { ...current.stickLed, maxBrightness: previous } } : current));
    }
  };
  const setStickLedColor = async (hex: string) => {
    if (!stickLed || !sideState) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].color);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { mode: "static", color: hex });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedColor(s, hex);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { color: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedFlashColor = async (hex: string) => {
    if (!stickLed) return;
    const previous = stickLed.flashColors[flashButton];
    setConfig((current) =>
      current
        ? { ...current, stickLed: { ...current.stickLed, flashColors: { ...current.stickLed.flashColors, [flashButton]: hex } } }
        : current,
    );
    try {
      const applied = await applyStickLedFlashColor(flashButton, hex);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) =>
        current
          ? { ...current, stickLed: { ...current.stickLed, flashColors: { ...current.stickLed.flashColors, [flashButton]: previous } } }
          : current,
      );
    }
  };
  const setStickLedParam = async (param: string, backendValue: number) => {
    if (!stickLed || !sideState) return;
    const effectiveMode = mode;
    const key = `${param}_${effectiveMode}`;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].params[key]);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { params: { ...sl.sides[s].params, [key]: backendValue } });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedParam(s, param, effectiveMode, backendValue);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { params: { ...sl.sides[s].params, [key]: previous[i] } }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedDuotoneColor = async (slot: "a" | "b", hex: string) => {
    if (!stickLed || !sideState) return;
    const field = slot === "a" ? "duotoneColorA" : "duotoneColorB";
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s][field]);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { [field]: hex });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedDuotoneColor(s, slot, hex);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { [field]: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedDuotoneOrientation = async (orientation: string) => {
    if (!stickLed || !sideState) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].duotoneOrientation);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { duotoneOrientation: orientation });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedDuotoneOrientation(s, orientation);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { duotoneOrientation: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedColorSource = async (source: string) => {
    if (!stickLed || !sideState) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].colorSource);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { colorSource: source });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedColorSource(s, source);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { colorSource: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedChargingIndicator = async (value: boolean) => {
    if (!stickLed || !sideState) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s].chargingIndicator);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { chargingIndicator: value });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await applyStickLedChargingIndicator(s, value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { chargingIndicator: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const makeToggleSetter = (
    field: "chase" | "compass" | "seesaw",
    apply: (side: "l" | "r", value: boolean) => Promise<StickLedState>,
  ) => async (value: boolean) => {
    if (!stickLed || !sideState) return;
    const sides = targetSides;
    const previous = sides.map((s) => stickLed.sides[s][field]);
    setConfig((current) => {
      if (!current) return current;
      let sl = current.stickLed;
      for (const s of sides) sl = patchSide(sl, s, { [field]: value });
      return { ...current, stickLed: sl };
    });
    try {
      let applied = stickLed;
      for (const s of sides) applied = await apply(s, value);
      setConfig((current) => (current ? { ...current, stickLed: applied } : current));
    } catch (error) {
      setConfig((current) => {
        if (!current) return current;
        let sl = current.stickLed;
        sides.forEach((s, i) => { sl = patchSide(sl, s, { [field]: previous[i] }); });
        return { ...current, stickLed: sl };
      });
    }
  };
  const setStickLedChase = makeToggleSetter("chase", applyStickLedChase);
  const setStickLedCompass = makeToggleSetter("compass", applyStickLedCompass);
  const setStickLedSeesaw = makeToggleSetter("seesaw", applyStickLedSeesaw);
  const setStickLedFlip = makeToggleSetter("flip", applyStickLedFlip);

  if (!stickLed?.supported || !sideState) {
    return (
      <PanelSection title="Stick Lighting">
        <Field label="No addressable stick lighting hardware detected on this device." />
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Stick Lighting">
      <ToggleRow
        label="Enable"
        description="Turn both sticks off entirely, without losing the mode/color settings below"
        value={stickLed.enabled}
        onChange={setStickLedEnabled}
      />
      {!stickLed.enabled && <Field label="Sticks are off - settings below are kept, not applied." />}
      {stickLed.enabled && (
        <>
      <ToggleRow
        label="Follow screen brightness"
        description="Dim both sticks along with the display backlight"
        value={!!stickLed.screenLink}
        onChange={setStickLedScreenLink}
      />
      {!stickLed.screenLink && (
        <SliderEdit
          label="Max Brightness"
          value={Math.round((stickLed.maxBrightness ?? 1) * 100)}
          min={0}
          max={100}
          step={5}
          onChange={(value) => setStickLedMaxBrightness(value / 100)}
        />
      )}
      <ToggleRow
        label="Configure each stick separately"
        description="Off: changes below apply to both sticks at once. On: pick a stick and edit just that one."
        value={separate}
        onChange={setSeparate}
      />
      {separate && (
        <SelectEdit label="Stick" value={selectedSide} options={SIDE_OPTIONS} onChange={(value) => setSelectedSide(value as "l" | "r")} />
      )}
      <SelectEdit label="Mode" value={mode} options={MODE_OPTIONS} onChange={setStickLedMode} />
      <ModePreview
        mode={mode}
        color={sideState.color}
        duotoneColorA={sideState.duotoneColorA}
        duotoneColorB={sideState.duotoneColorB}
      />
      {mode === "spin" && (
        <ToggleRow
          label="Soft trail"
          description="Trailing fade (uses Size below) instead of a single hard-edged dot"
          value={!!sideState.chase}
          onChange={setStickLedChase}
        />
      )}
      {mode === "reactive" && (
        <ToggleRow
          label="Compass"
          description="Point the lit zone(s) at the stick's push direction instead of lighting evenly"
          value={!!sideState.compass}
          onChange={setStickLedCompass}
        />
      )}
      {mode === "duotone" && (
        <ToggleRow
          label="Seesaw"
          description="Breathe the two color groups against each other instead of a static split"
          value={!!sideState.seesaw}
          onChange={setStickLedSeesaw}
        />
      )}
      {Object.entries(PARAM_UI)
        .filter(([, spec]) => spec.modes.has(mode))
        .map(([param, spec]) => {
          const key = `${param}_${mode}`;
          const raw = sideState.params[key] ?? PARAM_DEFAULTS[param];
          return (
            <SliderEdit
              key={param}
              label={spec.label}
              value={spec.fromBackend(raw)}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              onChange={(value) => setStickLedParam(param, spec.toBackend(value))}
            />
          );
        })}
      {COLOR_VISIBLE_MODES.has(mode) && (
        <>
          <ButtonItem layout="below" onClick={() => setColorsExpanded((expanded) => !expanded)}>
            {colorsExpanded ? "Hide colors ▲" : "Colors ▼"}
          </ButtonItem>
          {colorsExpanded && (
            <>
              <SelectEdit
                label="Color Source"
                value={sideState.colorSource || "static"}
                options={COLOR_SOURCE_OPTIONS}
                onChange={setStickLedColorSource}
              />
              {sideState.colorSource === "battery" && (
                <ToggleRow
                  label="Charging indicator"
                  description="Spin a blue dot around the stick while charging"
                  value={sideState.chargingIndicator}
                  onChange={setStickLedChargingIndicator}
                />
              )}
              {sideState.colorSource !== "battery" && sideState.colorSource !== "random" && (
                <>
                  <PresetSwatchGrid colors={PRESET_COLORS} selected={sideState.color} onSelect={setStickLedColor} />
                  <ButtonItem layout="below" onClick={() => setCustomColorExpanded((expanded) => !expanded)}>
                    {customColorExpanded ? "Hide custom color ▲" : "Custom color (advanced) ▼"}
                  </ButtonItem>
                  {customColorExpanded && (
                    <ColorPicker hex={sideState.color} onChange={setStickLedColor} />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {mode === "reactive" && (
        <>
          <ButtonItem layout="below" onClick={() => setFlashExpanded((expanded) => !expanded)}>
            {flashExpanded ? "Hide flash colors ▲" : "Show flash colors ▼"}
          </ButtonItem>
          {flashExpanded && (
            <>
              <SelectEdit label="Button" value={flashButton} options={FLASH_BUTTON_OPTIONS} onChange={setFlashButton} />
              <PresetSwatchGrid
                colors={PRESET_COLORS}
                selected={stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR}
                onSelect={setStickLedFlashColor}
              />
              <ColorPicker
                hex={stickLed.flashColors[flashButton] ?? DEFAULT_FLASH_COLOR}
                onChange={setStickLedFlashColor}
              />
            </>
          )}
        </>
      )}
      {mode === "duotone" && (
        <>
          <SelectEdit
            label="Split"
            value={sideState.duotoneOrientation || "horizontal"}
            options={DUOTONE_ORIENTATION_OPTIONS}
            onChange={setStickLedDuotoneOrientation}
          />
          <ColorPicker
            label="Color A"
            hex={sideState.duotoneColorA}
            onChange={(hex) => setStickLedDuotoneColor("a", hex)}
          />
          <ColorPicker
            label="Color B"
            hex={sideState.duotoneColorB}
            onChange={(hex) => setStickLedDuotoneColor("b", hex)}
          />
        </>
      )}
      <ToggleRow
        label="Flip stick ring"
        description="Rotate the LED ring 180° for stick variants wired upside-down (fixes compass/direction on some RP6 units)"
        value={!!sideState.flip}
        onChange={setStickLedFlip}
      />
        </>
      )}
    </PanelSection>
  );
}
