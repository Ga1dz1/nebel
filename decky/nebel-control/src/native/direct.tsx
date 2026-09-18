// Direct injection of native settings sections, bypassing Decky Loader's
// routerHook. Needed when the loader's route patcher silently no-ops on newer
// Steam clients (16.09 broke 3.2.8, 18.09 broke 3.2.9: the loader "attaches"
// to the router but addPatch never lands in _routePatches, so every plugin's
// route patches are inert).
//
// Technique: Steam's paged-navigation component maps the incoming `pages`
// array to `{...rest, identifier: link || route}` before rendering. That map
// lives in a webpack module factory; we string-patch the factory so every
// mapped page passes through window.__nebelWrapPage, which appends our
// section to the matching pages' content. No router patching involved, so
// Steam-internal route changes can't disable it wholesale. Regex anchors
// match the map's STRUCTURE (return{...X,identifier:Y||Z}), not minified
// names, so re-minification survives.
import { ErrorBoundary } from "@decky/ui";
import type { ReactNode } from "react";
import {
  CloudSyncSection,
  ControlCenterSection,
  ControllerLightingSection,
  ExternalDisplaySection,
  GameTweaksSection,
  InGameOverlaySection,
  LibraryAddGameSection,
  NotificationFlashSection,
  PowerLimitsSection,
  SshSection,
} from "./sections";

const LOG = "[Nebel Control] direct-settings:";
const WRAP = "__nebelWrapPage";

interface MappedPage {
  identifier?: string;
  route?: string;
  link?: string;
  content?: ReactNode;
  __nebelDirectWrapped?: boolean;
  [key: string]: unknown;
}

interface DirectSection {
  name: string;
  match: (id: string) => boolean;
  render: (id: string) => ReactNode;
}

const SETTINGS_SECTIONS: DirectSection[] = [
  { name: "controller-lighting", match: (id) => id.startsWith("/settings/controller"), render: () => <ControllerLightingSection /> },
  { name: "power-limits", match: (id) => id === "/settings/power", render: () => <PowerLimitsSection /> },
  { name: "external-display", match: (id) => id === "/settings/display", render: () => <ExternalDisplaySection /> },
  { name: "cloud-sync", match: (id) => id === "/settings/cloud", render: () => <CloudSyncSection /> },
  { name: "library-add-game", match: (id) => id === "/settings/library", render: () => <LibraryAddGameSection /> },
  { name: "internet-ssh", match: (id) => id === "/settings/internet", render: () => <SshSection /> },
  { name: "ingame-overlay", match: (id) => id === "/settings/ingame", render: () => <InGameOverlaySection /> },
  { name: "notification-flash", match: (id) => id === "/settings/notifications", render: () => <NotificationFlashSection /> },
  { name: "control-center-entry", match: (id) => id === "/settings/system", render: () => <ControlCenterSection /> },
  {
    name: "game-tweaks",
    match: (id) => /\/app\/\d+\/properties\/compatibility$/.test(id),
    render: (id) => {
      const appid = id.match(/\/app\/(\d+)\//)?.[1] || "";
      return appid ? <GameTweaksSection appid={appid} /> : null;
    },
  },
];

// Runs inside Steam's render: receives every page the paged-nav mapped and
// appends our section where the identifier says one belongs. Pure and
// idempotent - safe to call on every render of every paged-nav instance.
function wrapPage(page: MappedPage): MappedPage {
  try {
    if (!page || typeof page !== "object" || page.__nebelDirectWrapped) return page;
    const id = String(page.identifier || page.route || page.link || "");
    if (!id) return page;
    const section = SETTINGS_SECTIONS.find((candidate) => {
      try {
        return candidate.match(id);
      } catch {
        return false;
      }
    });
    if (!section) return page;
    const node = section.render(id);
    if (!node) return page;
    return {
      ...page,
      __nebelDirectWrapped: true,
      content: (
        <>
          {page.content}
          <ErrorBoundary>{node}</ErrorBoundary>
        </>
      ),
    };
  } catch (error) {
    console.warn(LOG, "wrapPage failed", error);
    return page;
  }
}

// The map Steam's paged-nav runs over incoming pages:
//   y = d.map(L => { const{route:j,link:P,...S} = L; return {...S,identifier:P||j} })
// Anchor on the return literal's shape, names are minifier output.
const RE_MAP = /return\{\.\.\.([A-Za-z0-9_$]+),identifier:([A-Za-z0-9_$]+)\|\|([A-Za-z0-9_$]+)\}/g;

function patchFactory(src: string): string | null {
  if (src.indexOf(WRAP) >= 0) return null;
  if (!RE_MAP.test(src)) return null;
  RE_MAP.lastIndex = 0;
  const out = src.replace(RE_MAP, `return window.${WRAP}({...$1,identifier:$2||$3})`);
  return out === src ? null : out;
}

export function installDirectSettingsSections(): () => void {
  console.log(LOG, "installing (decky routerHook inert on this client)");
  (window as any)[WRAP] = wrapPage;
  const patchedIds: number[] = [];
  try {
    const chunks = (window as any).webpackChunksteamui || [];
    for (const ch of chunks) {
      const mods = ch && ch[1];
      if (!mods) continue;
      for (const id of Object.keys(mods)) {
        if (typeof mods[id] !== "function") continue;
        let src: string;
        try {
          src = mods[id].toString();
        } catch {
          continue;
        }
        const patched = patchFactory(src);
        if (patched) {
          try {
            mods[id] = eval(`(${patched})`);
            patchedIds.push(Number(id));
          } catch (error) {
            console.warn(LOG, "factory eval failed for module", id, error);
          }
        }
      }
    }
    // Re-require patched modules so the patched factories become the cached
    // exports for the rest of the session (mirrors the switcher patch).
    if (!(window as any).__req) {
      chunks.push([[710000 + Math.floor(Math.random() * 89999)], {}, (r: any) => ((window as any).__req = r)]);
    }
    for (const id of patchedIds) {
      try {
        (window as any).__req(id);
      } catch {
        // not require-able standalone; the patch still applies when webpack
        // lazily loads the chunk module fresh
      }
    }
    console.log(LOG, "patched page-map factories:", patchedIds.join(",") || "none (will apply on lazy load)");
  } catch (error) {
    console.warn(LOG, "install failed", error);
  }
  return () => {
    try {
      delete (window as any)[WRAP];
    } catch {
    }
  };
}

// Probe: does the loader's routerHook actually register patches on this Steam
// client? A no-op addPatch is what 18.09 clients do to 3.2.9.
export function deckyRouterHookWorks(): boolean {
  try {
    const loader = (window as any).DeckyPluginLoader;
    const routerState = loader?.routerHook?.routerState;
    if (!routerState || !loader.routerHook.addPatch) return false;
    const before = Object.keys(routerState._routePatches || {}).length;
    const probe = loader.routerHook.addPatch("/__nebel_probe__", (route: unknown) => route);
    const after = Object.keys(routerState._routePatches || {}).length;
    try {
      loader.routerHook.removePatch("/__nebel_probe__", probe);
    } catch {
    }
    return after > before;
  } catch {
    return false;
  }
}
