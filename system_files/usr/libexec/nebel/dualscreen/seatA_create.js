(async()=>{
  const existing = window.__seatB;
  if (existing && !existing.closed) { try { existing.close(); } catch(_) {} await new Promise(r=>setTimeout(r,700)); }
  const w = window.open("about:blank?createflags=0", "nebel_seatB", "width=1920,height=1080,left=0,top=0,resizeable,status=0,toolbar=0,menubar=0,location=0");
  if (!w) return "blocked";
  window.__seatB = w;
  w.document.open();
  w.document.write("<!DOCTYPE html><html><head><title>NebelSeatB</title></head><body style='margin:0;background:#0e141b'></body></html>");
  w.document.close();
  return JSON.stringify({ok: true, title: w.document.title});
})()
