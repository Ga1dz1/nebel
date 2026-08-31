import { useEffect, useState } from "react";
import { getDisplayState, setInternalTouchpad } from "../backend";
import { t } from "../i18n";
import { SelectEdit } from "./widgets";

// Internal touchscreen mode (the nebel-internal-touchpad service):
//   0 = plain touchscreen (rotated to match the panel),
//   1 = whole-panel pointer (tap = left click, two-finger tap = right click),
//   2 = Steam Deck trackpads: InputPlumber splits the panel at the midline
//       into LeftPad/RightPad on the deck-uhid target, so Steam controller
//       layouts can bind them like real Deck pads.
// Works in any session, independent of whether an external display is
// connected or primary, so it lives with the Controller settings (and in the
// QAM) rather than the Display tab.
// Self-contained: fetches its own state, optimistic set with rollback.
export function InternalTouchpadRow() {
  const [mode, setMode] = useState<number | null>(null);
  useEffect(() => {
    getDisplayState()
      .then((state) => setMode(state.internalTouchpad))
      .catch(() => {});
  }, []);
  if (mode === null) return null;
  const onChange = (data: string) => {
    const value = Number(data);
    const previous = mode;
    setMode(value);
    setInternalTouchpad(value)
      .then(setMode)
      .catch(() => setMode(previous));
  };
  return (
    <SelectEdit
      label={t("Internal screen")}
      value={String(mode)}
      options={[
        { data: "0", label: t("Touchscreen") },
        { data: "1", label: t("Touchpad (pointer)") },
        { data: "2", label: t("Steam trackpads") },
      ]}
      onChange={onChange}
    />
  );
}
