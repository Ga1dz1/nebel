import {
  DialogBody,
  DialogButton,
  DialogFooter,
  Field,
  ModalRoot,
  PanelSection,
  PanelSectionRow,
  showModal,
} from "@decky/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSyncState,
  setSyncServiceEnabled,
  syncAddCustomFolder,
  syncAddDevice,
  syncRemoveCustomFolder,
  syncRemoveDevice,
  syncSetFolderEnabled,
} from "../backend";
import { ToggleRow } from "../components/widgets";
import type { SyncState } from "../types";

function AddDeviceModal({ closeModal, onAdd }: {
  closeModal?: () => void;
  onAdd: (deviceId: string, name: string) => Promise<void>;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
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
          Device ID of the other console (shown on its Sync tab)
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
          placeholder="Name (e.g. Mini V2)"
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
            Add device
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
          Folder to sync (under ~ or /run/media)
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
          placeholder="Label (optional)"
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
            Add folder
          </DialogButton>
        </DialogFooter>
      </DialogBody>
    </ModalRoot>
  );
}

export function Sync() {  const [state, setState] = useState<SyncState | null>(null);
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

  if (!state) return <PanelSection title="Sync"><Field label="Loading" /></PanelSection>;

  const connectedCount = state.devices.filter((d) => d.connected).length;
  return (
    <>
      <PanelSection title="Syncthing">
        {!state.installed && <Field label="Syncthing is not installed in this OS image" />}
        <ToggleRow
          label="Sync service"
          description={state.serviceActive ? "Running" : "Stopped"}
          value={state.serviceEnabled && state.serviceActive}
          disabled={busy || !state.installed}
          onChange={(enabled) => void run(async () => { await setSyncServiceEnabled(enabled); await refresh(); })}
        />
        {state.myId && (
          <Field label="This device ID" description={state.myId} />
        )}
        {state.devices.length > 0 && (
          <Field
            label="Status"
            description={`${connectedCount} of ${state.devices.length} device(s) connected`}
          />
        )}
        {!!error && <Field label="Error" description={error} />}
      </PanelSection>
      {state.serviceActive && (
        <PanelSection title="Devices">
          {state.devices.map((device) => (
            <PanelSectionRow key={device.id}>
              <Field
                label={`${device.name}${device.connected ? " (connected)" : ""}`}
                description={device.id.slice(0, 13) + "..."}
              >
                <DialogButton
                  style={{ minWidth: "90px" }}
                  disabled={busy}
                  onClick={() => void run(() => syncRemoveDevice(device.id))}
                >
                  Remove
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
              Add device
            </DialogButton>
          </PanelSectionRow>
        </PanelSection>
      )}
      {state.serviceActive && (
        <PanelSection title="Folders">
          {state.devices.length === 0 && (
            <Field label="Add a device first - folders sync only to paired devices" />
          )}
          {state.folders.map((folder) =>
            folder.custom ? (
              <PanelSectionRow key={folder.id}>
                <Field label={folder.label} description={folder.path.replace("/var/home/armada", "~")}>
                  <DialogButton
                    style={{ minWidth: "90px" }}
                    disabled={busy}
                    onClick={() => void run(() => syncRemoveCustomFolder(folder.id))}
                  >
                    Remove
                  </DialogButton>
                </Field>
              </PanelSectionRow>
            ) : (
              <ToggleRow
                key={folder.id}
                label={folder.label}
                description={folder.path.replace("/var/home/armada", "~")}
                value={folder.enabled}
                disabled={busy}
                onChange={(enabled) => void run(() => syncSetFolderEnabled(folder.id, enabled))}
              />
            ),
          )}
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
              Add custom folder
            </DialogButton>
          </PanelSectionRow>
        </PanelSection>
      )}
    </>
  );
}
