// seatA_render.js — Nebel companion view renderer for the second (internal)
// panel window ("NebelSeatB").
//
// SELF-HEALING: never trust hardcoded webpack module IDs — Steam re-bundles
// every client build and shifts them (20.09 beta moved 20 of 27). Resolution
// order per dependency:
//   1. known-good window globals (stores survive as window.* on new clients)
//   2. the old hardcoded ID, if it still resolves
//   3. a content scan over webpackChunksteamui factories (marker strings)
// Optional Steam-component deps (QAM/pause modes, provider tree) that fail
// all three steps degrade the seat to the always-available card views,
// never a blank window.
(async()=>{
  try {
    // --- error capture FIRST: diagnose the next breakage from the logs ---
    window.__errs = window.__errs || [];
    if (!window.__errHooked) {
      window.__errHooked = true;
      const oe = console.error;
      console.error = function(...args){ try{ window.__errs.push(args.map(x=>String(x && x.stack || x)).join(" ").slice(0,1500)); }catch(_){}; return oe.apply(this,args); };
      const ou = console.warn && !window.__warnHooked ? console.warn : null;
      if (ou) { window.__warnHooked = true; console.warn = function(...args){ try{ if (window.__errs.length < 40) window.__errs.push("W:"+args.map(String).join(" ").slice(0,300)); }catch(_){}; return ou.apply(this,args); }; }
    }
    const w = window.__seatB;
    if (!w || w.closed) return "popup gone";
    // --- webpack require + content-scan resolver ---
    if (!window.__req) webpackChunksteamui.push([[700000+Math.floor(Math.random()*99999)],{},(r)=>{window.__req=r}]);
    const req = window.__req;
    const tryReq = (id)=>{ try { return req(id); } catch(_) { return null; } };
    const MOD_CACHE = {};
    const scanModule = (must, verify)=>{
      const key = must.join("|");
      if (MOD_CACHE[key] !== undefined) return MOD_CACHE[key];
      let found = null;
      const chunks = window.webpackChunksteamui || [];
      outer: for (const ch of chunks) {
        const mods = ch && ch[1];
        if (!mods) continue;
        for (const id in mods) {
          const f = mods[id];
          if (typeof f !== "function") continue;
          let src;
          try { src = f.toString(); } catch(_) { continue; }
          let ok = true;
          for (const m of must) { if (src.indexOf(m) < 0) { ok = false; break; } }
          if (!ok) continue;
          const exp = tryReq(Number(id));
          if (exp && (!verify || verify(exp))) { found = exp; break outer; }
        }
      }
      MOD_CACHE[key] = found;
      return found;
    };
    // --- React: old ID first, then scan (production react factory) ---
    const React = tryReq(63696) || scanModule(["createElement","useState","useEffect","memo"], (m)=>m && m.createElement && m.useState && m.Component);
    if (!React) return "THROW: react not found";
    const e = React.createElement;
    // --- react-dom createRoot (98131 = react-dom/client; scan w/o hydrateRoot) ---
    const ReactDOM = tryReq(98131) || scanModule(["createRoot"], (m)=>m && typeof m.createRoot === "function");
    // --- mobx observer (old ID survived 20.09; scan as fallback) ---
    const obsMod = tryReq(41230) || scanModule(["observer"], (m)=>m && (typeof m.PA === "function" || typeof m.observer === "function"));
    const obs = (typeof (obsMod && obsMod.PA) === "function") ? obsMod.PA
              : (typeof (obsMod && obsMod.observer) === "function") ? obsMod.observer : null;
    // Fallback reactivity: 1s forceUpdate wrapper when mobx-react is gone.
    const poll = (Comp)=>function(props){ const [,f]=React.useState(0); React.useEffect(()=>{const t=setInterval(()=>f(x=>x+1),1000);return ()=>clearInterval(t);},[]); return e(Comp,props); };
    const withObs = (Comp)=> obs ? obs(Comp) : poll(Comp);
    // --- stores: window globals (verified live on 20.09 beta) ---
    const AS = window.appStore;                 // GetAppOverviewByAppID, custom images
    const coll = window.collectionStore;        // GetCollection
    const pH = window.appDetailsStore;          // GetAppDetails, RegisterForAppData
    const tw = AS;                              // overview store === appStore
    const mO = null;                            // FetchDataForApp: gone; RegisterForAppData loads
    if (!AS || !coll || !pH) return "THROW: store globals missing (appStore/collectionStore/appDetailsStore)";
    // --- collections by system-name map, with graceful fallbacks ---
    const sysCollId = (name)=>{ try { const m=coll.m_mapSystemCollectionNameToId; if (m) { if (m.has && m.has(name)) return m.get(name); if (m.get) return m.get(name) || null; } } catch(_) {} return null; };
    const getColl = (names)=>{ for (const n of names) { try { const id=sysCollId(n); const c = (id!==null && id!==undefined) ? coll.GetCollection(id) : coll.GetCollection(n); if (c) return c; } catch(_) { try { const c2=coll.GetCollection(n); if (c2) return c2; } catch(__) {} } } return null; };
    const cMyGames = getColl(["mygames","my-games","all","allgames","my games"]);
    const cRecent  = getColl(["recent","recently-played","недавние","played recently"]);
    // --- optional steamui component deps (QAM/pause/full provider tree) ---
    const aWin   = tryReq(61236) || scanModule(["GamepadUIMainWindowInstance"], (m)=>m && m.oy && m.oy.WindowStore);
    const QAMmod = tryReq(79476) || scanModule(["QuickAccess"], (m)=>m && (typeof m.pZ === "function"));
    const EzMod  = tryReq(5822);
    const RW     = tryReq(97329) || scanModule(["overscanCount","FixedSizeList"], (m)=>m && (typeof m.Y1 === "function" || typeof m.FixedSizeList === "function"));
    const RWList = RW ? (RW.Y1 || RW.FixedSizeList) : null;
    const FocusM = tryReq(69164) || scanModule(["gpfocus"], (m)=>m && typeof m.Z === "function");
    const FZ = (FocusM && FocusM.Z) || null;
    // providers (only needed to host real steamui components)
    const prov = {};
    for (const [k,id] of Object.entries({nav:35560,b5m:3524,cfg:72476,inst:96680,app:3375,qc:21371,pop:11131,st:46382,navCtx:79112,bs:51115,StoreA:73870,acct:24295})) prov[k]=tryReq(id);
    const fullTree = aWin && QAMmod && prov.nav && prov.b5m && prov.cfg && prov.inst && prov.app && prov.qc && prov.pop && prov.st && prov.navCtx && prov.bs && prov.StoreA && prov.acct;
    const MenuStoreClass = EzMod ? (EzMod.QG || null) : null;
    // --- seat content setting ---
    const fetchSeatCfg = ()=>{ try { fetch("http://127.0.0.1:48717/config").then(r=>r.json()).then(j=>{ window.__seatACfg = j; }).catch(()=>{}); } catch(_) {} };
    fetchSeatCfg();
    class SeatBoundary extends React.Component {
      constructor(p){ super(p); this.state = {err:false}; }
      static getDerivedStateFromError(){ return {err:true}; }
      componentDidCatch(err){ try{ window.__errs.push("seat:"+String(err&&err.stack||err).slice(0,300)); }catch(_){} }
      render(){ return this.state.err ? this.props.fallback : this.props.children; }
    }
    // --- i18n ---
    let __steamlang = "english";
    try { __steamlang = String(await SteamClient.Settings.GetCurrentLanguage() || "english").toLowerCase(); } catch(_) {}
    const L_ALL = {
      russian:   {playtime:"Наиграно", lastplayed:"Последний запуск", achievements:"Достижения", compat:"Совместимость", launchopts:"Параметры запуска", defcompat:"по умолчанию", dev:"Разработчик", pub:"Издатель", downloads:"Загрузки", mygames:"Мои игры", recent:"Продолжить играть", min:"мин", hr:"ч", gb:"ГБ", mb:"МБ", kb:"КБ", sec:"с", bps:"/с", loading:"Загрузка…"},
      ukrainian: {playtime:"Награно", lastplayed:"Останній запуск", achievements:"Досягнення", compat:"Сумісність", launchopts:"Параметри запуску", defcompat:"типово", dev:"Розробник", pub:"Видавець", downloads:"Завантаження", mygames:"Мої ігри", recent:"Продовжити гру", min:"хв", hr:"год", gb:"ГБ", mb:"МБ", kb:"КБ", sec:"с", bps:"/с", loading:"Завантаження…"},
      english:   {playtime:"Playtime", lastplayed:"Last played", achievements:"Achievements", compat:"Compatibility", launchopts:"Launch options", defcompat:"Default", dev:"Developer", pub:"Publisher", downloads:"Downloads", mygames:"My Games", recent:"Continue Playing", min:"min", hr:"h", gb:"GB", mb:"MB", kb:"KB", sec:"s", bps:"/s", loading:"Loading…"}
    };
    const L = L_ALL[__steamlang] || L_ALL.english;
    const isSteamApp = (ov)=> ov && ov.app_type===1;
    const fmtPlaytime = (min)=>{ min=Math.round(min||0); if(min<=0) return null; if(min<60) return min+" "+L.min; const h=min/60; return (h>=100?String(Math.round(h)):h.toFixed(1).replace(/\.0$/,""))+" "+L.hr; };
    const fmtDate = (ts)=>{ if(!ts) return null; try { return new Date(ts*1000).toLocaleDateString(); } catch(_) { return null; } };
    const HeroImg = function(props){
      const [idx, setIdx] = React.useState(0);
      const [loaded, setLoaded] = React.useState(false);
      const url = props.urls[idx];
      if (!url) return null;
      return e("img",{src:url, onError:()=>setIdx(i=>i+1), onLoad:()=>setLoaded(true),
        style:{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity .3s"}});
    };
    const CompanionView = withObs(function(props){
      const appid = props.appid;
      const ov = tw.GetAppOverviewByAppID(appid);
      const details = pH.GetAppDetails(appid);
      const steam = isSteamApp(ov);
      const [retry, setRetry] = React.useState(0);
      React.useEffect(()=>{
        const h = pH.RegisterForAppData(appid);
        if (steam) { try { window.StoreItemCache.QueueStoreItemRequest(appid, 0, {include_basic_info:true, include_assets:true, include_description:true, include_tag_count:10}); } catch(_) {} }
        const t1 = setTimeout(()=>setRetry(1), 1200);
        const t2 = setTimeout(()=>setRetry(2), 3500);
        return ()=>{ clearTimeout(t1); clearTimeout(t2); try { h && h.unregister(); } catch(_) {} };
      }, [appid]);
      void retry;
      let item = null;
      if (steam) { try { item = window.StoreItemCache.GetStoreItem(appid, 0) || null; } catch(_) {} }
      let assets = null;
      try { assets = item && item.GetAssets ? item.GetAssets() : null; } catch(_) {}
      const absUrl = (u)=> u && u.startsWith("/") ? "https://steamloopback.host"+u : u;
      const capsuleUrls = (ov2)=>{
        const urls = [];
        try { (AS.GetCustomVerticalCapsuleURLs(ov2)||[]).forEach(u=>urls.push(absUrl(u))); } catch(_) {}
        try { const u = AS.GetVerticalCapsuleURLForApp(ov2); if (u) urls.push(u); } catch(_) {}
        try { const u = AS.GetPregeneratedVerticalCapsuleForApp(ov2); if (u) urls.push(u); } catch(_) {}
        try { const u = AS.GetIconURLForApp(ov2); if (u) urls.push(u); } catch(_) {}
        return urls;
      };
      const urls = [];
      if (ov) {
        try { (AS.GetCustomHeroImageURLs(ov)||[]).forEach(u=>urls.push(absUrl(u))); } catch(_) {}
        try { if (assets && assets.m_strLibraryHeroURL) urls.push(assets.m_strLibraryHeroURL); } catch(_) {}
        try { if (assets && assets.m_strHeaderURL) urls.push(assets.m_strHeaderURL); } catch(_) {}
        try { if (details && details.strStoreHeaderImage) urls.push(details.strStoreHeaderImage); } catch(_) {}
        capsuleUrls(ov).forEach(u=>{ if (urls.indexOf(u)<0) urls.push(u); });
      }
      let logo = null;
      if (ov) {
        try { const c = AS.GetCustomLogoImageURLs(ov)||[]; if (c.length) logo = absUrl(c[0]); } catch(_) {}
        try { if (!logo && assets && assets.m_strLibraryLogoURL) logo = assets.m_strLibraryLogoURL; } catch(_) {}
      }
      const name = ov ? ov.display_name : (item ? item.GetName() : "App "+appid);
      let desc=""; try { desc = item ? (item.GetShortDescription()||"") : ""; } catch(_) {}
      let devs=[], pubs=[];
      try { devs = item ? (item.GetDeveloperNames()||[]) : []; } catch(_) {}
      try { pubs = item ? (item.GetPublisherNames()||[]) : []; } catch(_) {}
      if (!devs.length && details && details.strDeveloperName) devs = [details.strDeveloperName];
      const ach = details && details.achievements;
      const nTotal = ach ? (ach.nTotal||0) : 0, nAch = ach ? (ach.nAchieved||0) : 0;
      const pt = ov ? fmtPlaytime(ov.minutes_playtime_forever) : null;
      const lastTs = ov ? (ov.rt_last_time_locally_played || ov.rt_last_time_played) : 0;
      const last = fmtDate(lastTs);
      const chips = [];
      if (pt) chips.push(L.playtime+": "+pt);
      if (last) chips.push(L.lastplayed+": "+last);
      if (!steam) chips.push("Non-Steam");
      let compat = null;
      if (steam && details) {
        const disp = details.strCompatToolDisplayName||"";
        const tool = details.strCompatToolName||"";
        compat = disp || tool || L.defcompat;
      }
      let launch = details ? String(details.strLaunchOptions||"").trim() : "";
      if (launch.length>60) launch = launch.slice(0,60)+"…";
      return e("div",{style:{height:"100%",overflowY:"auto",boxSizing:"border-box",background:"#10151d"}},
        e("div",{style:{position:"relative",height:"46%",minHeight:220,background:"#1a222e",overflow:"hidden"}},
          e(HeroImg,{urls:urls, key:appid}),
          e("div",{style:{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(16,21,29,0) 40%, rgba(16,21,29,.95) 100%)"}}),
          e("div",{style:{position:"absolute",left:28,bottom:18,right:28}},
            logo ? e("img",{src:logo, style:{maxWidth:"60%",maxHeight:110,objectFit:"contain",objectPosition:"left bottom"}})
                 : e("div",{style:{color:"#fff",fontSize:30,fontWeight:700,lineHeight:1.15,textShadow:"0 2px 8px rgba(0,0,0,.6)"}}, name))),
        e("div",{style:{padding:"18px 28px 40px"}},
          logo ? e("div",{style:{color:"#dcdedf",fontSize:15,marginBottom:8}}, name) : null,
          chips.length ? e("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginBottom:6}},
            chips.map((c,i)=> e("span",{key:i, style:{color:"#c7d0d8",fontSize:14,background:"#1f2833",borderRadius:4,padding:"4px 10px"}}, c))) : null,
          nTotal>0 ? e("div",{style:{margin:"10px 0"}},
            e("div",{style:{color:"#c7d0d8",fontSize:14,marginBottom:5}}, L.achievements+": "+nAch+" / "+nTotal),
            e("div",{style:{height:6,borderRadius:3,background:"#2a3542"}},
              e("div",{style:{height:"100%",width:Math.round(100*nAch/nTotal)+"%",borderRadius:3,background:"#5c7e10"}}))) : null,
          (devs.length||pubs.length) ? e("div",{style:{color:"#8f98a0",fontSize:14,margin:"8px 0"}},
            [devs.length?(L.dev+": "+devs.join(", ")):null, pubs.length?(L.pub+": "+pubs.join(", ")):null].filter(Boolean).join("  •  ")) : null,
          desc ? e("div",{style:{color:"#acb2b8",fontSize:15,lineHeight:1.55,marginTop:10,whiteSpace:"pre-wrap"}}, desc) : null,
          compat ? e("div",{style:{color:"#8f98a0",fontSize:14,marginTop:12}}, L.compat+": "+compat) : null,
          launch ? e("div",{style:{color:"#8f98a0",fontSize:14,marginTop:6,wordBreak:"break-all"}}, L.launchopts+": "+launch) : null));
    });
    const absUrl = (u)=> u && u.startsWith("/") ? "https://steamloopback.host"+u : u;
    const capsuleUrls = (ov)=>{
      const urls = [];
      try { (AS.GetCustomVerticalCapsuleURLs(ov)||[]).forEach(u=>urls.push(absUrl(u))); } catch(_) {}
      try { const u = AS.GetVerticalCapsuleURLForApp(ov); if (u) urls.push(u); } catch(_) {}
      try { const u = AS.GetPregeneratedVerticalCapsuleForApp(ov); if (u) urls.push(u); } catch(_) {}
      try { const u = AS.GetIconURLForApp(ov); if (u) urls.push(u); } catch(_) {}
      return urls;
    };
    const Cap = React.memo(function(props){
      const ov = props.ov, sz = props.size || 150;
      const urls = React.useMemo(()=>capsuleUrls(ov), [ov.appid]);
      const [idx, setIdx] = React.useState(0);
      const [focused, setFocused] = React.useState(false);
      const url = urls[idx];
      const open = ()=>{ try { const n = window.tempNavStore.GetNavigator(); n && n.App(ov.appid, {}); } catch(_){} };
      const style = {width:sz, height:Math.round(sz*1.5), borderRadius:4, overflow:"hidden", flex:"0 0 auto", background:"#1a222e",
                outline: focused?"2px solid #fff":"none", transform: focused?"scale(1.05)":"none", transition:"transform .12s",
                display:"flex", alignItems:"center", justifyContent:"center"};
      const img = url ? e("img",{src:url, loading:"lazy", decoding:"async", onError:()=>setIdx(i=>i+1), style:{width:"100%",height:"100%",objectFit:"cover"}})
             : e("div",{style:{color:"#fff",padding:8,fontSize:12,textAlign:"center"}}, ov.display_name);
      if (FZ) return e(FZ, { focusable: true, onActivate: open, onFocus: ()=>setFocused(true), onBlur: ()=>setFocused(false), style }, img);
      return e("div",{ onClick: open, style: Object.assign({}, style, {cursor:"pointer"}) }, img);
    });
    const gridLayout = (cap, gap)=>{
      const vw = (w && w.innerWidth) || 780, vh = (w && w.innerHeight) || 680;
      const padX = 28;
      return {vw:vw, vh:vh, padX:padX, gap:gap, cap:cap,
        perRow: Math.max(1, Math.floor((vw - padX*2 + gap) / (cap + gap))),
        rowH: Math.round(cap*1.5) + gap};
    };
    const buildRows = (apps, perRow)=>{ const rows=[]; for(let i=0;i<apps.length;i+=perRow) rows.push(apps.slice(i,i+perRow)); return rows; };
    const Loading = function(){ return e("div",{style:{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#10151d"}}, e("div",{style:{color:"#8f98a0",fontSize:18}}, L.loading)); };
    const GridView = withObs(function(props){
      const collObj = props.collection;
      let apps = null;
      try { apps = collObj ? collObj.visibleApps : null; } catch(_) { apps = null; }
      if (!apps || !apps.length) return e(Loading,null);
      const gl = gridLayout(props.cap || 150, 14);
      const rows = buildRows(apps, gl.perRow);
      const head = e("div",{style:{fontSize:22,color:"#dcdedf",padding:"24px "+gl.padX+"px 14px",fontWeight:600,flex:"0 0 auto"}}, props.title+" — "+apps.length);
      const list = RWList
        ? e(RWList,{height:Math.max(200, gl.vh-66), width:gl.vw, itemCount:rows.length, itemSize:gl.rowH, overscanCount:2,
            itemData:{rows:rows, cap:gl.cap, gap:gl.gap, padX:gl.padX}},
            function(p){ const d=p.data; return e("div",{style:Object.assign({}, p.style, {display:"flex", gap:d.gap, padding:"0 "+d.padX+"px", boxSizing:"border-box"})}, d.rows[p.index].map(ov=> e(Cap,{key:ov.appid, ov:ov, size:d.cap}))); })
        : e("div",{style:{flex:1,overflowY:"auto",padding:"0 "+gl.padX+"px"}},
            rows.map((row,i)=> e("div",{key:i, style:{display:"flex", gap:gl.gap, marginBottom:gl.gap}}, row.map(ov=> e(Cap,{key:ov.appid, ov:ov, size:gl.cap})))));
      return e("div",{style:{height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column"}}, head, list);
    });
    // last-resort app list: scrape the main window's home DOM for data-id attrs
    const scrapeAppIds = ()=>{
      try {
        const mw = aWin && aWin.oy && aWin.oy.WindowStore && aWin.oy.WindowStore.GamepadUIMainWindowInstance && aWin.oy.WindowStore.GamepadUIMainWindowInstance.m_BrowserWindow.window;
        if (!mw || !mw.document) return [];
        const ids = [];
        mw.document.querySelectorAll("[data-id]").forEach(n=>{ const v=n.getAttribute("data-id"); if (/^\d+$/.test(v) && ids.indexOf(parseInt(v))<0) { try { if (tw.GetAppOverviewByAppID(parseInt(v))) ids.push(parseInt(v)); } catch(_) {} } });
        return ids.slice(0,60);
      } catch(_) { return []; }
    };
    const DomGrid = function(props){
      const ids = scrapeAppIds();
      if (!ids.length) return e(Loading,null);
      const apps = ids.map(id=>{ try { return tw.GetAppOverviewByAppID(id); } catch(_) { return null; } }).filter(Boolean);
      return e(GridView, { collection: { visibleApps: apps }, title: props.title, cap: props.cap });
    };
    const stripBB = (s)=> s ? String(s).replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi,"").replace(/\[\/?[a-z0-9]+[^\]]*\]/gi,"").replace(/\n{3,}/g,"\n\n").trim() : "";
    const findEvent = (gid)=>{ try { const wn = window.libraryEventStore.GetWhatsNewEvents(); const all = [].concat(wn.eventsToShow||[], wn.takeoverEvents||[]); return all.find(ev=>String(ev.AnnouncementGID)===gid || String(ev.GID)===gid) || null; } catch(_) { return null; } };
    const firstEvent = ()=>{ try { const wn = window.libraryEventStore.GetWhatsNewEvents(); return ([].concat(wn.eventsToShow||[], wn.takeoverEvents||[]))[0] || null; } catch(_) { return null; } };
    const NewsView = withObs(function(props){
      const ev = findEvent(props.gid) || (!props.gid ? firstEvent() : null);
      if (!ev) return cRecent ? e(GridView,{collection:cRecent, title:L.recent}) : e(DomGrid,{title:L.recent});
      let img = null; try { img = ev.GetImageURL("capsule"); } catch(_) {}
      const ov = ev.appid ? tw.GetAppOverviewByAppID(ev.appid) : null;
      let title=""; try { title = ev.GetNameWithFallback(); } catch(_) {}
      let sub=""; try { sub = ev.GetSubTitleWithSummaryFallback()||""; } catch(_) {}
      let desc=""; try { desc = ev.GetDescriptionWithFallback(0); } catch(_) {}
      if (!desc) { try { const vals = Array.from(ev.description.values()); desc = vals[0]||""; } catch(_) {} }
      desc = stripBB(desc); sub = stripBB(sub);
      let dateStr = "";
      try { const pt = ev.postTime; const d = pt instanceof Date ? pt : new Date(pt*1000); dateStr = d.toLocaleDateString(); } catch(_) {}
      return e("div",{style:{overflowY:"auto",height:"100%",boxSizing:"border-box",padding:"0 0 40px"}},
        img ? e("img",{src:img, style:{width:"100%",maxHeight:420,objectFit:"cover",display:"block"}}) : null,
        e("div",{style:{padding:"20px 32px"}},
          ov ? e("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
                 e(Cap,{ov:ov,size:40}),
                 e("div",{style:{color:"#8f98a0",fontSize:15}}, ov.display_name+(dateStr?"  •  "+dateStr:""))) : null,
          e("div",{style:{color:"#fff",fontSize:26,fontWeight:700,marginBottom:10,lineHeight:1.25}}, title),
          sub ? e("div",{style:{color:"#c7d0d8",fontSize:17,marginBottom:14,whiteSpace:"pre-wrap"}}, sub) : null,
          desc ? e("div",{style:{color:"#acb2b8",fontSize:15,lineHeight:"1.5",whiteSpace:"pre-wrap"}}, desc) : null));
    });
    const readFocusedContent = ()=>{
      try {
        const mw = aWin && aWin.oy && aWin.oy.WindowStore && aWin.oy.WindowStore.GamepadUIMainWindowInstance && aWin.oy.WindowStore.GamepadUIMainWindowInstance.m_BrowserWindow.window;
        const doc = mw && mw.document;
        if (!doc) return null;
        const checkId = (v)=>{ if (!v || !/^\d+$/.test(v)) return null; if (findEvent(v)) return {mode:"news", gid:v}; const id = parseInt(v); if (tw.GetAppOverviewByAppID(id)) return {mode:"app", appid:id}; return null; };
        const gp = doc.querySelector(".gpfocus");
        if (gp && gp.closest) { const c = gp.closest("[data-id]"); if (c) { const r = checkId(c.getAttribute("data-id")); if (r) return r; } }
        let node = doc.activeElement;
        const ce = node && node.closest ? node.closest("[data-id]") : null;
        if (ce) { const r = checkId(ce.getAttribute("data-id")); if (r) return r; }
        for (let i=0; node && i<10; i++, node=node.parentElement) { if (node.getAttribute) { const r = checkId(node.getAttribute("data-id")); if (r) return r; } }
      } catch(_) {}
      return null;
    };
    const homeTab = ()=>{ try { const h = window.tempNavStore && window.tempNavStore.m_history; const st = h && h.location && h.location.state; return st ? String(st.HomeActiveTab_HistoryValue||"") : ""; } catch(_) { return ""; } };
    const downloadInfo = ()=>{
      try {
        const o = window.downloadsStore && window.downloadsStore.LocalDownloadOverview;
        if (!o || !o.update_state || o.update_state==="None") return null;
        let done=0, total=0, eta=-1;
        (o.progress||[]).forEach(p=>{ done+=p.bytes_in_progress||0; total+=p.bytes_total||0; if(p.estimated_time_remaining_sec>eta) eta=p.estimated_time_remaining_sec; });
        return {state:o.update_state, appid:o.update_appid||0, done:done, total:total, eta:eta, bps:o.update_network_bytes_per_second||0};
      } catch(_) { return null; }
    };
    const fmtBytes = (b)=>{ b=b||0; if(b>=1073741824) return (b/1073741824).toFixed(1)+" "+L.gb; if(b>=1048576) return (b/1048576).toFixed(0)+" "+L.mb; return Math.round(b/1024)+" "+L.kb; };
    const DownloadsView = withObs(function(){
      const [, force] = React.useState(0);
      React.useEffect(()=>{ const t=setInterval(()=>force(x=>x+1), 2000); return ()=>clearInterval(t); },[]);
      const info = downloadInfo();
      if (!info) return cRecent ? e(GridView,{collection:cRecent, title:L.recent}) : e(DomGrid,{title:L.recent});
      const ov = info.appid ? tw.GetAppOverviewByAppID(info.appid) : null;
      const pct = info.total>0 ? Math.min(100, Math.round(100*info.done/info.total)) : 0;
      let etaStr = "";
      if (info.eta>0) { const m=Math.round(info.eta/60); etaStr = m>=1 ? ("~"+m+" "+L.min) : ("~"+Math.max(1,Math.round(info.eta))+" "+L.sec); }
      return e("div",{style:{height:"100%",overflowY:"auto",boxSizing:"border-box",padding:"28px",background:"#10151d"}},
        e("div",{style:{fontSize:22,color:"#dcdedf",fontWeight:600,marginBottom:16}}, L.downloads),
        e("div",{style:{display:"flex",gap:18,alignItems:"center"}},
          ov ? e(Cap,{ov:ov,size:90}) : null,
          e("div",{style:{flex:1,minWidth:0}},
            e("div",{style:{color:"#fff",fontSize:20,fontWeight:600,marginBottom:6}}, ov?ov.display_name:("App "+info.appid)),
            e("div",{style:{color:"#8f98a0",fontSize:14,marginBottom:8}},
              info.state+(info.bps>0?("  •  "+fmtBytes(info.bps)+L.bps):"")+(etaStr?("  •  "+etaStr):"")),
            e("div",{style:{height:8,borderRadius:4,background:"#2a3542"}},
              e("div",{style:{height:"100%",width:pct+"%",borderRadius:4,background:"#1a9fff",transition:"width .5s"}})),
            e("div",{style:{color:"#c7d0d8",fontSize:13,marginTop:6}}, pct+"%  —  "+fmtBytes(info.done)+" / "+fmtBytes(info.total)))));
    });
    const collectionsReady = ()=>{ try { const c = cMyGames || cRecent; if (c) { void c.visibleApps.length; return true; } } catch(_) {} return false; };
    const pick = ()=>{
      if (!collectionsReady()) {
        // without collections the DOM scrape still works — don't stay in loading
        if (!scrapeAppIds().length) return {mode:"loading"};
      }
      const run = (window.SteamUIStore && window.SteamUIStore.m_runningAppIDs) || [];
      if (run.length) {
        const rid = typeof run[0]==="object" ? run[0].appid : run[0];
        if (rid && tw.GetAppOverviewByAppID(rid)) return {mode:"app", appid:rid, running:true};
      }
      const f = readFocusedContent();
      if (f) return f;
      const pn = (window.tempNavStore && window.tempNavStore.m_locationPathname) || "";
      const m = pn.match(/^\/library\/app\/(\d+)/);
      if (m) return {mode:"app", appid:parseInt(m[1])};
      if (downloadInfo()) return {mode:"downloads"};
      if (pn==="/library/home") {
        if (homeTab()==="WhatsNew") return {mode:"news"};
        return {mode:"recent"};
      }
      return {mode:"library"};
    };
    const qamView = ()=>{
      if (!fullTree) return null;
      try {
        const instance = aWin.oy.WindowStore.GamepadUIMainWindowInstance;
        const li = Object.create(instance);
        li.SetStoreBrowserGlass = ()=>{};
        if (MenuStoreClass) { try { Object.defineProperty(li, "MenuStore", {value: new MenuStoreClass(li), enumerable: true}); li.MenuStore.Init(); } catch(_) {} }
        const navigator_ = window.tempNavStore && window.tempNavStore.GetNavigator();
        const useIface = () => window.cm;
        const useStorage = () => prov.bs(React.useCallback(()=>new prov.StoreA(),[]));
        const acctVal = {useActiveAccount: () => { try { return (window.cm && window.cm.m_steamid) ? window.cm.m_steamid.ConvertTo64BitString() : "0"; } catch(_) { return "0"; } }};
        return e(prov.app.RT, null,
          e(prov.nav.VQ, {controller: aWin.oy.NavigationManager},
            e(prov.cfg.ss, {IN_GAMEPADUI: true, IN_DESKTOPUI: false, IN_VR: false},
              e(prov.pop.kc, {ownerWindow: w},
                e(prov.inst.ER, {instance: li},
                  e(prov.st.VQ, {useActiveSteamInterface: useIface, useActiveCMInterface: useIface, useStorage: useStorage},
                    e(prov.acct.Rh, {value: acctVal},
                      e(prov.qc.s, {debug: false, steamUI: true},
                        e(prov.navCtx.O0, {value: navigator_},
                          e(prov.b5m.b5, {ownerWindow: w},
                            e(QAMmod.pZ, {active:true})))))))))));
      } catch(err) { window.__errs.push("qam:"+String(err&&err.stack||err).slice(0,200)); return null; }
    };
    const CtxView = function(){
      const [ctx, setCtx] = React.useState(pick);
      React.useEffect(()=>{
        if (window.__seatATimer) clearTimeout(window.__seatATimer);
        const lastRef = {current: null};
        let alive = true, delay = 1000;
        const tick = ()=>{
          if (!alive) return;
          let c = pick();
          if (c.mode==="app" && c.running) {
            const content = (window.__seatACfg && window.__seatACfg.content) || "card";
            if ((content==="qam" || content==="pause") && fullTree) c = {mode: content};
          }
          fetchSeatCfg();
          const l = lastRef.current;
          const same = l && l.mode===c.mode && l.appid===c.appid && l.gid===c.gid;
          lastRef.current = c;
          if (!same) setCtx(c);
          delay = same ? Math.min(3000, Math.round(delay*1.5)) : 1000;
          window.__seatATimer = setTimeout(tick, delay);
        };
        window.__seatATimer = setTimeout(tick, delay);
        return ()=>{ alive = false; clearTimeout(window.__seatATimer); window.__seatATimer = null; };
      },[]);
      if (ctx.mode==="qam" || ctx.mode==="pause") {
        const q = qamView();
        if (q) return e(SeatBoundary, {fallback: e(DomGrid,{title:L.mygames})}, q);
      }
      if (ctx.mode==="loading") return e(Loading,null);
      if (ctx.mode==="app") return e(CompanionView,{appid:ctx.appid, key:ctx.appid});
      if (ctx.mode==="news") return e(NewsView,{gid:ctx.gid, key:ctx.gid});
      if (ctx.mode==="downloads") return e(DownloadsView,null);
      if (ctx.mode==="recent") return cRecent ? e(GridView,{collection:cRecent, title:L.recent, cap:150}) : e(DomGrid,{title:L.recent});
      return cMyGames ? e(GridView,{collection:cMyGames, title:L.mygames, cap:150}) : e(DomGrid,{title:L.mygames});
    };
    // --- mount ---
    try { const p = tryReq(54644); if (p && p.Oe) p.Oe(w, p.yU()); } catch(_) {}
    try { window.__seatBRoot.unmount(); } catch(_) {}
    const doc = w.document;
    let host = doc.getElementById("popup_target");
    if (host) host.remove();
    host = doc.createElement("div"); host.id = "popup_target";
    host.style.cssText = "position:fixed;inset:0;width:100%;height:100%;overflow:hidden;";
    doc.body.appendChild(host);
    if (!ReactDOM) return "THROW: react-dom createRoot not found";
    const root = ReactDOM.createRoot(host);
    window.__seatBRoot = root;
    root.render(e(CtxView, null));
    await new Promise(r=>setTimeout(r,4500));
    const t = (doc.body && doc.body.innerText || "").slice(0,250);
    const c = pick();
    const deps = {obs:!!obs, RWList:!!RWList, FZ:!!FZ, fullTree:!!fullTree, cMyGames:!!cMyGames, cRecent:!!cRecent, ReactDOM:!!ReactDOM};
    return "mode="+c.mode+" appid="+(c.appid||"")+" gid="+(c.gid||"")+" divs="+doc.querySelectorAll("div").length+" imgs="+doc.images.length+" deps="+JSON.stringify(deps)+" errs="+JSON.stringify(window.__errs.map(x=>x.slice(0,120)))+" text="+JSON.stringify(t);
  } catch(err) { return "THROW: "+(err && err.stack || err); }
})()
