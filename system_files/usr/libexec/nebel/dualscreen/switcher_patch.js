// switcher_patch.js — add "Y = send to internal screen" to the BPM window
// switcher (module 15821, "Switch Windows" section). Patches the webpack
// module factory before it executes; Y is hidden when single-output.
// Run from SharedJSContext via cefeval.py (fire-and-forget).
(async()=>{
  try {
    // localized hint label
    let lang = "english";
    try { lang = String(await SteamClient.Settings.GetCurrentLanguage() || "english").toLowerCase(); } catch(_) {}
    const labels = {
      russian: "На внутренний экран",
      ukrainian: "На внутрішній екран",
      english: "Send to internal screen"
    };
    window.__seatYLabel = labels[lang] || labels.english;
    // dual-output gate (cached; refreshed by seatA-autostart on session start)
    window.__seatDual = false;
    const refreshGate = ()=>{
      try {
        fetch("http://127.0.0.1:48717/state").then(r=>r.json()).then(j=>{ window.__seatDual = !!j.dual; }).catch(()=>{});
      } catch(_) {}
    };
    refreshGate();
    // item hook: called from patched le() for each window entry
    window.__seatY = (item, winfo, appid)=>{
      if (!window.__seatDual) return;
      const wid = winfo && winfo.windowid;
      if (wid == null) return;
      item.fnOptionsAction = ()=>{
        refreshGate();
        try {
          fetch("http://127.0.0.1:48717/seat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({win: "0x" + wid.toString(16), seat: "a"})
          }).catch(()=>{});
        } catch(_) {}
      };
      item.strOptionsActionLabel = window.__seatYLabel;
    };
    // patch module 15821 factory (all chunk copies)
    const ANCHOR_ITEM = "a.vrIcon={appid:s,enum:K.YZ.zt},g.push(a)";
    const ANCHOR_ITEM_NEW = "a.vrIcon={appid:s,enum:K.YZ.zt},window.__seatY&&window.__seatY(a,n,s),g.push(a)";
    const ANCHOR_PROPS = "onSecondaryActionDescription:e.strSecondaryActionLabel}";
    const ANCHOR_PROPS_NEW = "onSecondaryActionDescription:e.strSecondaryActionLabel,onOptionsButton:e.fnOptionsAction,onOptionsActionDescription:e.strOptionsActionLabel}";
    // wait for steamui webpack chunks to be present (autostart runs early)
    let tries = 0;
    while (tries++ < 30) {
      let found = false;
      try { for (const ch of (window.webpackChunksteamui||[])) { if (ch[1] && ch[1][15821]) { found = true; break; } } } catch(_) {}
      if (found) break;
      await new Promise(r=>setTimeout(r,2000));
    }
    if (typeof webpackChunksteamui === "undefined") return "no chunks";
    if (!window.__req) webpackChunksteamui.push([[710000+Math.floor(Math.random()*89999)],{},(r)=>{window.__req=r}]);
    let patched = 0;
    for (const ch of webpackChunksteamui) {
      const mods = ch[1];
      if (mods && mods[15821]) {
        const src = mods[15821].toString();
        if (src.indexOf("__seatY") >= 0) { patched++; continue; }
        let s2 = src.replace(ANCHOR_ITEM, ANCHOR_ITEM_NEW);
        s2 = s2.replace(ANCHOR_PROPS, ANCHOR_PROPS_NEW);
        if (s2 !== src) { mods[15821] = eval("(" + s2 + ")"); patched++; }
      }
    }
    // if 15821 has not executed yet, requiring it now runs our patched factory,
    // so the patched exports become the cached ones for the whole session
    try { window.__req(15821); } catch(_) {}
    return "patched=" + patched + " dual=" + window.__seatDual + " label=" + window.__seatYLabel;
  } catch(err) { return "THROW: " + (err && err.stack || err); }
})()
