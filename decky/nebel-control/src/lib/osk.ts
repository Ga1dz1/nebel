// Opens Steam's own modal on-screen keyboard (the one STEAM+X shows on a
// Steam Deck). Current Steam builds keep a VirtualKeyboardManager on the
// active UI window instance; there is no public SteamClient API for this
// anymore (SteamClient.System.UI.ShowVirtualKeyboard is gone), so the
// manager is looked up in the steamui webpack modules - the same approach
// other keyboard plugins use. Verified live against the steamui build
// shipped in Aug 2026 (module exporting SteamUIStore with m_WindowStore ->
// ActiveWindowInstance.m_VirtualKeyboardManager; ref.ShowModalKeyboard()).
import { findModuleExport } from "@decky/ui";

type VirtualKeyboardRef = {
  ShowVirtualKeyboard: () => void;
  ShowModalKeyboard: () => void;
  HideVirtualKeyboard: () => void;
};

type VirtualKeyboardManager = {
  m_bIsVirtualKeyboardShowing?: { m_currentValue?: boolean };
  CreateVirtualKeyboardRef: (props: Record<string, unknown>) => VirtualKeyboardRef;
};

let cachedVkm: VirtualKeyboardManager | null | undefined;

function virtualKeyboardManager(): VirtualKeyboardManager | null {
  if (cachedVkm === undefined) {
    const store = findModuleExport((e: any) => e?.m_WindowStore && e?.ActiveWindowInstance?.m_VirtualKeyboardManager);
    cachedVkm = (store?.ActiveWindowInstance?.m_VirtualKeyboardManager as VirtualKeyboardManager) ?? null;
    if (!cachedVkm) console.warn("nebel-control: VirtualKeyboardManager not found in steamui modules");
  }
  return cachedVkm;
}

// What the native OSK does with typed keys: feed them into Steam Input's
// controller-keyboard text channel so they land in whatever has focus.
function forwardKey(key: string) {
  const input = (window as any).SteamClient?.Input;
  if (!input?.ControllerKeyboardSendText) return;
  if (key === "Backspace") input.ControllerKeyboardSendText("\b");
  else if (key === "Enter") input.ControllerKeyboardSendText("\n");
  else if (key === "Tab") input.ControllerKeyboardSendText("\t");
  else if (key?.length === 1) input.ControllerKeyboardSendText(key);
}

export function showSteamKeyboard(): boolean {
  try {
    const vkm = virtualKeyboardManager();
    if (!vkm) return false;
    if (vkm.m_bIsVirtualKeyboardShowing?.m_currentValue) return true; // already open
    const ref = vkm.CreateVirtualKeyboardRef({ onTextEntered: forwardKey });
    ref.ShowModalKeyboard();
    return true;
  } catch (error) {
    console.warn("nebel-control: failed to open on-screen keyboard", error);
    return false;
  }
}
