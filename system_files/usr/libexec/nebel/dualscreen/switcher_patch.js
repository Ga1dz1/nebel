// switcher_patch.js — add "Y = send to internal screen" to the BPM window
// switcher (the "Switch Windows" section of the App overlay menu). Patches
// the webpack module factory before it executes; Y is hidden when
// single-output. Run from SharedJSContext via cefeval.py (fire-and-forget).
//
// Anchors are REGEX-based: minified variable names change with every Steam
// client build (a.vrIcon={appid:s,enum:K.YZ.zt},g.push(a) became
// vt.vrIcon={appid:Nt,enum:$.YZ.zt},oe.push(vt) in the 2026-09-16 build),
// so match the stable structure and reuse the captured names.
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
    // item hook: called from the patched switcher builder for each window
    // entry. (item, winfo, appid) are captured from the module source.
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
    const MARKER = "__seatY";
    // Minified identifiers may include '$' (enum:$.YZ.zt), which \w misses.
    const RE_TAIL = /([A-Za-z0-9_$]+)\.vrIcon=\{appid:([A-Za-z0-9_$]+),enum:([A-Za-z0-9_$]+)\.YZ\.zt\},([A-Za-z0-9_$]+)\.push\(([A-Za-z0-9_$]+)\)/;
    const RE_STRKEY = /\{strKey:([A-Za-z0-9_$]+)\.windowid\?\.toString\(\)/g;
    const RE_PROPS = /onSecondaryButton:([A-Za-z0-9_$]+)\.fnSecondaryAction,onSecondaryActionDescription:\1\.strSecondaryActionLabel\}/;
    const patchSource = (src)=>{
      if (src.indexOf(MARKER) >= 0) return null;
      const m = RE_TAIL.exec(src);
      if (!m) return null;
      const item = m[1], appid = m[2], enumv = m[3], lst = m[4];
      if (item !== m[5]) return null;
      // window-info object: last {strKey:WINFO.windowid...} before the anchor
      let winfo = null;
      RE_STRKEY.lastIndex = 0;
      let sm;
      const head = src.slice(Math.max(0, m.index - 8000), m.index);
      while ((sm = RE_STRKEY.exec(head))) winfo = sm[1];
      if (!winfo) return null;
      let out = src.slice(0, m.index)
        + item + ".vrIcon={appid:" + appid + ",enum:" + enumv + ".YZ.zt},"
        + "window." + MARKER + "&&window." + MARKER + "(" + item + "," + winfo + "," + appid + "),"
        + lst + ".push(" + item + ")"
        + src.slice(m.index + m[0].length);
      out = out.replace(RE_PROPS, (all, v)=>
        "onSecondaryButton:" + v + ".fnSecondaryAction,"
        + "onSecondaryActionDescription:" + v + ".strSecondaryActionLabel,"
        + "onOptionsButton:" + v + ".fnOptionsAction,"
        + "onOptionsActionDescription:" + v + ".strOptionsActionLabel}");
      if (out === src) return null;
      return out;
    };
    // wait for steamui webpack chunks to be present (autostart runs early)
    let tries = 0;
    while (tries++ < 30) {
      let found = false;
      try { for (const ch of (window.webpackChunksteamui||[])) { if (ch[1] && Object.keys(ch[1]).length) { found = true; break; } } } catch(_) {}
      if (found) break;
      await new Promise(r=>setTimeout(r,2000));
    }
    if (typeof webpackChunksteamui === "undefined") return "no chunks";
    if (!window.__req) webpackChunksteamui.push([[710000+Math.floor(Math.random()*89999)],{},(r)=>{window.__req=r}]);
    let patched = 0;
    const patchedIds = [];
    for (const ch of webpackChunksteamui) {
      const mods = ch[1];
      if (!mods) continue;
      for (const id of Object.keys(mods)) {
        if (typeof mods[id] !== "function") continue;
        let src;
        try { src = mods[id].toString(); } catch(_) { continue; }
        if (src.indexOf(MARKER) >= 0) { patched++; continue; }
        if (!RE_TAIL.test(src) && src.indexOf("strSecondaryActionLabel") < 0) continue;
        const s2 = patchSource(src);
        if (s2 && s2 !== src) {
          try { mods[id] = eval("(" + s2 + ")"); patched++; patchedIds.push(id); } catch(_) {}
        }
      }
    }
    // if the switcher module has not executed yet, requiring it now runs our
    // patched factory, so the patched exports become the cached ones
    try { if (patchedIds.length) window.__req(Number(patchedIds[0])); } catch(_) {}
    return "patched=" + patched + " ids=" + patchedIds.join(",") + " dual=" + window.__seatDual + " label=" + window.__seatYLabel;
  } catch(err) { return "THROW: " + (err && err.stack || err); }
})()
