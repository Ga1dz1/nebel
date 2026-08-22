import { definePlugin } from "@decky/api";
import { getCompatApplied, getConfig, getInstalledGames, saveCompatApplied } from "./backend";
import { Content } from "./Content";
import {
  configureCompatPolicy,
  handledGameAppids,
  registerDownloadWatcher,
  sweepInstalledGames,
} from "./lib/steamCompat";

export default definePlugin(() => {
  let unregisterDownloadWatcher = () => {};
  const persistHandledGames = () => {
    saveCompatApplied(handledGameAppids()).catch((error) => {
      console.error("[Nebel Control] saveCompatApplied failed", error);
    });
  };
  let cancelled = false;
  const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  // getConfig/getInstalledGames run this early in session startup, when the
  // backend socket or Steam's own library scan can still be warming up - a
  // single transient failure here used to silently disable auto-apply for
  // the rest of the session (this whole block was one Promise.all with no
  // retry and a swallowed .catch), which is indistinguishable from the
  // feature just not working at all. Retries give a slow-starting backend
  // a real chance instead of one shot.
  const bootstrap = async (attempt = 1): Promise<void> => {
    if (cancelled) return;
    const handledRequest = getCompatApplied()
      .then((appids) => ({ appids, loaded: true }))
      .catch((error) => {
        console.error("[Nebel Control] getCompatApplied failed", error);
        return { appids: [] as string[], loaded: false };
      });
    let config;
    let games;
    let handled;
    try {
      [config, games, handled] = await Promise.all([getConfig(), getInstalledGames(), handledRequest]);
    } catch (error) {
      console.error(`[Nebel Control] compat bootstrap failed (attempt ${attempt})`, error);
      if (attempt >= 5 || cancelled) return;
      await delay(Math.min(30000, 2000 * attempt));
      return bootstrap(attempt + 1);
    }
    if (cancelled) return;
    configureCompatPolicy(
      config.tweaks?.global?.windowsCompatTool,
      handled.loaded && config.tweaks?.global?.autoApplyCompat !== false,
      handled.appids,
    );
    const persist = handled.loaded ? persistHandledGames : () => {};
    unregisterDownloadWatcher = registerDownloadWatcher(persist);
    window.setTimeout(() => {
      if (cancelled) return;
      sweepInstalledGames(games.map((game) => game.appid))
        .then(persist)
        .catch((error) => {
          console.error("[Nebel Control] sweepInstalledGames failed", error);
        });
    }, 3000);
  };
  bootstrap();
  return {
    name: "Nebel Control",
    content: <Content />,
    onDismount() {
      cancelled = true;
      unregisterDownloadWatcher();
    },
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 17H5" />
        <path d="M19 7h-9" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </svg>
    ),
    alwaysRender: true,
  };
});
