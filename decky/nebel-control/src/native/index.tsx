import { routerHook } from "@decky/api";
import { ErrorBoundary } from "@decky/ui";
import type { RoutePatch } from "@decky/api";
import type { ReactNode } from "react";
import { ControllerLightingSection, CloudSyncSection, ControlCenterSection, ExternalDisplaySection, GameTweaksSection, InGameOverlaySection, LibraryAddGameSection, NotificationFlashSection, PowerLimitsSection, SshSection } from "./sections";

// Duplicates Nebel Control's management UI into Steam's own settings pages
// (Steam Settings -> Controller/Power/Display and game Properties), rendered
// with Steam's native components so it reads as part of the host UI. The
// Decky QAM/fullpage plugin stays the parallel full control center; both hit
// the same python backend.
//
// Technique: Steam builds both the Settings root and the game Properties
// page from a `pages` array ({title, route, link, content, icon, visible})
// handed to a shared paged-navigation component. We hook the route via
// routerHook.addPatch, wrap the route child component's type, and from there
// cascade: every function component in the returned element tree gets its
// type wrapped once (WeakSet-guarded, so identity is stable and nothing
// remounts), so when it renders we scan its output too. Once the element
// carrying `props.pages` shows up, the matching pages' `content` element is
// replaced with ours appended. Everything stays inside Steam's React tree,
// so navigation/focus/SteamInput behave natively.
//
// Graceful degradation: every step is try/caught and every injected block is
// behind an ErrorBoundary, so if a Steam update moves or renames the anchors
// (no pages host, unknown routes), only the duplicate disappears - the
// plugin itself never breaks.

const LOG = "[Nebel Control] native-settings:";
// Marks a component type we already wrapped - the router re-runs route
// patches on every render, and a fresh wrapper each time would remount the
// whole page subtree (focus/state loss), so wrapping must be idempotent.
const NEO_WRAPPED = "__nebelNativeTypeWrapped";

interface PageDescriptor {
  route?: string;
  link?: string;
  content?: ReactNode;
  __nebelWrapped?: boolean;
}

interface InjectedSection {
  name: string;
  match: (page: PageDescriptor) => boolean;
  render: (page: PageDescriptor) => ReactNode;
}

const SETTINGS_SECTIONS: InjectedSection[] = [
  {
    name: "controller-lighting",
    match: (page) => String(page.route || "").startsWith("/settings/controller"),
    render: () => <ControllerLightingSection />,
  },
  {
    name: "power-limits",
    match: (page) => page.route === "/settings/power",
    render: () => <PowerLimitsSection />,
  },
  {
    name: "external-display",
    match: (page) => page.route === "/settings/display",
    render: () => <ExternalDisplaySection />,
  },
  {
    name: "cloud-sync",
    match: (page) => page.route === "/settings/cloud",
    render: () => <CloudSyncSection />,
  },
  {
    name: "library-add-game",
    match: (page) => page.route === "/settings/library",
    render: () => <LibraryAddGameSection />,
  },
  {
    name: "internet-ssh",
    match: (page) => page.route === "/settings/internet",
    render: () => <SshSection />,
  },
  {
    name: "ingame-overlay",
    match: (page) => page.route === "/settings/ingame",
    render: () => <InGameOverlaySection />,
  },
  {
    name: "notification-flash",
    match: (page) => page.route === "/settings/notifications",
    render: () => <NotificationFlashSection />,
  },
  {
    name: "control-center-entry",
    match: (page) => page.route === "/settings/system",
    render: () => <ControlCenterSection />,
  },
];

const PROPERTIES_SECTIONS: InjectedSection[] = [
  {
    name: "game-tweaks",
    // Compatibility is the natural home for per-game tweaks (Steam games and
    // non-Steam shortcuts both get a Compatibility page).
    match: (page) => String(page.route || "").endsWith("/properties/compatibility"),
    render: (page) => {
      const appid = String(page.link || "").match(/\/app\/(\d+)\//)?.[1] || "";
      return appid ? <GameTweaksSection appid={appid} /> : null;
    },
  },
];

interface InjectionKind {
  name: string;
  sections: InjectedSection[];
  hostMatch: (page: PageDescriptor) => boolean;
}

const KINDS: Record<"settings" | "properties", InjectionKind> = {
  settings: {
    name: "settings",
    sections: SETTINGS_SECTIONS,
    hostMatch: (page) => String(page?.route || "").startsWith("/settings"),
  },
  properties: {
    name: "properties",
    sections: PROPERTIES_SECTIONS,
    hostMatch: (page) => /\/app\/(\d+|\:appid)\/properties/.test(String(page?.route || "") + " " + String(page?.link || "")),
  },
};

// Every render produces fresh element objects carrying the ORIGINAL
// component types, so "wrap once and skip" breaks the cascade on the very
// next render. Cache wrappers per original type (stable identity - no
// remounts) and substitute on every element we scan.
const wrappedTypeCache = new WeakMap<any, any>();
const hostFound = new Set<string>();
const hostMissLogged = new Set<string>();

function wrapPagesInHost(host: any, kind: InjectionKind) {
  const pages: PageDescriptor[] = host.props.pages;
  const touched: string[] = [];
  const nextPages = pages.map((page) => {
    if (page?.__nebelWrapped) return page;
    const section = kind.sections.find((candidate) => {
      try {
        return candidate.match(page);
      } catch (error) {
        return false;
      }
    });
    if (!section) return page;
    let node: ReactNode = null;
    try {
      node = section.render(page);
    } catch (error) {
      console.warn(LOG, kind.name, section.name, "render factory failed", error);
    }
    if (!node) return page;
    touched.push(section.name);
    return {
      ...page,
      __nebelWrapped: true,
      content: (
        <>
          {page.content}
          <ErrorBoundary>{node}</ErrorBoundary>
        </>
      ),
    };
  });
  if (!touched.length) return;
  host.props.pages = nextPages;
  if (!hostFound.has(kind.name)) {
    hostFound.add(kind.name);
    console.log(LOG, kind.name, "injected sections:", touched.join(", "));
  }
}

function isPagesHost(el: any, kind: InjectionKind): boolean {
  const pages = el?.props?.pages;
  return (
    Array.isArray(pages) &&
    pages.some((page: any) => {
      if (typeof page?.route !== "string") return false;
      try {
        return kind.hostMatch(page);
      } catch (error) {
        return false;
      }
    })
  );
}

// Wraps a component type (plain function, memo/observer object, or
// forwardRef object) so that when it renders, its output tree is scanned
// too. Returns the cached wrapper (stable identity), or the input unchanged
// when there is nothing wrappable.
function wrapComponentType(type: any, kind: InjectionKind): any {
  if (!type || typeof type === "string") return type;
  if (typeof type === "function") {
    if (type.prototype?.isReactComponent || (type as any)[NEO_WRAPPED]) return type;
    const cached = wrappedTypeCache.get(type);
    if (cached) return cached;
    const wrapped = (componentProps: any) => {
      const ret = type(componentProps);
      try {
        scanTree(ret, kind, 0);
      } catch (error) {
        console.warn(LOG, kind.name, "scan failed in", type.name || "component", error);
      }
      return ret;
    };
    Object.assign(wrapped, type);
    wrapped.toString = () => type.toString();
    (wrapped as any)[NEO_WRAPPED] = true;
    wrappedTypeCache.set(type, wrapped);
    return wrapped;
  }
  if (typeof type === "object") {
    // mobx observer()/React.memo(): {$$typeof, type: fn}; forwardRef:
    // {$$typeof, render: fn}. Spread keeps $$typeof and compare/render props.
    const inner = typeof type.type === "function" ? "type" : typeof type.render === "function" ? "render" : null;
    if (!inner || (type[inner] as any)[NEO_WRAPPED]) return type;
    const cached = wrappedTypeCache.get(type);
    if (cached) return cached;
    const wrappedInner = wrapComponentType(type[inner], kind);
    if (wrappedInner === type[inner]) return type;
    const wrapped = { ...type, [inner]: wrappedInner };
    wrappedTypeCache.set(type, wrapped);
    return wrapped;
  }
  return type;
}

// Walks a returned (still unrendered) element fragment. Pages hosts get their
// matching page contents wrapped immediately; component children get their
// type wrapped once so the scan cascades into their render output.
function scanTree(node: any, kind: InjectionKind, depth: number) {
  if (!node || typeof node !== "object" || depth > 12) return;
  if (Array.isArray(node)) {
    for (const child of node) scanTree(child, kind, depth);
    return;
  }
  const props = node.props;
  if (!props || typeof props !== "object") return;
  if (isPagesHost(node, kind)) {
    try {
      wrapPagesInHost(node, kind);
    } catch (error) {
      console.warn(LOG, kind.name, "wrapping pages failed", error);
    }
  } else {
    try {
      const nextType = wrapComponentType(node.type, kind);
      if (nextType !== node.type) node.type = nextType;
    } catch (error) {
      console.warn(LOG, kind.name, "type wrap failed", error);
    }
  }
  scanTree(props.children, kind, depth + 1);
}

function makeRoutePatch(kind: InjectionKind): RoutePatch {
  return (route: any) => {
    try {
      const child = route?.children;
      const first = Array.isArray(child) ? child[0] : child;
      const originalType = first?.type;
      if ((originalType as any)?.[NEO_WRAPPED]) return route;
      const patchedType = wrapComponentType(originalType, kind);
      if (patchedType === originalType) {
        if (!hostMissLogged.has(`${kind.name}-type`)) {
          hostMissLogged.add(`${kind.name}-type`);
          console.log(LOG, kind.name, "route child has no wrappable component type:", typeof originalType);
        }
        return route;
      }
      const patchedChild = { ...first, type: patchedType };
      route.children = Array.isArray(child) ? [patchedChild, ...child.slice(1)] : patchedChild;
      console.log(LOG, kind.name, "route component wrapped");
    } catch (error) {
      console.warn(LOG, kind.name, "route patch failed", error);
    }
    return route;
  };
}

// Installs both injections; returns the uninstaller for onDismount. Never
// throws - a half-broken Steam update must cost us the duplicates, not the
// plugin.
export function installNativeSettingsSections(): () => void {
  console.log(LOG, "installing");
  let settingsPatch: RoutePatch | null = null;
  let propertiesPatch: RoutePatch | null = null;
  try {
    settingsPatch = routerHook.addPatch("/settings", makeRoutePatch(KINDS.settings));
  } catch (error) {
    console.warn(LOG, "failed to register /settings patch", error);
  }
  try {
    propertiesPatch = routerHook.addPatch("/app/:appid/properties", makeRoutePatch(KINDS.properties));
  } catch (error) {
    console.warn(LOG, "failed to register /app/:appid/properties patch", error);
  }
  return () => {
    try {
      if (settingsPatch) routerHook.removePatch("/settings", settingsPatch);
      if (propertiesPatch) routerHook.removePatch("/app/:appid/properties", propertiesPatch);
    } catch (error) {
    }
  };
}
