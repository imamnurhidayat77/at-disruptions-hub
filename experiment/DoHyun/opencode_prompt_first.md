This project is a zero-dependency Node.js (18+) prototype called "Disruption Hub" for Auckland Transport bus disruption management (INFOSYS 704 A3). Create a new project containing EXACTLY the files below (same paths and contents), install nothing extra, then run `node server.js` and confirm http://localhost:3000 loads. Do not add a database or a framework. Keep any SAP API key server-side in .env only (never in public/). After creating the files, tell me whether the app runs and fix any errors without changing behaviour.


=== FILE: package.json ===
```json
{
  "name": "disruption-hub",
  "version": "0.1.0",
  "description": "INFOSYS 704 A3 prototype - Auckland Transport Disruption Hub (SAP EHS Incident + optional Purchase Order)",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "engines": { "node": ">=18" }
}

```

=== FILE: .env.example ===
```
# Copy to .env and fill in. NEVER commit .env or paste the key into chat/code.
PORT=3000

# EHS Incident source: mock | sandbox
EHS_MODE=mock
# Optional Purchase Order (replacement-bus order) source: off | mock | sandbox
PO_MODE=mock

# API key from SAP Business Accelerator Hub (Show API Key). Server-side only.
SAP_API_KEY=
SAP_SANDBOX_BASE=https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap

```

=== FILE: .gitignore ===
```
.env
.sap-cred.json
node_modules
data/db.json

```

=== FILE: server.js ===
```js
// Disruption Hub - zero-dependency Node server (Node >= 18).
// UI -> /api/* -> (SAP adapters: EHS incident, optional PO) + app store (data/db.json)
const http = require('http');
const fs = require('fs');
const path = require('path');
const ehs = require('./adapters/ehs');
const po = require('./adapters/po');

// ---- config (.env, server-side only) ----
function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#') && env[m[1]] === undefined) env[m[1]] = m[2];
    }
  } catch (_) { /* no .env: defaults below */ }
  return {
    PORT: Number(env.PORT || 3000),
    EHS_MODE: env.EHS_MODE || 'mock',
    PO_MODE: env.PO_MODE || 'mock',
    SAP_API_KEY: env.SAP_API_KEY || '',
    SAP_SANDBOX_BASE: env.SAP_SANDBOX_BASE || 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap'
  };
}
const cfg = loadEnv();

// ---- app store (JSON file) ----
const DB = path.join(__dirname, 'data', 'db.json');
const MIN = 60000;
function seed() {
  const now = Date.now();
  const types = ['breakdown', 'accident', 'road works', 'weather', 'breakdown', 'blockage', 'accident', 'breakdown', 'road works', 'weather', 'breakdown', 'accident'];
  const routes = ['70', 'NX1', '25B', 'INN', '82', '18', '27', 'CTY', '70', 'NX1', '25B', '82'];
  const depots = ['Birkenhead', 'Otahuhu', 'Mt Albert', 'Howick', 'Takapuna', 'Papakura'];
  const items = types.map((t, i) => {
    const day = 13 - i; // oldest first, notice time trends down
    const received = now - day * 86400000 + (8 + i) * 3600000;
    const notice = Math.max(5, 24 - i * 1.5);
    const delay = [15, 30, 20, 50, 25, 40, 35, 12, 22, 18, 28, 45][i];
    const sev = suggestSeverity({ type: t, delayMin: delay, routes: 1 });
    return {
      id: `INC-${String(i + 1).padStart(4, '0')}`, demo: true,
      type: t, route: routes[i], location: `${depots[i % 6]} depot area`, depot: depots[i % 6], delayMin: delay, routesAffected: 1,
      severity: sev, severityOverride: null, status: 'Resolved', owner: i % 3 === 0 ? 'Duty Manager' : 'Control Room',
      receivedAt: new Date(received).toISOString(),
      ownerAt: new Date(received + (i % 4 === 3 ? 7 : 3) * MIN).toISOString(),
      firstNoticeAt: new Date(received + notice * MIN).toISOString(),
      resolvedAt: new Date(received + (notice + 40) * MIN).toISOString(),
      notices: [], ehsRef: null, poRef: null
    };
  });
  return { seq: items.length, incidents: items };
}
function readDb() {
  if (!fs.existsSync(DB)) writeDb(seed());
  return JSON.parse(fs.readFileSync(DB, 'utf8'));
}
function writeDb(d) { fs.mkdirSync(path.dirname(DB), { recursive: true }); fs.writeFileSync(DB, JSON.stringify(d, null, 2)); }

// ---- business rules (from A2-D1: severity matrix, templates, KPIs) ----
const SEV = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
function suggestSeverity({ type, delayMin = 0, routes = 1 }) {
  let s = (delayMin >= 45 ? 3 : delayMin >= 20 ? 2 : delayMin >= 10 ? 1 : 0) + (routes >= 3 ? 2 : routes === 2 ? 1 : 0);
  if (['accident', 'blockage', 'security'].includes(type)) s += 1;
  return s >= 5 ? 'CRITICAL' : s >= 3 ? 'HIGH' : s >= 1 ? 'MEDIUM' : 'LOW';
}
const effSev = i => i.severityOverride ? i.severityOverride.level : i.severity;
const MANDATORY = ['type', 'route', 'location', 'delayMin', 'severity'];

const TEMPLATES = {
  holding: 'Route {route} services near {location} are delayed by about {delay} due to {type}. Please allow extra time or use {alternative}. Next update by {next_update}.',
  update: 'Update: Route {route} near {location} is still affected ({type}). Delays of about {delay}. Alternative: {alternative}. Next update by {next_update}.',
  resolved: 'Route {route} services near {location} are now running normally. Thank you for your patience.'
};
const typePhrase = t => (['road works', 'weather'].includes(t) ? t : (/^[aeiou]/i.test(t) ? 'an ' : 'a ') + t);
function fillTemplate(stage, i, extra = {}) {
  const nextUpdate = new Date(Date.now() + 15 * MIN).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
  const vals = {
    route: i.route, location: i.location, delay: `${i.delayMin} min`, type: typePhrase(i.type),
    alternative: extra.alternative || (i.poRef ? `replacement bus (PO ${i.poRef.po})` : 'nearby routes'),
    next_update: extra.next_update || nextUpdate
  };
  return (TEMPLATES[stage] || '').replace(/\{(\w+)\}/g, (_, k) => vals[k] ?? `{${k}}`);
}

function kpi(db) {
  const all = db.incidents;
  const sig = all.filter(i => effSev(i) !== 'LOW');
  const noticed = sig.filter(i => i.firstNoticeAt);
  const mins = noticed.map(i => (new Date(i.firstNoticeAt) - new Date(i.receivedAt)) / MIN);
  const avg = mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : null;
  const sorted = [...mins].sort((a, b) => a - b);
  const p90 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9) - 1)] : null;
  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);
  const ownerOk = all.filter(i => i.ownerAt && (new Date(i.ownerAt) - new Date(i.receivedAt)) / MIN <= 5).length;
  const complete = all.filter(i => MANDATORY.every(k => i[k] !== undefined && i[k] !== null && i[k] !== '')).length;
  const byDay = {};
  noticed.forEach(i => {
    const d = i.receivedAt.slice(0, 10);
    (byDay[d] = byDay[d] || []).push((new Date(i.firstNoticeAt) - new Date(i.receivedAt)) / MIN);
  });
  const series = Object.keys(byDay).sort().map(d => ({ day: d, avg: byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length }));
  const group = key => Object.entries(noticed.reduce((m, i) => { (m[i[key]] = m[i[key]] || []).push((new Date(i.firstNoticeAt) - new Date(i.receivedAt)) / MIN); return m; }, {}))
    .map(([name, v]) => ({ name, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }));
  return {
    avgNoticeMin: avg, p90NoticeMin: p90, targetMin: 10, baselineMin: 22,
    coveragePct: pct(noticed.length, sig.length), completenessPct: pct(complete, all.length), ownerWithin5Pct: pct(ownerOk, all.length),
    series, byRoute: group('route'), byDepot: group('depot'), total: all.length, demoCount: all.filter(i => i.demo).length
  };
}

// ---- HTTP helpers ----
const send = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = req => new Promise(r => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => { try { r(b ? JSON.parse(b) : {}); } catch { r({}); } }); });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  let mt;
  if (p === '/api/config' && m === 'GET') return send(res, 200, { ehsMode: cfg.EHS_MODE, poMode: cfg.PO_MODE, templates: TEMPLATES });
  if (p === '/api/sap/incidents' && m === 'GET') {
    try { return send(res, 200, { mode: cfg.EHS_MODE, items: await ehs.listIncidents(cfg, 10) }); }
    catch (e) { return send(res, 200, { mode: cfg.EHS_MODE, items: [], error: e.message }); }
  }
  if (p === '/api/po/orders' && m === 'GET') {
    try { return send(res, 200, { mode: cfg.PO_MODE, items: await po.listOrders(cfg) }); }
    catch (e) { return send(res, 200, { mode: cfg.PO_MODE, items: [], error: e.message }); }
  }
  if (p === '/api/kpi' && m === 'GET') return send(res, 200, kpi(readDb()));
  if (p === '/api/incidents' && m === 'GET') return send(res, 200, readDb().incidents.slice().sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)));
  if (p === '/api/incidents' && m === 'POST') {
    const b = await readBody(req);
    const db = readDb();
    const delayMin = Number(b.delayMin || 0), routesAffected = Number(b.routesAffected || 1);
    const inc = {
      id: `INC-${String(++db.seq).padStart(4, '0')}`, demo: false,
      type: b.type, route: b.route, location: b.location, depot: b.depot || '', delayMin, routesAffected,
      severity: suggestSeverity({ type: b.type, delayMin, routes: routesAffected }), severityOverride: null,
      status: 'Received', owner: null, receivedAt: new Date().toISOString(), ownerAt: null, firstNoticeAt: null, resolvedAt: null,
      notices: [], ehsRef: b.ehsRef || null, poRef: b.poRef || null
    };
    const missing = MANDATORY.filter(k => !inc[k] && inc[k] !== 0);
    if (missing.length) return send(res, 400, { error: 'Missing mandatory fields', missing });
    db.incidents.push(inc); writeDb(db);
    return send(res, 201, inc);
  }
  if ((mt = /^\/api\/incidents\/([\w-]+)$/.exec(p))) {
    const db = readDb(); const inc = db.incidents.find(i => i.id === mt[1]);
    if (!inc) return send(res, 404, { error: 'Not found' });
    if (m === 'GET') return send(res, 200, { ...inc, effectiveSeverity: effSev(inc), preview: { holding: fillTemplate('holding', inc), update: fillTemplate('update', inc), resolved: fillTemplate('resolved', inc) } });
    if (m === 'PATCH') {
      const b = await readBody(req);
      if (b.owner && !inc.owner) inc.ownerAt = new Date().toISOString();
      if (b.owner) inc.owner = b.owner;
      if (b.status) inc.status = b.status;
      if (b.ehsRef !== undefined) inc.ehsRef = b.ehsRef;
      if (b.poRef !== undefined) inc.poRef = b.poRef;
      if (b.severityOverride) {
        if (!b.severityOverride.reason) return send(res, 400, { error: 'Override needs a reason' });
        if (!SEV.includes(b.severityOverride.level)) return send(res, 400, { error: 'Bad level' });
        inc.severityOverride = { level: b.severityOverride.level, reason: b.severityOverride.reason, by: b.owner || inc.owner || 'Duty Manager', at: new Date().toISOString() };
      }
      writeDb(db); return send(res, 200, inc);
    }
  }
  if ((mt = /^\/api\/incidents\/([\w-]+)\/publish$/.exec(p)) && m === 'POST') {
    const db = readDb(); const inc = db.incidents.find(i => i.id === mt[1]);
    if (!inc) return send(res, 404, { error: 'Not found' });
    const b = await readBody(req);
    const stage = b.stage || 'holding';
    if (!inc.owner) return send(res, 409, { error: 'Assign an owner before publishing' });
    if (['HIGH', 'CRITICAL'].includes(effSev(inc)) && !b.approver) return send(res, 409, { error: 'HIGH/CRITICAL needs Duty Manager approval' });
    const text = (b.text && b.text.trim()) || fillTemplate(stage, inc, b);
    if (/\{\w+\}/.test(text)) return send(res, 400, { error: 'Unfilled {token} in message' });
    const now = new Date().toISOString();
    inc.notices.push({ stage, text, channels: b.channels || [], approver: b.approver || null, publishedAt: now, simulated: true });
    if (!inc.firstNoticeAt) inc.firstNoticeAt = now;
    inc.status = stage === 'resolved' ? 'Resolved' : 'Notice published';
    if (stage === 'resolved') inc.resolvedAt = now;
    writeDb(db);
    return send(res, 200, { incident: inc, noticeMinutes: Math.round(((new Date(inc.firstNoticeAt) - new Date(inc.receivedAt)) / MIN) * 10) / 10 });
  }
  return send(res, 404, { error: 'Unknown endpoint' });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const file = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'text/plain' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(cfg.PORT, () => console.log(`Disruption Hub on http://localhost:${cfg.PORT}  (EHS_MODE=${cfg.EHS_MODE}, PO_MODE=${cfg.PO_MODE})`));

```

=== FILE: adapters/ehs.js ===
```js
// EHS Incident adapter. Source of "SAP reference incidents".
// Modes: mock (built-in sample shaped like the real API) | sandbox (SAP API Hub sandbox, read-only use).
// Real field names come from API_EHS_REPORT_INCIDENT_SRV (A_Incident), verified against sandbox response.

const MOCK = [
  { IncidentUUID: '8b9171fd-3071-1ede-8593-e285e5bf4f08', IncidentID: '2', IncidentTitle: 'Incident Based on Injury/Illness Log Entry ID: 1', IncidentCategory: '001', IncidentStatus: '02', IncidentUTCDateTime: '/Date(1687755600000+0000)/' },
  { IncidentUUID: '8b9171fd-3071-1ede-8594-1c3fe8d8b246', IncidentID: '3', IncidentTitle: 'Slip from ladder', IncidentCategory: '002', IncidentStatus: '02', IncidentUTCDateTime: '/Date(1687839153000+0000)/' },
  { IncidentUUID: '8b9171fd-3071-1ede-8594-2103e4a6f2b1', IncidentID: '4', IncidentTitle: 'slippery floor', IncidentCategory: '003', IncidentStatus: '02', IncidentUTCDateTime: '/Date(1687839177000+0000)/' }
];

// "/Date(1687839153000+0000)/" -> ISO string
function parseODataDate(s) {
  const m = /\/Date\((-?\d+)/.exec(s || '');
  return m ? new Date(Number(m[1])).toISOString() : null;
}

function normalise(r) {
  return {
    uuid: r.IncidentUUID,
    id: r.IncidentID,
    title: r.IncidentTitle,
    category: r.IncidentCategory,
    status: r.IncidentStatus,
    occurredAt: parseODataDate(r.IncidentUTCDateTime),
    locationUUID: r.EHSLocationUUID || null
  };
}

async function listIncidents(cfg, top = 10) {
  if (cfg.EHS_MODE === 'sandbox') {
    if (!cfg.SAP_API_KEY) throw new Error('SAP_API_KEY is not set');
    const url = `${cfg.SAP_SANDBOX_BASE}/API_EHS_REPORT_INCIDENT_SRV/A_Incident?$top=${top}&$format=json`;
    const res = await fetch(url, { headers: { APIKey: cfg.SAP_API_KEY, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`EHS sandbox HTTP ${res.status}`);
    const json = await res.json();
    return (json.d && json.d.results ? json.d.results : []).map(normalise);
  }
  return MOCK.map(normalise);
}

module.exports = { listIncidents, parseODataDate };

```

=== FILE: adapters/po.js ===
```js
// Optional Purchase Order adapter: "replacement bus order" lookup.
// Modes: off | mock | sandbox. Sandbox entity names (A_PurchaseOrderItem) follow API_PURCHASEORDER_PROCESS_SRV - verify on first call.

const MOCK = [
  { po: '4500008784', item: '10', supplier: 'USSU_V8006', plant: '1710', text: '26ECR-BATTERY', net: 2153.34, currency: 'USD' },
  { po: '4500008783', item: '10', supplier: 'USSU_V8007', plant: '1710', text: 'Frame-950', net: 7970.76, currency: 'USD' },
  { po: '4500008782', item: '10', supplier: 'USSU_V8007', plant: '1710', text: 'Frame-950', net: 18218.88, currency: 'USD' }
];

async function listOrders(cfg, top = 5) {
  if (cfg.PO_MODE === 'off') return [];
  if (cfg.PO_MODE === 'sandbox') {
    if (!cfg.SAP_API_KEY) throw new Error('SAP_API_KEY is not set');
    const url = `${cfg.SAP_SANDBOX_BASE}/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrderItem?$top=${top}&$format=json`;
    const res = await fetch(url, { headers: { APIKey: cfg.SAP_API_KEY, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`PO sandbox HTTP ${res.status}`);
    const json = await res.json();
    return (json.d.results || []).map(r => ({
      po: r.PurchaseOrder, item: r.PurchaseOrderItem, supplier: r.Supplier || '',
      plant: r.Plant, text: r.PurchaseOrderItemText, net: Number(r.NetPriceAmount), currency: r.DocumentCurrency
    }));
  }
  return MOCK;
}

module.exports = { listOrders };

```

=== FILE: public/index.html ===
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Disruption Hub</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<header>
  <b>Disruption Hub</b><span class="sub">Auckland Transport · prototype</span>
  <nav>
    <button data-tab="board" class="on">Live board</button>
    <button data-tab="report">Report disruption</button>
    <button data-tab="kpi">KPIs</button>
  </nav>
  <span id="modes" class="modes"></span>
</header>
<main>
  <section id="tab-board">
    <div class="split">
      <div class="list"><h2>Active &amp; recent incidents</h2><div id="board"></div></div>
      <div class="detail" id="detail"><p class="muted">Select an incident to see details and send a passenger notice.</p></div>
    </div>
  </section>
  <section id="tab-report" hidden>
    <h2>Report a disruption</h2>
    <form id="form" class="card form">
      <label>Type
        <select name="type" required><option value="">Select…</option><option>breakdown</option><option>accident</option><option>road works</option><option>weather</option><option>blockage</option></select></label>
      <label>Route <input name="route" required placeholder="e.g. 70"></label>
      <label>Location <input name="location" required placeholder="e.g. Birkenhead wharf"></label>
      <label>Depot / area <input name="depot" placeholder="e.g. Birkenhead"></label>
      <label>Expected delay (min) <input name="delayMin" type="number" min="0" required></label>
      <label>Routes affected <input name="routesAffected" type="number" min="1" value="1"></label>
      <label>Link SAP EHS incident (reference, optional)
        <select name="ehsRef" id="ehsSel"><option value="">None</option></select></label>
      <label id="poLabel">Replacement bus order (SAP PO, optional)
        <select name="poRef" id="poSel"><option value="">None</option></select></label>
      <div class="sev">Suggested severity: <b id="sevHint">—</b></div>
      <button class="primary" type="submit">Submit &amp; start notice clock</button>
      <div id="formMsg" class="muted"></div>
    </form>
  </section>
  <section id="tab-kpi" hidden>
    <h2>Communication effectiveness</h2>
    <div id="kpi"></div>
  </section>
</main>
<script src="app.js"></script>
</body>
</html>

```

=== FILE: public/style.css ===
```css
:root{--ink:#1F2328;--mut:#6B7280;--line:#D1D5DB;--bg:#F4F4F1;--acc:#1D4ED8;--warn:#C2410C}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
header{display:flex;align-items:center;gap:14px;padding:0 24px;height:56px;background:#fff;border-bottom:1.5px solid var(--ink)}
header .sub{color:var(--mut);font-size:13px}
nav{display:flex;gap:6px;margin-left:24px}
nav button{border:1.5px solid var(--ink);background:#fff;border-radius:6px;padding:7px 14px;font-weight:600;cursor:pointer}
nav button.on{background:var(--ink);color:#fff}
.modes{margin-left:auto;font:12px ui-monospace,monospace;color:var(--mut)}
main{padding:24px;max-width:1280px;margin:0 auto}
h2{margin:0 0 12px;font-size:20px}
.split{display:grid;grid-template-columns:minmax(300px,1fr) minmax(360px,1.3fr);gap:20px}
@media(max-width:900px){.split{grid-template-columns:1fr}}
.card,.item,.detail{background:#fff;border:1px solid var(--line);border-radius:8px}
.item{padding:12px 14px;margin-bottom:8px;cursor:pointer}
.item.sel{border-color:var(--ink);border-width:2px}
.item b{display:block}
.muted{color:var(--mut);font-size:13px}
.sev,.pill{display:inline-block;font:600 11px ui-monospace,monospace;padding:2px 7px;border-radius:4px;color:#fff;background:#6B7280}
.LOW{background:#6B7280}.MEDIUM{background:#B45309}.HIGH{background:var(--warn)}.CRITICAL{background:#7C2D12}
.detail{padding:18px 20px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:8px 0}
.form{padding:18px 20px;display:grid;gap:12px;max-width:560px}
label{display:grid;gap:4px;font-weight:600;font-size:13px}
input,select,textarea{font:inherit;padding:8px 10px;border:1px solid #6B7280;border-radius:6px;width:100%}
textarea{min-height:86px}
button{font:inherit;cursor:pointer}
.primary{background:var(--ink);color:#fff;border:0;border-radius:6px;padding:10px 16px;font-weight:600}
.ghost{background:#fff;border:1.5px solid var(--ink);border-radius:6px;padding:7px 12px;font-weight:600}
.tabs{display:flex;margin:12px 0}
.tabs button{border:1.5px solid var(--ink);background:#fff;padding:7px 12px;font-weight:600}
.tabs button.on{background:var(--ink);color:#fff}
.clock{font:600 18px ui-monospace,monospace}
.over{color:var(--warn)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px}
.kpi{padding:14px 16px}.kpi b{display:block;font-size:30px}
.bar{display:grid;grid-template-columns:110px 1fr 56px;gap:10px;align-items:center;font-size:13px;margin:6px 0}
.track{height:12px;background:#E5E7EB;border-radius:3px}.fill{height:12px;background:var(--ink);border-radius:3px}
.notice{border-left:3px solid var(--acc);padding:6px 10px;margin:6px 0;background:#F9FAFB;font-size:14px}
.err{color:var(--warn)}

```

=== FILE: public/app.js ===
```js
// Disruption Hub UI (vanilla JS). All SAP access goes through /api/* - no keys in the browser.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = async (url, opt) => { const r = await fetch(url, opt && { ...opt, headers: { 'Content-Type': 'application/json' }, body: opt.body && JSON.stringify(opt.body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
const OWNERS = ['Duty Manager', 'Control Room', 'Customer Information'];
const CHANNELS = ['AT Mobile app alert', 'at.govt.nz service alerts', 'Real-time stop signs', 'Social media'];
let state = { incidents: [], selected: null, stage: 'holding', cfg: {} };

// ---- tabs ----
document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
  ['board', 'report', 'kpi'].forEach(t => ($(`#tab-${t}`).hidden = t !== b.dataset.tab));
  if (b.dataset.tab === 'board') loadBoard();
  if (b.dataset.tab === 'kpi') loadKpi();
});

// ---- board (SC-03) ----
const mins = ms => Math.floor(ms / 60000);
function clockText(i) {
  const end = i.firstNoticeAt ? new Date(i.firstNoticeAt) : new Date();
  const m = (end - new Date(i.receivedAt)) / 60000;
  return `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`;
}
async function loadBoard() {
  state.incidents = await api('/api/incidents');
  const rows = state.incidents.map(i => {
    const sev = i.severityOverride ? i.severityOverride.level : i.severity;
    const over = !i.firstNoticeAt && (Date.now() - new Date(i.receivedAt)) / 60000 > 10;
    return `<div class="item ${state.selected === i.id ? 'sel' : ''}" data-id="${i.id}">
      <span class="pill ${sev}">${sev}</span> <b>${esc(i.id)} · Route ${esc(i.route)}</b>
      <span class="muted">${esc(i.type)} · ${esc(i.location)}</span>
      <div class="row"><span class="muted">${esc(i.status)} · ${esc(i.owner || 'No owner')}${i.demo ? ' · demo' : ''}</span>
      <span class="clock ${over ? 'over' : ''}" data-clock="${i.id}">${clockText(i)}</span></div></div>`;
  }).join('');
  $('#board').innerHTML = rows || '<p class="muted">No incidents yet.</p>';
  document.querySelectorAll('.item').forEach(el => el.onclick = () => selectIncident(el.dataset.id));
}
setInterval(() => state.incidents.forEach(i => { const el = document.querySelector(`[data-clock="${i.id}"]`); if (el && !i.firstNoticeAt) el.textContent = clockText(i); }), 1000);

// ---- detail + comms (SC-04 / SC-05) ----
async function selectIncident(id) {
  state.selected = id;
  const i = await api(`/api/incidents/${id}`);
  const sev = i.effectiveSeverity;
  const needsApproval = ['HIGH', 'CRITICAL'].includes(sev);
  const text = i.preview[state.stage];
  $('#detail').innerHTML = `
    <div class="row"><span class="pill ${sev}">${sev}</span><b style="font-size:18px">${esc(i.id)} · Route ${esc(i.route)}</b>
      <span class="clock" id="dclock">${clockText(i)}</span></div>
    <div class="muted">${esc(i.type)} · ${esc(i.location)} · delay ~${i.delayMin} min · status: ${esc(i.status)}</div>
    ${i.severityOverride ? `<div class="muted">Severity overridden by ${esc(i.severityOverride.by)}: ${esc(i.severityOverride.reason)}</div>` : ''}
    <div class="row"><label style="flex:1">Owner <select id="owner"><option value="">Assign…</option>${OWNERS.map(o => `<option ${o === i.owner ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      <label>Override severity <select id="ovr"><option value="">—</option>${['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => `<option>${s}</option>`).join('')}</select></label></div>
    <div id="sap" class="muted">${i.ehsRef ? `SAP EHS reference: <b>${esc(i.ehsRef.title)}</b> (ID ${esc(i.ehsRef.id)})` : 'No SAP EHS reference linked'}${i.poRef ? ` · Replacement order: <b>PO ${esc(i.poRef.po)}</b> (${esc(i.poRef.supplier)}, plant ${esc(i.poRef.plant)})` : ''}</div>
    <h3>Passenger notice</h3>
    <div class="tabs">${['holding', 'update', 'resolved'].map((s, n) => `<button class="${s === state.stage ? 'on' : ''}" data-stage="${s}">${n + 1} · ${s}</button>`).join('')}</div>
    <textarea id="msg">${esc(text)}</textarea>
    <div class="row">${CHANNELS.map(c => `<label style="display:flex;gap:6px;font-weight:400"><input type="checkbox" class="ch" value="${c}" checked style="width:auto">${c}</label>`).join('')}</div>
    <div class="muted">Channels are simulated in this prototype (saved, not sent).</div>
    <div class="row">${needsApproval ? '<label style="display:flex;gap:6px"><input type="checkbox" id="appr" style="width:auto"> Duty Manager approves</label>' : '<span class="muted">Auto-approved for this severity</span>'}
      <button class="primary" id="pub">Approve &amp; publish</button></div>
    <div id="msgErr" class="err"></div>
    <h3>Published notices</h3>${i.notices.length ? i.notices.map(n => `<div class="notice"><b>${esc(n.stage)}</b> · ${new Date(n.publishedAt).toLocaleTimeString()}<br>${esc(n.text)}</div>`).join('') : '<p class="muted">None yet.</p>'}`;
  $('#owner').onchange = async e => { await api(`/api/incidents/${id}`, { method: 'PATCH', body: { owner: e.target.value } }); await loadBoard(); selectIncident(id); };
  $('#ovr').onchange = async e => { if (!e.target.value) return; const reason = prompt('Reason for override?'); if (!reason) return; await api(`/api/incidents/${id}`, { method: 'PATCH', body: { owner: i.owner || 'Duty Manager', severityOverride: { level: e.target.value, reason } } }); await loadBoard(); selectIncident(id); };
  document.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { state.stage = b.dataset.stage; selectIncident(id); });
  $('#pub').onclick = async () => {
    try {
      const r = await api(`/api/incidents/${id}/publish`, { method: 'POST', body: { stage: state.stage, text: $('#msg').value, channels: [...document.querySelectorAll('.ch:checked')].map(c => c.value), approver: needsApproval ? ($('#appr').checked ? 'Duty Manager' : null) : 'auto' } });
      await loadBoard(); await selectIncident(id);
      $('#msgErr').textContent = ''; $('#msgErr').className = 'muted';
      $('#msgErr').textContent = `Published. First public notice after ${r.noticeMinutes} min.`;
    } catch (e) { $('#msgErr').textContent = e.message; }
  };
  loadBoard();
}

// ---- report (SC-02) ----
function hint() {
  const f = new FormData($('#form'));
  const d = Number(f.get('delayMin') || 0), r = Number(f.get('routesAffected') || 1), t = f.get('type');
  let s = (d >= 45 ? 3 : d >= 20 ? 2 : d >= 10 ? 1 : 0) + (r >= 3 ? 2 : r === 2 ? 1 : 0) + (['accident', 'blockage', 'security'].includes(t) ? 1 : 0);
  $('#sevHint').textContent = t ? (s >= 5 ? 'CRITICAL' : s >= 3 ? 'HIGH' : s >= 1 ? 'MEDIUM' : 'LOW') : '—';
}
$('#form').oninput = hint;
$('#form').onsubmit = async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  f.ehsRef = f.ehsRef ? JSON.parse(f.ehsRef) : null;
  f.poRef = f.poRef ? JSON.parse(f.poRef) : null;
  try {
    const inc = await api('/api/incidents', { method: 'POST', body: f });
    $('#formMsg').textContent = `Created ${inc.id}. Notice clock started.`;
    e.target.reset(); hint();
    document.querySelector('[data-tab=board]').click();
    setTimeout(() => selectIncident(inc.id), 200);
  } catch (err) { $('#formMsg').textContent = err.message; $('#formMsg').className = 'err'; }
};
async function loadSap() {
  const e = await api('/api/sap/incidents');
  $('#ehsSel').innerHTML = '<option value="">None</option>' + e.items.map(x => `<option value='${esc(JSON.stringify({ uuid: x.uuid, id: x.id, title: x.title }))}'>#${esc(x.id)} ${esc(x.title)}</option>`).join('');
  const p = await api('/api/po/orders');
  $('#poLabel').hidden = p.mode === 'off';
  $('#poSel').innerHTML = '<option value="">None</option>' + p.items.map(x => `<option value='${esc(JSON.stringify(x))}'>PO ${esc(x.po)} · ${esc(x.text)} · ${esc(x.supplier)}</option>`).join('');
  if (e.error || p.error) $('#formMsg').textContent = `SAP: ${e.error || p.error}`;
}

// ---- KPI (SC-07) ----
const f1 = n => (n == null ? '–' : (Math.round(n * 10) / 10).toString());
async function loadKpi() {
  const k = await api('/api/kpi');
  const bars = (arr, max) => arr.map(x => `<div class="bar"><span>${esc(x.name)}</span><div class="track"><div class="fill" style="width:${Math.min(100, (x.avg / max) * 100)}%"></div></div><span>${f1(x.avg)}</span></div>`).join('');
  const max = Math.max(30, ...k.series.map(s => s.avg));
  $('#kpi').innerHTML = `
    <div class="kpis">
      <div class="card kpi"><span class="muted">Avg first public notice</span><b>${f1(k.avgNoticeMin)} min</b><span class="muted">Target ≤ ${k.targetMin} min · baseline ~${k.baselineMin} min · P90 ${f1(k.p90NoticeMin)}</span></div>
      <div class="card kpi"><span class="muted">Communication coverage</span><b>${f1(k.coveragePct)}%</b><span class="muted">Target 100% of significant</span></div>
      <div class="card kpi"><span class="muted">Mandatory-field completeness</span><b>${f1(k.completenessPct)}%</b><span class="muted">Target ≥ 95%</span></div>
      <div class="card kpi"><span class="muted">Owner within 5 min</span><b>${f1(k.ownerWithin5Pct)}%</b><span class="muted">Target ≥ 95%</span></div>
    </div>
    <div class="card" style="padding:14px 16px"><b>Avg notice time per day (min)</b>
      <svg viewBox="0 0 600 180" width="100%" role="img" aria-label="Notice time per day">
        <line x1="30" x2="590" y1="${160 - (k.targetMin / max) * 140}" y2="${160 - (k.targetMin / max) * 140}" stroke="#C2410C" stroke-dasharray="6 4"/>
        <text x="34" y="${154 - (k.targetMin / max) * 140}" font-size="11" fill="#C2410C">10-min target</text>
        <polyline fill="none" stroke="#1F2328" stroke-width="2" points="${k.series.map((s, n) => `${30 + (n * 560) / Math.max(1, k.series.length - 1)},${160 - (s.avg / max) * 140}`).join(' ')}"/>
      </svg></div>
    <div class="split" style="margin-top:14px"><div class="card" style="padding:14px 16px"><b>By route</b>${bars(k.byRoute, max)}</div>
      <div class="card" style="padding:14px 16px"><b>By depot</b>${bars(k.byDepot, max)}</div></div>
    <p class="muted">${k.demoCount} of ${k.total} incidents are seeded demo data.</p>`;
}

(async () => {
  state.cfg = await api('/api/config');
  $('#modes').textContent = `EHS: ${state.cfg.ehsMode} · PO: ${state.cfg.poMode}`;
  await loadSap(); await loadBoard();
})();

```

=== FILE: README.md ===
```md
# Disruption Hub (INFOSYS 704 A3 prototype)

Auckland Transport bus disruption management. Proposal link: A2-D1 Integrated Disruption Management Hub.
Runs with **zero npm dependencies** (Node 18+). Open http://localhost:3000.

## Run
```
cp .env.example .env      # Windows: copy .env.example .env
node server.js
```
Default is `EHS_MODE=mock`, `PO_MODE=mock` - works offline, no key needed.

## SAP connection modes
| Setting | Meaning |
|---|---|
| `EHS_MODE=mock` | built-in sample incidents (same shape as the real API) |
| `EHS_MODE=sandbox` | reads `API_EHS_REPORT_INCIDENT_SRV/A_Incident` from SAP API Hub sandbox. Needs `SAP_API_KEY` in `.env` |
| `PO_MODE=off\|mock\|sandbox` | optional replacement-bus order lookup from `API_PURCHASEORDER_PROCESS_SRV` (entity names to verify on first call) |

The API key is read **server-side only** (`.env`, gitignored). Never put it in `public/` or paste it into chat.

## Architecture
```
public/ (UI)  ->  /api/*  (server.js)  ->  adapters/ehs.js  (SAP EHS Incident: read reference incidents)
                                        ->  adapters/po.js   (SAP Purchase Order: optional replacement order)
                                        ->  data/db.json     (app store: severity, owner, status, timestamps, notices)
```
SAP covers what it supports (incident reference, replacement order); the disruption-specific parts SAP has no API for
(severity matrix with override, owner clock, approved passenger notice, KPIs) live in the app store. State this honestly in the pitch (Option 2: partial fit).

## Screens (from the wireframes)
| Screen | Where |
|---|---|
| SC-02 Report disruption | "Report disruption" tab - mandatory fields, suggested severity, optional SAP links |
| SC-03 Live board | "Live board" - severity, owner, status, running notice clock |
| SC-04 Incident detail | right panel - owner, severity override with reason, SAP references |
| SC-05 Passenger notice | right panel - template, edit, channels (simulated), approve & publish |
| SC-07 KPIs | "KPIs" tab - avg first notice vs 10-min target, coverage, completeness, owner <=5 min |
SC-01 (role home) and SC-06 (review) are not built (COULD).

## API endpoints
`GET /api/config` · `GET /api/sap/incidents` · `GET /api/po/orders` · `GET|POST /api/incidents` · `GET|PATCH /api/incidents/:id` · `POST /api/incidents/:id/publish` · `GET /api/kpi`

## Demo story (5 min, SCR)
1. Situation: 22-min average first public notice today (OAG 2025 baseline).
2. Complication: fragmented channels, unclear owner, late updates (P1-P6).
3. Resolution demo: report accident on route 70 -> severity HIGH -> assign owner -> approve & publish -> clock stops -> KPI chart updates.
Seeded incidents are labelled demo data.

## Switching to the course Integration Suite (when the EHS MCP server is fixed)
Only `adapters/ehs.js` changes: add a `live` branch that calls the Integration Suite URL with the bearer token (see get-sap-token.ps1 approach), same normalise() output. No UI change.

## Using this with opencode.ai
Paste prompts from `OPENCODE_PROMPTS.md` one at a time. Keep `.env` out of the export; set the key in opencode's environment settings.
Confirm the Lab "Development Guidelines" are followed before export (rubric: Functionality).

```
