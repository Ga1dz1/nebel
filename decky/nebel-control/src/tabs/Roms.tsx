import { ButtonItem, Field, PanelSection, PanelSectionRow, TextField } from "@decky/ui";
import { useCallback, useEffect, useState } from "react";
import {
  getSgdbKeyState,
  listDir,
  romsArtwork,
  romsImport,
  romsRoot,
  romsScan,
  romsSetRoot,
  setSgdbKey,
} from "../backend";
import type { DirListing, RomsRootState, RomsScan, SgdbKeyState } from "../backend";
import { t } from "../i18n";

export function Roms(_props: { qam: boolean }) {
  const [scan, setScan] = useState<RomsScan | null>(null);
  const [rootState, setRootState] = useState<RomsRootState | null>(null);
  const [sgdb, setSgdb] = useState<SgdbKeyState | null>(null);
  const [sgdbDraft, setSgdbDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [picker, setPicker] = useState<DirListing | null>(null);

  const refresh = useCallback(() => {
    romsScan()
      .then(setScan)
      .catch((error) => setMessage(String(error)));
    romsRoot()
      .then(setRootState)
      .catch(() => {});
    getSgdbKeyState()
      .then(setSgdb)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navigate = async (path: string) => {
    try {
      setPicker(await listDir(path));
    } catch (error) {
      setMessage(String(error));
      setPicker(null);
    }
  };

  const doArtwork = async (path = "") => {
    setBusy("artwork");
    try {
      const result = await romsArtwork(path);
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

  // Import, then pull covers for the newly added shortcuts right away - one
  // button press should leave the library ready, not half-dressed.
  const doImport = async (path = "") => {
    setBusy("import");
    setMessage("");
    try {
      const result = await romsImport(path);
      if (result.error) {
        setMessage(result.error);
        setBusy("");
        return;
      }
      setMessage(
        t("Imported {added}, already present {skipped}. Restart game mode to see the new games.")
          .replace("{added}", String(result.added.length))
          .replace("{skipped}", String(result.skipped.length)),
      );
      refresh();
      if (result.added.length > 0) {
        await doArtwork(path);
      }
    } catch (error) {
      setMessage(String(error));
    }
    setBusy("");
  };

  const useFolder = async (path: string) => {
    setPicker(null);
    setMessage("");
    try {
      setRootState(await romsSetRoot(path));
      refresh();
    } catch (error) {
      setMessage(String(error));
    }
  };

  const importOnce = async (path: string) => {
    setPicker(null);
    await doImport(path);
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

  // Directory picker for the ROM root: folders only, with shortcuts to the
  // internal storage and SD cards (same backend the game picker uses).
  if (picker) {
    return (
      <PanelSection title={t("Select ROM folder")}>
        <Field label={picker.path} />
        {(picker.shortcuts || []).map((s) => (
          <ButtonItem key={`s:${s.path}`} layout="below" onClick={() => navigate(s.path)}>
            {s.id === "home" ? t("Internal storage") : `${t("SD card")}: ${s.label}`}/
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
        <ButtonItem layout="below" onClick={() => useFolder(picker.path)}>
          {t("Use this folder")}
        </ButtonItem>
        <ButtonItem layout="below" onClick={() => importOnce(picker.path)} disabled={busy !== ""}>
          {busy === "import" ? t("Importing...") : t("Import from this folder once")}
        </ButtonItem>
        <ButtonItem layout="below" onClick={() => setPicker(null)}>{t("Cancel")}</ButtonItem>
      </PanelSection>
    );
  }

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
        <ButtonItem layout="below" onClick={() => navigate(scan?.root || "")}>
          {t("Change folder...")}
        </ButtonItem>
        {rootState?.custom && (
          <ButtonItem layout="below" onClick={() => useFolder("")}>
            {t("Reset to default folder")}
          </ButtonItem>
        )}
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
            {t("SteamGridDB has proper covers for every system - a free key comes from steamgriddb.com. Without it, covers fall back to libretro thumbnails.")}
          </div>
        </PanelSectionRow>
      </PanelSection>
      <PanelSection>
        <ButtonItem layout="below" onClick={() => doImport()} disabled={busy !== "" || total === 0}>
          {busy === "import" ? t("Importing...") : t("Import to Steam library")}
        </ButtonItem>
        <ButtonItem layout="below" onClick={() => doArtwork()} disabled={busy !== "" || total === 0}>
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
