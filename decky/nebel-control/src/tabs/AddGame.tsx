import { Field, ButtonItem, PanelSection } from "@decky/ui";
import { useState } from "react";
import type { DirListing } from "../backend";
import { listDir } from "../backend";
import { t } from "../i18n";

// The stock "Browse..." button in Steam's Add Non-Steam Game dialog is broken
// in the ARM64 client (OpenFileDialog fails before reaching the portal), and
// native dialogs never appear in the gamescope session — so the picker lives
// right here and the pick is registered through Steam's AddShortcut API.
export function AddGame() {
  const [picker, setPicker] = useState<DirListing | null>(null);
  const [addResult, setAddResult] = useState("");

  const navigate = async (path: string) => {
    try {
      setPicker(await listDir(path));
    } catch {
      setAddResult(t("Failed to add shortcut"));
      setPicker(null);
    }
  };
  const pick = async (fullPath: string) => {
    setPicker(null);
    setAddResult("");
    try {
      const name = fullPath.split("/").pop()?.replace(/\.[^.]+$/, "") || fullPath;
      // Steam quotes the Exe field itself — passing a pre-quoted path yields ""..."".
      const appid = await SteamClient?.Apps?.AddShortcut?.(name, fullPath, "", "");
      setAddResult(typeof appid === "number" && appid > 0 ? t("Added to Steam library") : t("Failed to add shortcut"));
    } catch {
      setAddResult(t("Failed to add shortcut"));
    }
  };
  const shortcutLabel = (s: { id: string; label: string }) =>
    s.id === "home" ? t("Internal storage") : `${t("SD card")}: ${s.label}`;

  if (picker) {
    return (
      <PanelSection title={t("Select the game's executable")}>
        <Field label={picker.path} />
        {(picker.shortcuts || []).map((s) => (
          <ButtonItem key={`s:${s.path}`} layout="below" onClick={() => navigate(s.path)}>
            {shortcutLabel(s)}/
          </ButtonItem>
        ))}
        {picker.parent !== null && (
          <ButtonItem layout="below" onClick={() => navigate(picker.parent || "/")}>..</ButtonItem>
        )}
        {picker.dirs.map((dir) => (
          <ButtonItem key={`d:${dir}`} layout="below" onClick={() => navigate(`${picker.path}/${dir}`)}>
            {dir}/
          </ButtonItem>
        ))}
        {picker.files.map((file) => (
          <ButtonItem key={`f:${file}`} layout="below" onClick={() => pick(`${picker.path}/${file}`)}>
            {file}
          </ButtonItem>
        ))}
        <ButtonItem layout="below" onClick={() => setPicker(null)}>{t("Cancel")}</ButtonItem>
      </PanelSection>
    );
  }
  return (
    <PanelSection title={t("Library")}>
      <ButtonItem layout="below" onClick={() => navigate("")}>{t("Add non-Steam game")}</ButtonItem>
      {addResult && <Field label={addResult} />}
    </PanelSection>
  );
}
