(async()=>{
  try {
    let req; if (!window.__req) webpackChunksteamui.push([[700000+Math.floor(Math.random()*99999)],{},(r)=>{window.__req=r}]); req = window.__req;
    const React = req(63696);
    const a = req(61236), nav = req(35560), b5m = req(3524), cfg = req(72476), inst = req(96680), app = req(3375), qc = req(21371), pop = req(11131), st = req(46382), rr = req(49519);
    const obs = req(41230).PA;
    const tw = req(1776).tw, pH = req(78057).H, mO = req(96538).O, ARi = req(74827).Ri;
    const Xd = req(40478), Ju = req(46936), navCtx = req(79112), bs = req(51115).bs, StoreA = req(73870).A, acct = req(24295), QAM = req(79476);
    const coll = req(96000), loc = req(46108), F = req(69164);
    const Ez = req(5822).Ez, MenuStoreClass = req(5822).QG;
    const AS = window.appStore;
    const w = window.__seatB;
    if (!w || w.closed) return "popup gone";
    window.__errs = [];
    if (!window.__errHooked) {
      window.__errHooked = true;
      const oe = console.error;
      console.error = function(...args){ try{ window.__errs.push(args.map(x=>String(x && x.stack || x)).join(" ").slice(0,1500)); }catch(_){}; return oe.apply(this,args); };
    }
    const e = React.createElement;
    // --- i18n: follow Steam UI language (SharedJSContext has no token table, so keep our own map) ---
    let __steamlang = "english";
    try { __steamlang = String(await SteamClient.Settings.GetCurrentLanguage() || "english").toLowerCase(); } catch(_) {}
    const L_ALL = {
      russian:   {playtime:"Наиграно", lastplayed:"Последний запуск", achievements:"Достижения", compat:"Совместимость", launchopts:"Параметры запуска", defcompat:"по умолчанию", dev:"Разработчик", pub:"Издатель", downloads:"Загрузки", mygames:"Мои игры", recent:"Продолжить играть", min:"мин", hr:"ч", gb:"ГБ", mb:"МБ", kb:"КБ", sec:"с", bps:"/с", loading:"Загрузка…"},
      ukrainian: {playtime:"Награно", lastplayed:"Останній запуск", achievements:"Досягнення", compat:"Сумісність", launchopts:"Параметри запуску", defcompat:"типово", dev:"Розробник", pub:"Видавець", downloads:"Завантаження", mygames:"Мої ігри", recent:"Продовжити гру", min:"хв", hr:"год", gb:"ГБ", mb:"МБ", kb:"КБ", sec:"с", bps:"/с", loading:"Завантаження…"},
      english:   {playtime:"Playtime", lastplayed:"Last played", achievements:"Achievements", compat:"Compatibility", launchopts:"Launch options", defcompat:"Default", dev:"Developer", pub:"Publisher", downloads:"Downloads", mygames:"My Games", recent:"Continue Playing", min:"min", hr:"h", gb:"GB", mb:"MB", kb:"KB", sec:"s", bps:"/s", loading:"Loading…"}
    };
    const L = L_ALL[__steamlang] || L_ALL.english;
    const steamid = (window.cm && window.cm.m_steamid) ? window.cm.m_steamid.ConvertTo64BitString() : "0";
    // --- local window-instance shim: own MenuStore so our QAM never syncs with the main window QAM ---
    const li = Object.create(a.oy.WindowStore.GamepadUIMainWindowInstance);
    li.SetStoreBrowserGlass = ()=>{};
    Object.defineProperty(li, "MenuStore", {value: new MenuStoreClass(li), enumerable: true});
    try { li.MenuStore.Init(); } catch(_) {}
    const localInst = window.__seatALocalInst = li;
    // --- real steamui AppDetails page for one appid ---
    const AppDetailsFor = obs(function(props){
      const appid = props.appid;
      React.useEffect(()=>{
        const h = pH.RegisterForAppData(appid);
        mO.FetchDataForApp(appid);
        ARi.EnterAppDetailsPage(appid);
        return ()=>{ ARi.ExitAppDetailsPage(appid); try{h && h.unregister();}catch(_){} };
      }, [appid]);
      const overview = tw.GetAppOverviewByAppID(appid);
      const details = pH.GetAppDetails(appid);
      if (!overview || !details) return e("div",{style:{color:"#fff",padding:40}},"Loading app "+appid+"…");
      return e(rr.fS, {initialEntries:["/library/app/"+appid]},
        e(Xd.kg,{overview:overview, details:details, LaunchingDetails: Ju.rp}));
    });
    // --- companion panel for one appid: native components, no webview ---
    const isSteamApp = (ov)=> ov && ov.app_type===1;
    const fmtPlaytime = (min)=>{
      min = Math.round(min||0);
      if (min<=0) return null;
      if (min<60) return min+" "+L.min;
      const h = min/60;
      return (h>=100 ? String(Math.round(h)) : h.toFixed(1).replace(/\.0$/,""))+" "+L.hr;
    };
    const fmtDate = (ts)=>{
      if (!ts) return null;
      try { return new Date(ts*1000).toLocaleDateString(); } catch(_) { return null; }
    };
    const HeroImg = function(props){
      const [idx, setIdx] = React.useState(0);
      const [loaded, setLoaded] = React.useState(false);
      const url = props.urls[idx];
      if (!url) return null;
      return e("img",{src:url, onError:()=>setIdx(i=>i+1), onLoad:()=>setLoaded(true),
        style:{width:"100%",height:"100%",objectFit:"cover",display:"block",opacity:loaded?1:0,transition:"opacity .3s"}});
    };
    const CompanionView = obs(function(props){
      const appid = props.appid;
      const ov = tw.GetAppOverviewByAppID(appid);
      const details = pH.GetAppDetails(appid);
      const steam = isSteamApp(ov);
      const [retry, setRetry] = React.useState(0);
      React.useEffect(()=>{
        const h = pH.RegisterForAppData(appid);
        try { mO.FetchDataForApp(appid); } catch(_) {}
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
      // hero fallback chain: custom art -> library hero -> store header -> details header -> capsule chain
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
      // compatibility info from already-fetched app details (no extra requests)
      let compat = null;
      if (steam && details) {
        const disp = details ? (details.strCompatToolDisplayName||"") : "";
        const tool = details ? (details.strCompatToolName||"") : "";
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
    // --- capsule image with fallback chain (custom images -> store capsule -> portrait -> icon -> name) ---
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
      return e(F.Z, {
        focusable: true,
        onActivate: ()=>{ try { const n = window.tempNavStore.GetNavigator(); n && n.App(ov.appid, {}); } catch(_){} },
        onFocus: ()=>setFocused(true), onBlur: ()=>setFocused(false),
        style: {width:sz, height:Math.round(sz*1.5), borderRadius:4, overflow:"hidden", flex:"0 0 auto", background:"#1a222e",
                outline: focused?"2px solid #fff":"none", transform: focused?"scale(1.05)":"none", transition:"transform .12s",
                display:"flex", alignItems:"center", justifyContent:"center"},
      }, url ? e("img",{src:url, loading:"lazy", decoding:"async", onError:()=>setIdx(i=>i+1), style:{width:"100%",height:"100%",objectFit:"cover"}})
             : e("div",{style:{color:"#fff",padding:8,fontSize:12,textAlign:"center"}}, ov.display_name));
    });
    // --- stable row renderer for virtualized grids (never remounts on parent re-render; data via itemData) ---
    const GridRow = function(p){
      const d = p.data, row = d.rows[p.index];
      return e("div",{style:Object.assign({}, p.style, {display:"flex", gap:d.gap, padding:"0 "+d.padX+"px", boxSizing:"border-box"})},
        row.map(ov=> e(Cap,{key:ov.appid, ov:ov, size:d.cap})));
    };
    const gridLayout = (cap, gap)=>{
      const vw = (w && w.innerWidth) || 780, vh = (w && w.innerHeight) || 680;
      const padX = 28;
      return {vw:vw, vh:vh, padX:padX, gap:gap, cap:cap,
        perRow: Math.max(1, Math.floor((vw - padX*2 + gap) / (cap + gap))),
        rowH: Math.round(cap*1.5) + gap};
    };
    const buildRows = (apps, perRow)=>{
      const rows = [];
      for (let i=0; i<apps.length; i+=perRow) rows.push(apps.slice(i, i+perRow));
      return rows;
    };
    // --- neutral startup placeholder (shown while collectionStore is not ready yet) ---
    const Loading = function(){
      return e("div",{style:{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#10151d"}},
        e("div",{style:{color:"#8f98a0",fontSize:18}}, L.loading));
    };
    // --- full library grid (My Games collection), virtualized rows: react-window FixedSizeList (module 97329) ---
    const RWList = req(97329).Y1;
    const LibraryGrid = obs(function(){
      let apps = null;
      try {
        const c = coll.md.GetCollection(coll.A8.MyGames);
        apps = c ? c.visibleApps : null;
      } catch(_) { apps = null; }
      if (!apps || !apps.length) return e(Loading,null);
      let title = null;
      try { title = loc.we("#GameList_View_MyGames"); } catch(_) {}
      if (!title || title[0]==="#") title = L.mygames;
      const gl = gridLayout(160, 14);
      const rows = buildRows(apps, gl.perRow);
      const itemData = {rows:rows, cap:gl.cap, gap:gl.gap, padX:gl.padX};
      return e("div",{style:{height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column"}},
        e("div",{style:{fontSize:22,color:"#dcdedf",padding:"24px "+gl.padX+"px 14px",fontWeight:600,flex:"0 0 auto"}}, title+" — "+apps.length),
        e(RWList,{height:Math.max(200, gl.vh-66), width:gl.vw, itemCount:rows.length, itemSize:gl.rowH, overscanCount:2, itemData:itemData}, GridRow));
    });
    // --- news/event view (What's New) ---
    const stripBB = (s)=> s ? String(s).replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi,"").replace(/\[\/?[a-z0-9]+[^\]]*\]/gi,"").replace(/\n{3,}/g,"\n\n").trim() : "";
    const findEvent = (gid)=>{
      try {
        const wn = window.libraryEventStore.GetWhatsNewEvents();
        const all = [].concat(wn.eventsToShow||[], wn.takeoverEvents||[]);
        return all.find(ev=>String(ev.AnnouncementGID)===gid || String(ev.GID)===gid) || null;
      } catch(_) { return null; }
    };
    const firstEvent = ()=>{
      try {
        const wn = window.libraryEventStore.GetWhatsNewEvents();
        const all = [].concat(wn.eventsToShow||[], wn.takeoverEvents||[]);
        return all[0] || null;
      } catch(_) { return null; }
    };
    const NewsView = obs(function(props){
      const ev = findEvent(props.gid) || (!props.gid ? firstEvent() : null);
      if (!ev) return e(LibraryGrid,null);
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
          desc ? e("div",{style:{color:"#acb2b8",fontSize:15,lineHeight:1.5,whiteSpace:"pre-wrap"}}, desc) : null));
    });
    // --- live focus reader: gamepad focus (.gpfocus) is authoritative; DOM activeElement may not follow on all pages ---
    const readFocusedContent = ()=>{
      try {
        const mw = a.oy.WindowStore.GamepadUIMainWindowInstance.m_BrowserWindow.window;
        const doc = mw.document;
        const checkId = (v)=>{
          if (!v || !/^\d+$/.test(v)) return null;
          if (findEvent(v)) return {mode:"news", gid:v};
          const id = parseInt(v);
          if (tw.GetAppOverviewByAppID(id)) return {mode:"app", appid:id};
          return null;
        };
        const gp = doc.querySelector(".gpfocus");
        if (gp && gp.closest) {
          const c = gp.closest("[data-id]");
          if (c) { const r = checkId(c.getAttribute("data-id")); if (r) return r; }
        }
        let node = doc.activeElement;
        const ce = node && node.closest ? node.closest("[data-id]") : null;
        if (ce) { const r = checkId(ce.getAttribute("data-id")); if (r) return r; }
        for (let i=0; node && i<10; i++, node=node.parentElement) {
          if (node.getAttribute) {
            const r = checkId(node.getAttribute("data-id"));
            if (r) return r;
          }
        }
      } catch(_) {}
      return null;
    };
    // --- home tab (WhatsNew / Recent Games / ...) from library router history state ---
    const homeTab = ()=>{
      try {
        const h = window.tempNavStore && window.tempNavStore.m_history;
        const st = h && h.location && h.location.state;
        return st ? String(st.HomeActiveTab_HistoryValue||"") : "";
      } catch(_) { return ""; }
    };
    // --- active download info (null when nothing is downloading) ---
    const downloadInfo = ()=>{
      try {
        const o = window.downloadsStore && window.downloadsStore.LocalDownloadOverview;
        if (!o || !o.update_state || o.update_state==="None") return null;
        let done=0, total=0, eta=-1;
        (o.progress||[]).forEach(p=>{ done+=p.bytes_in_progress||0; total+=p.bytes_total||0; if (p.estimated_time_remaining_sec>eta) eta=p.estimated_time_remaining_sec; });
        return {state:o.update_state, appid:o.update_appid||0, done:done, total:total, eta:eta, bps:o.update_network_bytes_per_second||0};
      } catch(_) { return null; }
    };
    const fmtBytes = (b)=>{
      b = b||0;
      if (b>=1073741824) return (b/1073741824).toFixed(1)+" "+L.gb;
      if (b>=1048576) return (b/1048576).toFixed(0)+" "+L.mb;
      return Math.round(b/1024)+" "+L.kb;
    };
    // --- downloads panel: progress of the active download ---
    const DownloadsView = obs(function(){
      const [, force] = React.useState(0);
      React.useEffect(()=>{ const t=setInterval(()=>force(x=>x+1), 2000); return ()=>clearInterval(t); },[]);
      const info = downloadInfo();
      if (!info) return e(LibraryGrid,null);
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
    // --- "continue playing": recent games with big capsules (home default) ---
    const RecentView = obs(function(){
      let apps = null;
      try {
        const c = coll.md.GetCollection(coll.A8.Recent);
        apps = c ? c.visibleApps : null;
      } catch(_) { apps = null; }
      if (!apps) return e(Loading,null);
      if (!apps.length) return e(LibraryGrid,null);
      const gl = gridLayout(150, 14);
      const rows = buildRows(apps, gl.perRow);
      const itemData = {rows:rows, cap:gl.cap, gap:gl.gap, padX:gl.padX};
      return e("div",{style:{height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column"}},
        e("div",{style:{fontSize:22,color:"#dcdedf",padding:"24px "+gl.padX+"px 14px",fontWeight:600,flex:"0 0 auto"}}, L.recent+" — "+apps.length),
        e(RWList,{height:Math.max(200, gl.vh-66), width:gl.vw, itemCount:rows.length, itemSize:gl.rowH, overscanCount:2, itemData:itemData}, GridRow));
    });
    // --- context picker ---
    const collectionsReady = ()=>{
      try {
        const c = coll.md.GetCollection(coll.A8.MyGames);
        if (c) { void c.visibleApps.length; }
        return true;
      } catch(_) { return false; }
    };
    const pick = ()=>{
      if (!collectionsReady()) return {mode:"loading"};
      const run = (window.SteamUIStore && window.SteamUIStore.m_runningAppIDs) || [];
      if (run.length) {
        const rid = typeof run[0]==="object" ? run[0].appid : run[0];
        if (rid && tw.GetAppOverviewByAppID(rid)) return {mode:"app", appid:rid};
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
    const CtxView = function(){
      const [ctx, setCtx] = React.useState(pick);
      React.useEffect(()=>{
        if (window.__seatATimer) clearTimeout(window.__seatATimer);
        const lastRef = {current: null};
        let alive = true, delay = 1000;
        const tick = ()=>{
          if (!alive) return;
          const c = pick();
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
      if (ctx.mode==="qam") return e(inst.ER, {instance: localInst}, e(QAM.pZ, {active:true}));
      if (ctx.mode==="loading") return e(Loading,null);
      if (ctx.mode==="app") return e(CompanionView,{appid:ctx.appid, key:ctx.appid});
      if (ctx.mode==="news") return e(NewsView,{gid:ctx.gid, key:ctx.gid});
      if (ctx.mode==="downloads") return e(DownloadsView,null);
      if (ctx.mode==="recent") return e(RecentView,null);
      return e(LibraryGrid,null);
    };
    // --- window + root ---
    try { const p = req(54644); p.Oe(w, p.yU()); } catch(_) {}
    try { window.__seatBRoot.unmount(); } catch(_) {}
    const doc = w.document;
    let host = doc.getElementById("popup_target");
    if (host) host.remove();
    host = doc.createElement("div"); host.id = "popup_target";
    host.style.cssText = "position:fixed;inset:0;width:100%;height:100%;overflow:hidden;";
    doc.body.appendChild(host);
    const root = req(98131).createRoot(host);
    window.__seatBRoot = root;
    const instance = a.oy.WindowStore.GamepadUIMainWindowInstance;
    const navigator_ = window.tempNavStore && window.tempNavStore.GetNavigator();
    const useIface = () => window.cm;
    const useStorage = () => bs(React.useCallback(()=>new StoreA(),[]));
    const acctVal = {useActiveAccount: () => steamid};
    const tree = e(app.RT, null,
      e(nav.VQ, {controller: a.oy.NavigationManager},
        e(cfg.ss, {IN_GAMEPADUI: true, IN_DESKTOPUI: false, IN_VR: false},
          e(pop.kc, {ownerWindow: w},
            e(inst.ER, {instance: instance},
              e(st.VQ, {useActiveSteamInterface: useIface, useActiveCMInterface: useIface, useStorage: useStorage},
                e(acct.Rh, {value: acctVal},
                  e(qc.s, {debug: false, steamUI: true},
                    e(navCtx.O0, {value: navigator_},
                      e(b5m.b5, {ownerWindow: w},
                        e(CtxView, null)))))))))));
    root.render(tree);
    await new Promise(r=>setTimeout(r,4500));
    const t = (doc.body && doc.body.innerText || "").slice(0,250);
    const c = pick();
    return "mode="+c.mode+" appid="+(c.appid||"")+" gid="+(c.gid||"")+" divs="+doc.querySelectorAll("div").length+" imgs="+doc.images.length+" errs="+JSON.stringify(window.__errs.map(x=>x.slice(0,150)))+" text="+JSON.stringify(t);
  } catch(err) { return "THROW: "+(err && err.stack || err); }
})()
