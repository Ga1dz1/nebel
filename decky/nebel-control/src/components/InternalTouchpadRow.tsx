import { useEffect, useState } from "react";
import { getDisplayState, setInternalTouchpad } from "../backend";
import { t } from "../i18n";
import { ToggleRow } from "./widgets";

// Internal touchscreen as a Steam-Deck-style trackpad (the
// nebel-internal-touchpad service): right half = pointer / tap = left click,
// left half = scroll / tap = right click. Works in any session, independent
// of whether an external display is connected or primary, so it lives with
// the Controller settings (and in the QAM) rather than the Display tab.
// Self-contained: fetches its own state, optimistic set with rollback.
export function InternalTouchpadRow() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    getDisplayState()
      .then((state) => setEnabled(state.internalTouchpad))
      .catch(() => {});
  }, []);
  if (enabled === null) return null;
  const onChange = (value: boolean) => {
    setEnabled(value);
    setInternalTouchpad(value)
      .then(setEnabled)
      .catch(() => setEnabled(!value));
  };
  return (
    <ToggleRow
      label={t("Internal screen as touchpad")}
      description={t("The internal touchscreen works as Steam Deck style trackpads: both halves move the pointer (tap = left click), two-finger tap = right click, two-finger drag = scroll. Off: normal touchscreen.")}
      value={enabled}
      onChange={onChange}
    />
  );
}
