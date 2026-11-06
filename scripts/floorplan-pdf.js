// Builds floor-plan.pdf (a writable floor plan for taking measurements) with Playwright.
// Usage: node scripts/floorplan-pdf.js   (run from the repo root)
const { chromium } = require('playwright');
const path = require('path');

// Same tracing as the app's PLAN (≈16 units per foot, approximate).
const ROOMS = [
  {k:"deck", name:"Back deck", size:"18′7″ × 20′6″", d:"M8 10H307V175H315V340H257V175H8Z", box:[8,10,299,165]},
  {k:"shed", name:"Storage shed", size:"not to scale", d:"M352 40H500V150H352Z", box:[352,40,148,110], dashed:true},
  {k:"sun", name:"Sunroom", size:"14′11″ × 17′8″", d:"M12 178H255V465H157V410H12Z", box:[12,178,243,232]},
  {k:"pbath", name:"Primary bath", size:"7′7″ wide", d:"M12 410H157V465H125V545H12Z", box:[12,410,113,135], small:true},
  {k:"laundry", name:"Laundry", size:"7′10″ wide", d:"M125 465H255V545H125Z", box:[125,465,130,80], small:true},
  {k:"kitchen", name:"Kitchen", size:"15′1″ × 10′0″", d:"M255 465H503V633H255Z", box:[255,465,248,168]},
  {k:"pantry", name:"Pantry", d:"M232 545H255V633H232Z", box:[232,545,23,88], tiny:true},
  {k:"pbed", name:"Primary bedroom", size:"13′4″ × 13′8″", d:"M12 545H232V768H12Z", box:[12,545,220,223]},
  {k:"pcloset", name:"Closet", d:"M232 633H255V768H232Z", box:[232,633,23,135], tiny:true},
  {k:"dining", name:"Dining room", size:"15′1″ × 13′4″", d:"M255 633H503V852H255Z", box:[255,633,248,219]},
  {k:"hbath", name:"Hall bath", size:"8′0″ · tub", d:"M12 768H145V852H12Z", box:[12,768,133,84], small:true},
  {k:"hall", name:"Hall", d:"M145 768H255V852H145Z", box:[145,768,110,84], small:true},
  {k:"bed2", name:"Bedroom 2", size:"13′0″ × 13′5″", d:"M12 852H225V1072H12Z", box:[12,852,213,220]},
  {k:"b2closet", name:"Closets / fireplace", d:"M225 852H255V1072H225Z", box:[225,852,30,220], tiny:true},
  {k:"living", name:"Living room", size:"≈13′ × 13′5″", d:"M255 852H503V1072H255Z", box:[255,852,248,220]},
  {k:"porch", name:"Front porch", size:"19′8″ × 7′5″", d:"M83 1075H399V1195H83Z", box:[83,1075,316,120]},
];

// u = SVG units per typographic point on this page; write = add "____ × ____" lines.
function svg(keys, vb, u, write){
  const pt = n => (n*u).toFixed(1);
  const parts = ROOMS.filter(r=>keys.includes(r.k)).map(r=>{
    const [x,y,w,h]=r.box, cx=x+w/2;
    let t = `<path d="${r.d}" class="${r.dashed?'dash':''}"/>`;
    if (r.tiny) {
      // vertical label for narrow closets
      const cy=y+h/2;
      t += `<text x="${cx}" y="${cy}" transform="rotate(-90 ${cx} ${cy})" font-size="${pt(write?7:5)}" class="hint" dominant-baseline="middle">${r.name}</text>`;
      return t;
    }
    const nameSize = r.small ? (write?11:7.5) : (write?14:9.5);
    const top = y + (write ? 16*u : (r.small? 13*u : h/2 - 4*u));
    t += `<text x="${cx}" y="${top}" font-size="${pt(nameSize)}" class="name">${r.name}</text>`;
    if (r.size) t += `<text x="${cx}" y="${top + (write?13:9)*u}" font-size="${pt(write?9:6.5)}" class="hint">listing: ${r.size}</text>`;
    if (write) {
      const lw = Math.min(w-10*u, 150*u);
      const lines = r.small ? 1 : 2;
      for (let i=0;i<lines;i++){
        const ly = top + (30 + i*26)*u;
        if (ly > y+h-6*u) break;
        t += `<line x1="${cx-lw/2}" y1="${ly}" x2="${cx+lw/2}" y2="${ly}" class="wline"/>`;
      }
      if (!r.small && r.k!=='shed') t += `<text x="${cx}" y="${top + 30*u - 3*u}" font-size="${pt(7)}" class="hint">W × L</text>`;
    }
    return t;
  }).join('');
  const entry = keys.includes('porch') ? `<path d="M241 1203 l-9 -12 h18 z" class="entry"/><text x="262" y="1201" font-size="${pt(write?8:6)}" class="hint" style="text-anchor:start">front door</text>` : '';
  return `<svg viewBox="${vb.join(' ')}" xmlns="http://www.w3.org/2000/svg" style="--sw:${(1.6*u).toFixed(2)}">${parts}${entry}</svg>`;
}

const css = `
@page{size:letter;margin:0.45in}
*{box-sizing:border-box}
body{margin:0;font-family:"DejaVu Sans","Helvetica",Arial,sans-serif;color:#000}
.page{height:10.1in;display:flex;flex-direction:column;gap:0.12in;page-break-after:always;overflow:hidden}
.page:last-child{page-break-after:auto}
header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #000;padding-bottom:4px}
h1{font-size:18pt;margin:0}
header span{font-size:10pt;color:#333}
.sub{font-size:9.5pt;color:#333;margin:0}
.body{flex:1;display:flex;gap:0.3in;min-height:0}
.plan{flex:1;min-height:0;display:flex;justify-content:center}
svg{height:100%;width:100%}
svg path{fill:#fff;stroke:#000;stroke-width:var(--sw);stroke-linejoin:round}
svg path.dash{stroke-dasharray:6 5}
svg path.entry{fill:#000;stroke:none}
svg text{text-anchor:middle;fill:#000}
svg text.name{font-weight:700}
svg text.hint{fill:#444}
svg line.wline{stroke:#666;stroke-width:calc(var(--sw)*0.45)}
.side{width:2.9in;display:flex;flex-direction:column;gap:6px;font-size:10pt}
.side h2{font-size:11pt;margin:4px 0 2px;border-bottom:1px solid #000}
.item{display:flex;gap:6px;align-items:flex-end}
.item b{font-weight:600;white-space:nowrap}
.item i{flex:1;border-bottom:1px solid #666;height:1.15em}
.box{width:11px;height:11px;border:1.4px solid #000;flex:none;margin-bottom:2px}
.notes{flex:1;display:flex;flex-direction:column}.notes i{display:block;height:0.36in;border-bottom:1px solid #888;flex:none}
`;

const side = `<div class="side">
  <h2>Must measure</h2>
  <div class="item"><span class="box"></span><b>Fridge nook W</b><i></i></div>
  <div class="item"><span class="box"></span><b>Fridge nook H</b><i></i></div>
  <div class="item"><span class="box"></span><b>Fridge nook D</b><i></i></div>
  <div class="item"><span class="box"></span><b>Water line for ice maker?</b><i></i></div>
  <div class="item"><span class="box"></span><b>Laundry nook W</b><i></i></div>
  <div class="item"><span class="box"></span><b>Laundry nook D</b><i></i></div>
  <div class="item"><span class="box"></span><b>Dryer: gas / 240V, 3- or 4-prong</b><i></i></div>
  <div class="item"><span class="box"></span><b>Narrowest door/hall</b><i></i></div>
  <div class="item"><span class="box"></span><b>Ceiling height</b><i></i></div>
  <div class="item"><span class="box"></span><b>HVAC filter size</b><i></i></div>
  <div class="item"><span class="box"></span><b>TV wall (living)</b><i></i></div>
  <h2>Windows (for curtains)</h2>
  <div class="item"><b>Living</b><i></i></div>
  <div class="item"><b>Bedroom 2</b><i></i></div>
  <div class="item"><b>Sunroom</b><i></i></div>
  <h2>Notes</h2>
  <div class="notes">${"<i></i>".repeat(14)}</div>
</div>`;

const head = (t, s) => `<header><h1>2414 19th Ave — ${t}</h1><span>${s}</span></header>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<section class="page">${head('Floor plan','1 of 3 · whole house')}
  <p class="sub">Traced from the listing's Zillow floor plan, so shapes and sizes are approximate. Front door at the bottom. Pages 2–3 are larger, with room to write.</p>
  <div class="body"><div class="plan">${svg(ROOMS.map(r=>r.k),[0,0,515,1212],1.85,false)}</div>${side}</div>
</section>
<section class="page">${head('Back of house','2 of 3')}
  <p class="sub">Deck, sunroom, primary bath, laundry. Write width × length on the lines.</p>
  <div class="body"><div class="plan">${svg(['deck','shed','sun','pbath','laundry'],[0,0,515,552],0.95,true)}</div></div>
</section>
<section class="page">${head('Front of house','3 of 3')}
  <p class="sub">Kitchen, bedrooms, dining, living, hall bath, front porch. Write width × length on the lines.</p>
  <div class="body"><div class="plan">${svg(['kitchen','pantry','pbed','pcloset','dining','hbath','hall','bed2','b2closet','living','porch'],[0,458,515,754],1.13,true)}</div></div>
</section>
</body></html>`;

(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(html, {waitUntil:'load'});
  const out = path.resolve('floor-plan.pdf');
  await p.pdf({path: out, format:'Letter', printBackground:true, margin:{top:'0.45in',bottom:'0.45in',left:'0.45in',right:'0.45in'}});
  if (process.argv[2]) { await p.setViewportSize({width:816,height:1056}); await p.screenshot({path:process.argv[2], fullPage:true}); }
  await b.close(); console.log('Wrote', out);
})();
