import { ButtonItem, Dropdown, DropdownItemInternal, Field, Focusable, Navigation, PanelSection, PanelSectionRow, SliderField, ToggleField } from "@decky/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import { t } from "../i18n";
import type { DropdownChoice } from "../types";

type Option = string | DropdownChoice;

export function SelectEdit({ label, value, options, onChange, labelBelow, disabled }: {
  label?: ReactNode;
  value: any;
  options: Option[];
  onChange: (data: any) => void;
  labelBelow?: boolean;
  disabled?: boolean;
}) {
  const rgOptions = options.map((option) => (typeof option === "string" ? { data: option, label: option } : option));
  return (
    <PanelSectionRow>
      {label === undefined ? (
        <Dropdown disabled={disabled} selectedOption={value} rgOptions={rgOptions} onChange={(option) => onChange(option.data)} />
      ) : labelBelow ? (
        <Field label={label} childrenLayout="below" childrenContainerWidth="max" disabled={disabled}>
          <Dropdown disabled={disabled} selectedOption={value} rgOptions={rgOptions} onChange={(option) => onChange(option.data)} />
        </Field>
      ) : (
        <DropdownItemInternal disabled={disabled} childrenContainerWidth="max" label={label} selectedOption={value} rgOptions={rgOptions} onChange={(option) => onChange(option.data)} />
      )}
    </PanelSectionRow>
  );
}

// "More on the full page" affordance for simplified QAM tabs: jumps to the
// fullscreen /nebel-control route where the complete controls live.
export function OpenFullScreenButton() {
  return (
    <PanelSection>
      <ButtonItem
        layout="below"
        onClick={() => {
          Navigation.Navigate("/nebel-control");
          Navigation.CloseSideMenus();
        }}
      >
        {t("Open full screen")}
      </ButtonItem>
    </PanelSection>
  );
}

// Progressive disclosure: a ButtonItem header with a chevron that shows/hides
// its children. Closed by default so rarely-needed options stay out of the way.
export function Collapsible({ label, children, defaultOpen }: {
  label: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <>
      <ButtonItem layout="below" onClick={() => setOpen((value) => !value)}>
        {open ? "▾ " : "▸ "}{label}
      </ButtonItem>
      {open ? children : null}
    </>
  );
}

export function ToggleRow({ label, value, onChange, disabled, description }: {
  label: ReactNode;
  value: any;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  description?: ReactNode;
}) {
  return (
    <PanelSectionRow>
      <ToggleField label={label} description={description} checked={!!value} disabled={disabled} onChange={onChange} />
    </PanelSectionRow>
  );
}

// A compact, wrapping grid of tappable color swatches - replaces a long
// column of full-width preset buttons (one per color, "Blue"/"Cyan"/...)
// that took ten rows to scroll through. flow-children="row" keeps gamepad
// D-pad navigation moving sensibly across the grid instead of only up/down
// through what used to be a single column of buttons.
export function PresetSwatchGrid({ colors, selected, onSelect }: {
  colors: { label: string; value: string }[];
  selected?: string;
  onSelect: (hex: string) => void;
}) {
  return (
    <PanelSectionRow>
      <Focusable style={{ display: "flex", flexWrap: "wrap", gap: 8 }} flow-children="row">
        {colors.map((color) => (
          <Focusable
            key={color.value}
            className="nebel-preset-swatch"
            style={{
              backgroundColor: `#${color.value}`,
              outline: selected === color.value ? "2px solid white" : undefined,
            }}
            title={color.label}
            onActivate={() => onSelect(color.value)}
            onClick={() => onSelect(color.value)}
          >
            {null}
          </Focusable>
        ))}
      </Focusable>
    </PanelSectionRow>
  );
}

export function SliderEdit({ label, value, min, max, step, onChange, format, valueSuffix }: {
  label: ReactNode;
  value: any;
  min: number;
  max: number;
  step: number;
  onChange: (value: any) => void;
  format?: (value: number) => any;
  valueSuffix?: string;
}) {
  const numeric = Number(value);
  return (
    <PanelSectionRow>
      <div className="nebel-slider-field">
        <SliderField
          label={label}
          value={Number.isFinite(numeric) ? numeric : min}
          min={min}
          max={max}
          step={step}
          showValue
          valueSuffix={valueSuffix}
          onChange={(next) => onChange(format ? format(next) : next)}
        />
      </div>
    </PanelSectionRow>
  );
}
