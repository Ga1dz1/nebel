import { ButtonItem, Field, PanelSection, PanelSectionRow, TextField } from "@decky/ui";
import { useCallback, useEffect, useState } from "react";
import { getSgdbKeyState, romsArtwork, romsImport, romsScan, setSgdbKey } from "../backend";
import type { RomsScan, SgdbKeyState } from "../backend";
import { t } from "../i18n";

export function Roms(_props: { qam: boolean }) {
  const [scan, setScan] = useState<RomsScan | null>(null);
  const [sgdb, setSgdb] = useState<SgdbKeyState | null>(null);
  const [sgdbDraft, setSgdbDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(() => {
    romsScan()
      .then(setScan)
      .catch((error) => setMessage(String(error)));
    getSgdbKeyState()
      .then(setSgdb)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doImport = async () => {
    setBusy("import");
    setMessage("");
    try {
      const result = await romsImport();
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage(
          t("Imported {added}, already present {skipped}. Restart game mode to see the new games.")
            .replace("{added}", String(result.added.length))
            .replace("{skipped}", String(result.skipped.length)),
        );
      }
    } catch (error) {
      setMessage(String(error));
    }
    setBusy("");
  };

  const doArtwork = async () => {
    setBusy("artwork");
    setMessage("");
    try {
      const result = await romsArtwork();
      if (result.error && !result.matched) {
        setMessage(result.error);
      } else {
        setMessage(
          t("Covers downloaded: {matched}, not found: {missed}.")
            .replace("{matched}", String(result.matched))
            .replace("{missed}", String(result.missed.length)),
        );
      }
    } catch (error) {
      setMessage(String(error));
    }
    setBusy("");
  };

  const saveSgdbKey = async () => {
    try {
      setSgdb(await setSgdbKey(sgdbDraft));
      setSgdbDraft("");
    } catch (error) {
      setMessage(String(error));
    }
  };

  const systems = scan?.systems || [];
  const total = systems.reduce((sum, system) => sum + system.count, 0);

  return (
    <>
      <PanelSection title={t("ROM library")}>
        <PanelSectionRow>
          <Field
            label={t("ROM folder")}
            description={t("Put games into per-system subfolders; systems appear here once their emulator is installed")}
          >
            {scan?.root || ""}
          </Field>
        </PanelSectionRow>
        {systems.map((system) => (
          <PanelSectionRow key={system.id}>
            <Field label={system.label} description={system.dir}>
              {system.count}
            </Field>
          </PanelSectionRow>
        ))}
        {!systems.length && (
          <PanelSectionRow>
            <div style={{ opacity: 0.7, fontSize: "12px" }}>{t("No emulators or ROM folders found")}</div>
          </PanelSectionRow>
        )}
      </PanelSection>
      <PanelSection title={t("Covers")}>
        {sgdb?.present ? (
          <PanelSectionRow>
            <Field label={t("SteamGridDB key")} description={sgdb.masked}>
              <ButtonItem layout="below" onClick={async () => setSgdb(await setSgdbKey(""))}>{t("Remove key")}</ButtonItem>
            </Field>
          </PanelSectionRow>
        ) : (
          <>
            <PanelSectionRow>
              <TextField
                label={t("SteamGridDB API key (optional)")}
                value={sgdbDraft}
                onChange={(e) => setSgdbDraft(e.target.value)}
              />
            </PanelSectionRow>
            <ButtonItem layout="below" onClick={saveSgdbKey} disabled={!sgdbDraft.trim()}>{t("Save key")}</ButtonItem>
          </>
        )}
        <PanelSectionRow>
          <div style={{ opacity: 0.7, fontSize: "12px" }}>
            {t("SteamGridDB has proper covers for PS2, GameCube and Switch - a free key comes from steamgriddb.com. Without it, covers fall back to libretro thumbnails.")}
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection>
        <ButtonItem layout="below" onClick={doImport} disabled={busy !== "" || total === 0}>
          {busy === "import" ? t("Importing...") : t("Import to Steam library")}
        </ButtonItem>
        <ButtonItem layout="below" onClick={doArtwork} disabled={busy !== "" || total === 0}>
          {busy === "artwork" ? t("Downloading...") : t("Fetch covers")}
        </ButtonItem>
        {message && (
          <PanelSectionRow>
            <div style={{ fontSize: "12px" }}>{message}</div>
          </PanelSectionRow>
        )}
      </PanelSection>
    </>
  );
}
