import { ButtonItem, Field, PanelSection } from "@decky/ui";
import { useState } from "react";
import { exportTweaksFile, importTweaksFile } from "../backend";
import { t } from "../i18n";

// Export/import of the whole per-game tweak database (pocknix-style
// shareable packs). Files round-trip through the user home so they can be
// moved on/off the console via SD card, sync or ssh.
export function TweaksShareSection() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<{ path?: string; games?: number }>) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      if (result.games !== undefined) {
        setMessage(t("Imported {n} game profiles").replace("{n}", String(result.games)));
      } else if (result.path) {
        setMessage(t("Exported to {path}").replace("{path}", result.path));
      }
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PanelSection title={t("Share Game Profiles")}>
      <ButtonItem layout="below" disabled={busy} onClick={() => run(exportTweaksFile)}>
        {t("Export all game profiles")}
      </ButtonItem>
      <ButtonItem layout="below" disabled={busy} onClick={() => run(() => importTweaksFile(undefined))}>
        {t("Import from nebel-tweaks-export.json")}
      </ButtonItem>
      {message && <Field label={message} />}
    </PanelSection>
  );
}
