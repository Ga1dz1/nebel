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
import { ErrorBoundary, findAllModules } from "@decky/ui";
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
  const uninstallGrabber = installExportGrabber();
  return () => {
    uninstallGrabber();
    try {
      delete (window as any)[WRAP];
    } catch {
    }
  };
}

// --- Export grabber ---------------------------------------------------------
// The pages-map module is executed at boot, before Decky loads plugins, so
// factory patching cannot affect the live component. But webpack compiles
// ESM imports to property reads at use time, and its export getters are
// configurable - so REDEFINING the export property redirects every future
// render. We find component exports whose source contains the pages-map
// anchor and wrap them: on each render we walk the returned element tree and
// route any `pages` array carrying our identifiers through wrapPage, exactly
// like the classic route-patch cascade but triggered from the export.
const EXPORT_MARK = "__nebelExportWrapped";

const IDENT_RE = /^\/settings\/|^\/app\/\d+\/properties\//;

function scanElements(node: any, depth: number): void {
  if (!node || typeof node !== "object" || depth > 14) return;
  if (Array.isArray(node)) {
    for (const child of node) scanElements(child, depth);
    return;
  }
  const props = node.props;
  if (!props || typeof props !== "object") return;
  const pages = props.pages;
  if (Array.isArray(pages) && pages.length > 2 && !pages.__nebelScanned) {
    const ours = pages.some((page: any) => {
      const id = page && (page.identifier || page.route || page.link);
      return typeof id === "string" && IDENT_RE.test(id);
    });
    if (ours) {
      try {
        Object.defineProperty(pages, "__nebelScanned", { value: true, configurable: true });
        props.pages = pages.map((page: any) => (window as any)[WRAP](page));
      } catch (error) {
        console.warn(LOG, "pages wrap failed", error);
      }
    }
  }
  scanElements(props.children, depth + 1);
}

function wrapExport(exportsObj: any, key: string): boolean {
  try {
    const Original = exportsObj[key];
    if (typeof Original !== "function" || Original[EXPORT_MARK]) return false;
    // Only components whose render output can carry the pages array.
    const src = Original.toString();
    if (!src.includes("pages") || !src.includes("identifier")) return false;
    const Wrapped: any = function (this: unknown, props: any) {
      const ret = Original.call(this, props);
      try {
        scanElements(ret, 0);
      } catch (error) {
        console.warn(LOG, "tree scan failed", error);
      }
      return ret;
    };
    Object.assign(Wrapped, Original);
    Wrapped.toString = () => Original.toString();
    Wrapped[EXPORT_MARK] = true;
    Object.defineProperty(exportsObj, key, {
      value: Wrapped,
      configurable: true,
      enumerable: true,
    });
    return true;
  } catch {
    return false;
  }
}

function installExportGrabber(): () => void {
  let wrapped = 0;
  try {
    const chunks = (window as any).webpackChunksteamui || [];
    for (const ch of chunks) {
      const mods = ch && ch[1];
      if (!mods) continue;
      for (const id of Object.keys(mods)) {
        if (typeof mods[id] !== "function") continue;
        // Module exports live behind the webpack runtime; findModuleByExport
        // (DFL) knows how to resolve them - but it needs the module loaded.
        // Try the runtime's cache via a require without executing factories.
      }
    }
    // DFL's scanner resolves every loaded module's exports; collect all
    // modules that export at least one pages/identifier component, then
    // redefine each matching export.
    const modules = (findAllModules as any)((e: any) =>
      typeof e === "function" && e.toString().includes("pages") && e.toString().includes("identifier")
    ) as any[];
    for (const mod of modules) {
      for (const key of Object.keys(mod)) {
        if (wrapExport(mod, key)) wrapped++;
      }
    }
    console.log(LOG, "export-grabber wrapped exports:", wrapped);
  } catch (error) {
    console.warn(LOG, "export grabber failed", error);
  }
  return () => {};
}
// Probe: does the loader's routerHook actually register patches on this Steam
// client? A no-op addPatch is what 18.09 clients do to 3.2.9.
export function deckyRouterHookWorks(): boolean {
  try {
    const loader = (window as any).DeckyPluginLoader;
    const routerState = loader?.routerHook?.routerState;
    // _routePatches is a Map - Object.keys() of a Map is always [], which
    // made this probe report 'inert' on every client and forced the direct
    // injection path even when the classic route patching worked fine.
    const patches: Map<string, unknown> | undefined =
      routerState?._routePatches instanceof Map ? routerState._routePatches : undefined;
    if (!patches || typeof routerState.addPatch !== "function") return false;
    const before = patches.size;
    const probe = routerState.addPatch("/__nebel_probe__", (route: unknown) => route);
    const after = patches.size;
    try {
      routerState.removePatch("/__nebel_probe__", probe);
    } catch {
    }
    return after > before;
  } catch {
    return false;
  }
}
