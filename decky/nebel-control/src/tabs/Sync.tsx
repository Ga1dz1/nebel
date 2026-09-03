import {
  DialogBody,
  DialogButton,
  DialogFooter,
  Field,
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  showModal,
} from "@decky/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSyncState,
  setSyncServiceEnabled,
  syncAcceptFolder,
  syncAddCustomFolder,
  syncAddDevice,
  syncDiscoveredDevices,
  syncDismissDevice,
  syncDismissFolder,
  syncNow,
  syncRemoveCustomFolder,
  syncRemoveDevice,
  syncSetFolderEnabled,
} from "../backend";
import type { DiscoveredDevice } from "../backend";
import { OpenFullScreenButton, ToggleRow } from "../components/widgets";
import { t } from "../i18n";
import type { SyncState } from "../types";

function AddDeviceModal({ closeModal, onAdd }: {
  closeModal?: () => void;
  onAdd: (deviceId: string, name: string) => Promise<void>;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<DiscoveredDevice[] | null>(null);
  const scan = () => {
    setFound(null);
    syncDiscoveredDevices().then(setFound).catch(() => setFound([]));
  };
  useEffect(scan, []);
  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "4px",
    color: "inherit",
    fontSize: "14px",
  } as const;
  return (
    <ModalRoot onCancel={closeModal}>
      <DialogBody>
        <div style={{ marginBottom: "6px", fontSize: "13px", opacity: 0.8 }}>
          {t("Devices found on this network")}
        </div>
        {found === null && (
          <div style={{ marginBottom: "10px", fontSize: "13px", opacity: 0.7 }}>{t("Scanning...")}</div>
        )}
        {found !== null && found.length === 0 && (
          <div style={{ marginBottom: "10px", fontSize: "13px", opacity: 0.7 }}>{t("Nothing found - check Sync is on at the other console")}</div>
        )}
        {found !== null && found.map((d) => (
          <DialogButton
            key={d.deviceID}
            style={{ width: "100%", marginBottom: "8px", textAlign: "left" }}
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onAdd(d.deviceID, name || d.short).finally(() => {
                setBusy(false);
                closeModal?.();
              });
            }}
          >
            {`${d.short}  ${d.addresses.join(", ")}`}
          </DialogButton>
        ))}
        <DialogButton style={{ marginBottom: "14px" }} disabled={found === null} onClick={scan}>
          {t("Rescan")}
        </DialogButton>
        <div style={{ marginBottom: "6px", fontSize: "13px", opacity: 0.8 }}>
          {t("Or enter the Device ID by hand (shown on its Sync tab)")}
        </div>
        <input
          type="text"
          placeholder="XXXXXXX-XXXXXXX-..."
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={t("Name (e.g. Mini V2)")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <DialogFooter>
          <DialogButton
            disabled={busy || deviceId.trim().length < 20}
            onClick={() => {
              setBusy(true);
              void onAdd(deviceId, name).finally(() => {
                setBusy(false);
                closeModal?.();
              });
            }}
          >
            {t("Add device")}
          </DialogButton>
        </DialogFooter>
      </DialogBody>
    </ModalRoot>
  );
}

function AddFolderModal({ closeModal, onAdd }: {
  closeModal?: () => void;
  onAdd: (path: string, label: string) => Promise<void>;
}) {
  const [path, setPath] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "4px",
    color: "inherit",
    fontSize: "14px",
  } as const;
  return (
    <ModalRoot onCancel={closeModal}>
      <DialogBody>
        <div style={{ marginBottom: "6px", fontSize: "13px", opacity: 0.8 }}>
          {t("Folder to sync (under ~ or /run/media)")}
        </div>
        <input
          type="text"
          placeholder="~/Games/Heroic"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder={t("Label (optional)")}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
        <DialogFooter>
          <DialogButton
            disabled={busy || path.trim().length < 2}
            onClick={() => {
              setBusy(true);
              void onAdd(path, label).finally(() => {
                setBusy(false);
                closeModal?.();
              });
            }}
          >
            {t("Add folder")}
          </DialogButton>
        </DialogFooter>
      </DialogBody>
    </ModalRoot>
  );
}

export function Sync({ qam }: { qam?: boolean }) {  const [state, setState] = useState<SyncState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    try {
      const next = await getSyncState();
      if (mounted.current) {
        setState(next);
        setError(next.error || "");
      }
    } catch (e) {
      if (mounted.current) setError(String(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const run = useCallback(
    async (action: () => Promise<SyncState | void>) => {
      setBusy(true);
      try {
        const next = await action();
        if (next && mounted.current) setState(next);
      } catch (e) {
        if (mounted.current) setError(String(e));
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [],
  );

  if (!state) return <PanelSection title={t("Sync")}><Field label={t("Loading")} /></PanelSection>;

  const connectedCount = state.devices.filter((d) => d.connected).length;
  return (
    <>
      <PanelSection title="Syncthing">
        {!state.installed && <Field label={t("Syncthing is not installed in this OS image")} />}
        <ToggleRow
          label={t("Sync service")}
          description={state.serviceActive ? t("Running") : t("Stopped")}
          value={state.serviceEnabled && state.serviceActive}
          disabled={busy || !state.installed}
          onChange={(enabled) => void run(async () => { await setSyncServiceEnabled(enabled); await refresh(); })}
        />
        {state.myId && (
          <Field label={t("This device ID")} description={state.myId} />
        )}
        {state.devices.length > 0 && (
          <Field
            label={t("Status")}
            description={t("{connected} of {total} device(s) connected", { connected: connectedCount, total: state.devices.length })}
          />
        )}
        {state.serviceActive && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={busy}
              onClick={() => void run(async () => { await syncNow(); await refresh(); })}
            >
              {t("Sync now")}
            </ButtonItem>
          </PanelSectionRow>
        )}
        {!!error && <Field label={t("Error")} description={error} />}
      </PanelSection>
      {state.serviceActive && (state.pendingDevices.length > 0 || state.pendingFolders.length > 0) && (
        <PanelSection title={t("Requests")}>
          {state.pendingDevices.map((device) => (
            <PanelSectionRow key={device.id}>
              <Field label={t("Device \"{name}\" wants to pair", { name: device.name })} description={device.id.slice(0, 13) + "..."}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <DialogButton
                    style={{ minWidth: "80px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncAddDevice(device.id, device.name))}
                  >
                    {t("Accept")}
                  </DialogButton>
                  <DialogButton
                    style={{ minWidth: "80px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncDismissDevice(device.id))}
                  >
                    {t("Dismiss")}
                  </DialogButton>
                </div>
              </Field>
            </PanelSectionRow>
          ))}
          {state.pendingFolders.map((folder) => (
            <PanelSectionRow key={folder.id}>
              <Field label={t("Folder \"{name}\" was shared with you", { name: folder.label })} description={folder.id}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <DialogButton
                    style={{ minWidth: "80px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncAcceptFolder(folder.id))}
                  >
                    {t("Accept")}
                  </DialogButton>
                  <DialogButton
                    style={{ minWidth: "80px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncDismissFolder(folder.id, folder.offeredBy[0] || ""))}
                  >
                    {t("Dismiss")}
                  </DialogButton>
                </div>
              </Field>
            </PanelSectionRow>
          ))}
        </PanelSection>
      )}
      {!qam && state.serviceActive && (
        <PanelSection title={t("Devices")}>
          {state.devices.map((device) => (
            <PanelSectionRow key={device.id}>
              <Field
                label={`${device.name}${device.connected ? " " + t("(connected)") : ""}`}
                description={device.id.slice(0, 13) + "..."}
              >
                <DialogButton
                  style={{ minWidth: "90px" }}
                  disabled={busy}
                  onClick={() => void run(() => syncRemoveDevice(device.id))}
                >
                  {t("Remove")}
                </DialogButton>
              </Field>
            </PanelSectionRow>
          ))}
          <PanelSectionRow>
            <DialogButton
              disabled={busy}
              onClick={() =>
                showModal(
                  <AddDeviceModal
                    onAdd={async (deviceId, name) => {
                      await run(() => syncAddDevice(deviceId, name));
                    }}
                  />,
                )
              }
            >
              {t("Add device")}
            </DialogButton>
          </PanelSectionRow>
        </PanelSection>
      )}
      {!qam && state.serviceActive && (
        <PanelSection title={t("Folders")}>
          {state.devices.length === 0 && (
            <Field label={t("Add a device first - folders sync only to paired devices")} />
          )}
          {state.folders.map((folder) => {
            const statusSuffix = folder.enabled
              ? folder.syncState === "syncing"
                ? " • " + t("syncing…")
                : folder.syncState === "idle"
                  ? " • " + t("in sync")
                  : ""
              : "";
            const description = folder.path.replace("/var/home/nebel", "~") + statusSuffix;
            return folder.custom ? (
              <PanelSectionRow key={folder.id}>
                <Field label={folder.label} description={description}>
                  <DialogButton
                    style={{ minWidth: "90px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncRemoveCustomFolder(folder.id))}
                  >
                    {t("Remove")}
                  </DialogButton>
                </Field>
              </PanelSectionRow>
            ) : (
              <ToggleRow
                key={folder.id}
                label={folder.label}
                description={description}
                value={folder.enabled}
                disabled={busy}
                onChange={(enabled) => void run(() => syncSetFolderEnabled(folder.id, enabled))}
              />
            );
          })}
          <PanelSectionRow>
            <DialogButton
              disabled={busy}
              onClick={() =>
                showModal(
                  <AddFolderModal
                    onAdd={async (path, label) => {
                      await run(() => syncAddCustomFolder(path, label));
                    }}
                  />,
                )
              }
            >
              {t("Add custom folder")}
            </DialogButton>
          </PanelSectionRow>
        </PanelSection>
      )}
      {qam && <OpenFullScreenButton />}
    </>
  );
}
