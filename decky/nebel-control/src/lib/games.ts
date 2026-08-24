import { Router } from "@decky/ui";
import { t } from "../i18n";
import { isGameApp } from "./steamCompat";
import type { Config, DropdownChoice, GameRef } from "../types";

export function gameDisplayName(game: GameRef | null | undefined): string {
  if (!game?.appid) return "";
  return game.name || `App ${game.appid}`;
}

export function availableGames(config: Config): GameRef[] {
  const games = new Map<string, GameRef>();
  for (const game of config.installedGames || []) {
    if (game?.appid && isGameApp(game.appid)) {
      games.set(String(game.appid), { appid: String(game.appid), name: game.name || `App ${game.appid}` });
    }
  }
  return Array.from(games.values()).sort((a, b) => gameDisplayName(a).localeCompare(gameDisplayName(b)));
}

export function editTargetOptions(config: Config): DropdownChoice[] {
  return [
    { data: "", label: t("Default") },
    ...availableGames(config).map((game) => ({ data: game.appid, label: gameDisplayName(game) })),
  ];
}

export function currentGame(): GameRef | null {
  const running = (Router as any)?.MainRunningApp || window.Router?.MainRunningApp;
  const appid = running?.appid;
  if (!appid) return null;
  return gameRefFromAppid(String(appid), running?.display_name || running?.displayName || "");
}

// Name resolution for a known appid (Properties-page injection passes the
// appid from the route, so the Games editor can lock onto it without the
// picker). Falls back to "App <id>" while stores are still cold.
export function gameRefFromAppid(appid: string, fallbackName = ""): GameRef {
  const id = String(appid);
  let name = fallbackName;
  try {
    const overview = (window as any).appStore?.GetAppOverviewByAppID?.(Number(id));
    name = overview?.display_name || name;
  } catch (error) {
  }
  try {
    const details: any = window.appDetailsStore?.GetAppDetails?.(Number(id));
    name = details?.strDisplayName || details?.strName || details?.name || name;
  } catch (error) {
  }
  return { appid: id, name: name || `App ${id}` };
}
