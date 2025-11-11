# File: README.md

## CloudCX Internal Pinger — Replit‑ready (Node.js + Minimal UI)
A lightweight, single‑process monitoring app you can run on Replit (for demo) or deploy privately on EC2/ECS. No Prometheus/Grafana. It:

- Checks HTTP/HTTPS, TCP (telnet‑style), and (optionally) ICMP ping
- Schedules checks per‑target; stores history in SQLite
- Sends email alerts via SMTP (on state change UP→DOWN and recovery)
- Proxies **CloudWatch Logs** queries using AWS SDK v3
- Live updates over WebSocket
- Minimal UI served by the same Node process (no separate build step)

> **Note**: ICMP ping may be blocked on some hosts (including Replit). HTTP/TCP checks work everywhere.

### Quick start on Replit
1) Create a new Replit → **Node.js**.
2) Paste these project files.
3) Create a **.env** from `.env.example`.
4) Click **Run**. Open the webview.

### .env
```
PORT=3000
API_KEY=change-me-please
SMTP_HOST=smtp.internal.local
SMTP_PORT=25
FROM_EMAIL=pinger@cloudcx.local
# Optional SMTP auth
# SMTP_USER=
# SMTP_PASS=
AWS_REGION=eu-west-2
# For local/Replit (avoid committing real creds):
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
```

### Deploy privately (EC2 quick notes)
- Use the same code. Provide an instance role with `logs:FilterLogEvents` on your log groups.
- Bind security group to your internal CIDR; optionally put behind an internal ALB.

---

# File: package.json
{
  "name": "cloudcx-internal-pinger-replit",
  "version": "0.2.0",
  "private": true,
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@aws-sdk/client-cloudwatch-logs": "^3.657.0",
    "axios": "^1.7.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "nodemailer": "^6.9.14",
    "ping": "^0.4.4",
    "socket.io": "^4.7.5",
    "sqlite3": "^5.1.7"
  }
}

---

# File: server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const net = require('net');
const ping = require('ping');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

dotenv.config();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'change-me-please';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-2';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Auth (very simple API key header) ---
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// --- DB setup (SQLite) ---
const db = new sqlite3.Database(path.join(__dirname, 'data.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT CHECK(type IN ('HTTP','TCP','ICMP')),
    endpoint TEXT,
    frequency_sec INTEGER DEFAULT 60,
    expected_code INTEGER,
    timeout_ms INTEGER DEFAULT 5000,
    alert_email TEXT,
    enabled INTEGER DEFAULT 1
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    status TEXT,
    latency_ms INTEGER,
    code INTEGER,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// --- Email alerts ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 25),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});
async function sendAlert(to, subject, html) {
  if (!to) return;
  try { await transporter.sendMail({ from: process.env.FROM_EMAIL || 'pinger@local', to, subject, html }); }
  catch (e) { console.error('Alert send failed:', e.message); }
}

// --- Checks ---
async function httpCheck(url, timeoutMs = 5000) {
  const started = Date.now();
  try {
    const res = await axios.get(url, { timeout: timeoutMs, validateStatus: () => true });
    return { ok: res.status >= 200 && res.status < 400, latency: Date.now() - started, code: res.status, msg: res.statusText };
  } catch (e) {
    return { ok: false, latency: Date.now() - started, code: 0, msg: e.message };
  }
}
function tcpCheck(host, port, timeoutMs = 5000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok, msg) => { if (done) return; done = true; try{socket.destroy();}catch{}; resolve({ ok, latency: Date.now()-started, code: ok?1:0, msg }); };
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => finish(true, 'connected'));
    socket.on('error', (err) => finish(false, err.message));
    socket.on('timeout', () => finish(false, 'timeout'));
  });
}
async function icmpCheck(host, timeoutMs = 5000) {
  const started = Date.now();
  try {
    const out = await ping.promise.probe(host, { timeout: Math.ceil(timeoutMs/1000) });
    return { ok: !!out.alive, latency: Date.now() - started, code: out.alive ? 1 : 0, msg: out.output || '' };
  } catch (e) {
    return { ok: false, latency: Date.now() - started, code: 0, msg: e.message };
  }
}

// --- Scheduler ---
const running = new Set();
setInterval(() => {
  db.all('SELECT * FROM targets WHERE enabled = 1', async (err, rows) => {
    if (err || !rows) return;
    const now = Math.floor(Date.now() / 1000);
    for (const t of rows) {
      if (running.has(t.id)) continue;
      if (t.frequency_sec <= 0) continue;
      if (now % t.frequency_sec !== 0) continue;
      running.add(t.id);
      runCheck(t).finally(() => running.delete(t.id));
    }
  });
}, 1000);

async function runCheck(t) {
  let res;
  try {
    if (t.type === 'HTTP') res = await httpCheck(t.endpoint, t.timeout_ms);
    else if (t.type === 'TCP') {
      const [host, portStr] = String(t.endpoint).split(':');
      res = await tcpCheck(host, Number(portStr), t.timeout_ms);
    } else { // ICMP
      res = await icmpCheck(t.endpoint, t.timeout_ms);
    }
  } catch (e) {
    res = { ok: false, latency: 0, code: 0, msg: e.message };
  }

  db.run('INSERT INTO results(target_id,status,latency_ms,code,message) VALUES (?,?,?,?,?)',
    [t.id, res.ok ? 'UP' : 'DOWN', res.latency, res.code, (res.msg || '').slice(0, 500)],
    (e) => { if (e) console.error('DB insert error:', e.message); }
  );

  io.emit('result', { targetId: t.id, name: t.name, type: t.type, status: res.ok ? 'UP' : 'DOWN', latency: res.latency, code: res.code, at: new Date().toISOString() });

  // Alert on state change (only on transition)
  db.all('SELECT status FROM results WHERE target_id=? ORDER BY id DESC LIMIT 2', [t.id], async (err, rows) => {
    if (err || rows.length < 2) return;
    const [latest, prev] = rows;
    if (latest.status === 'DOWN' && prev.status === 'UP') {
      await sendAlert(t.alert_email, `⚠️ ${t.name} is DOWN`, `<p>${t.name} (${t.type}) failed at ${new Date().toISOString()}</p><pre>${res.msg || ''}</pre>`);
    }
    if (latest.status === 'UP' && prev.status === 'DOWN') {
      await sendAlert(t.alert_email, `✅ ${t.name} has recovered`, `<p>${t.name} is back UP at ${new Date().toISOString()}</p>`);
    }
  });
}

// --- API routes (protected) ---
app.get('/api/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/targets', auth, (req, res) => {
  db.all('SELECT * FROM targets ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/targets', auth, (req, res) => {
  const { name, type, endpoint, frequency_sec = 60, expected_code = null, timeout_ms = 5000, alert_email = null, enabled = 1 } = req.body || {};
  if (!name || !type || !endpoint) return res.status(400).json({ error: 'name, type, endpoint required' });
  const stmt = db.prepare('INSERT INTO targets(name,type,endpoint,frequency_sec,expected_code,timeout_ms,alert_email,enabled) VALUES (?,?,?,?,?,?,?,?)');
  stmt.run([name, type, endpoint, frequency_sec, expected_code, timeout_ms, alert_email, enabled ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/targets/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  const { name, type, endpoint, frequency_sec, expected_code, timeout_ms, alert_email, enabled } = req.body || {};
  const stmt = db.prepare('UPDATE targets SET name=?, type=?, endpoint=?, frequency_sec=?, expected_code=?, timeout_ms=?, alert_email=?, enabled=? WHERE id=?');
  stmt.run([name, type, endpoint, frequency_sec, expected_code, timeout_ms, alert_email, enabled ? 1 : 0, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/targets/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM targets WHERE id=?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/api/results/:targetId', auth, (req, res) => {
  const targetId = Number(req.params.targetId);
  db.all('SELECT * FROM results WHERE target_id=? ORDER BY id DESC LIMIT 200', [targetId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// CloudWatch Logs proxy
const cwl = new CloudWatchLogsClient({ region: AWS_REGION });
app.get('/api/logs', auth, async (req, res) => {
  const group = req.query.group;
  const q = req.query.q || undefined;
  const sinceSec = Number(req.query.since || 3600);
  const limit = Math.min(Number(req.query.limit || 200), 2000);
  if (!group) return res.status(400).json({ error: 'group required' });
  try {
    const cmd = new FilterLogEventsCommand({ logGroupName: String(group), startTime: Date.now() - sinceSec*1000, endTime: Date.now(), filterPattern: q, limit });
    const out = await cwl.send(cmd);
    const items = (out.events || []).map(e => ({ ts: e.timestamp, stream: e.logStreamName, message: e.message }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback to UI
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => console.log(`CloudCX Internal Pinger running on :${PORT}`));

---

# File: public/index.html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CloudCX Internal Pinger</title>
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 20px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
      .pill { padding: 2px 8px; border-radius: 12px; font-size: 12px; display: inline-block; }
      .up { background:#e6ffed; color:#067d2e; }
      .down { background:#ffebea; color:#a11a1a; }
      .grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
      @media(max-width:900px){ .grid { grid-template-columns: 1fr; } }
      input, select { padding:8px; width:100%; box-sizing:border-box; }
      button { padding:8px 12px; }
      .card { border:1px solid #eee; border-radius:12px; padding:16px; }
    </style>
  </head>
  <body>
    <h1>CloudCX Internal Pinger</h1>

    <div class="grid">
      <div class="card">
        <h3>Targets</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Endpoint</th><th>Freq</th><th>Alert</th><th>Actions</th></tr>
          </thead>
          <tbody id="targets"></tbody>
        </table>
      </div>

      <div class="card">
        <h3>Add / Update Target</h3>
        <form id="targetForm">
          <input type="hidden" id="id" />
          <label>Name</label>
          <input id="name" required />
          <label>Type</label>
          <select id="type">
            <option>HTTP</option>
            <option>TCP</option>
            <option>ICMP</option>
          </select>
          <label>Endpoint (URL for HTTP, host:port for TCP, host for ICMP)</label>
          <input id="endpoint" required />
          <label>Frequency (sec)</label>
          <input type="number" id="frequency" value="60" />
          <label>Timeout (ms)</label>
          <input type="number" id="timeout" value="5000" />
          <label>Expected HTTP Code (optional)</label>
          <input type="number" id="code" />
          <label>Alert Email (optional)</label>
          <input id="email" />
          <label>Enabled</label>
          <select id="enabled"><option value="1">Yes</option><option value="0">No</option></select>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <button type="submit">Save</button>
            <button type="button" onclick="resetForm()">Reset</button>
          </div>
        </form>
      </div>
    </div>

    <div class="grid" style="margin-top:16px;">
      <div class="card">
        <h3>Live Events</h3>
        <ul id="events"></ul>
      </div>
      <div class="card">
        <h3>CloudWatch Logs</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label>Log Group</label>
            <input id="logGroup" placeholder="/aws/lambda/your-func" />
          </div>
          <div>
            <label>Filter Pattern (optional)</label>
            <input id="logQuery" placeholder="ERROR" />
          </div>
          <div>
            <label>Since (seconds)</label>
            <input id="logSince" value="3600" />
          </div>
        </div>
        <button style="margin-top:8px;" onclick="loadLogs()">Load Logs</button>
        <pre id="logs" style="height:260px; overflow:auto; background:#0b1020; color:#e5eeff; padding:8px; border-radius:8px;"></pre>
      </div>
    </div>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script>
      const API = '';
      const API_KEY = localStorage.getItem('apiKey') || prompt('Enter API Key');
      if (API_KEY) localStorage.setItem('apiKey', API_KEY);

      const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };

      async function fetchTargets(){
        const r = await fetch(`${API}/api/targets`, { headers });
        const list = await r.json();
        const tbody = document.getElementById('targets');
        tbody.innerHTML='';
        list.forEach(t=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${t.name}</td><td>${t.type}</td><td>${t.endpoint}</td><td>${t.frequency_sec}s</td><td>${t.alert_email||'-'}</td>
            <td>
              <button onclick='editTarget(${JSON.stringify(t).replaceAll("'","&#39;")})'>Edit</button>
              <button onclick='delTarget(${t.id})'>Delete</button>
            </td>`;
          tbody.appendChild(tr);
        });
      }

      async function delTarget(id){
        if(!confirm('Delete target?')) return;
        await fetch(`${API}/api/targets/`+id, { method:'DELETE', headers });
        fetchTargets();
      }

      function editTarget(t){
        document.getElementById('id').value = t.id;
        document.getElementById('name').value = t.name;
        document.getElementById('type').value = t.type;
        document.getElementById('endpoint').value = t.endpoint;
        document.getElementById('frequency').value = t.frequency_sec;
        document.getElementById('timeout').value = t.timeout_ms;
        document.getElementById('code').value = t.expected_code || '';
        document.getElementById('email').value = t.alert_email || '';
        document.getElementById('enabled').value = t.enabled;
      }

      function resetForm(){ document.getElementById('targetForm').reset(); document.getElementById('id').value=''; }

      document.getElementById('targetForm').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const t = {
          name: document.getElementById('name').value,
          type: document.getElementById('type').value,
          endpoint: document.getElementById('endpoint').value,
          frequency_sec: Number(document.getElementById('frequency').value||60),
          expected_code: document.getElementById('code').value? Number(document.getElementById('code').value): null,
          timeout_ms: Number(document.getElementById('timeout').value||5000),
          alert_email: document.getElementById('email').value || null,
          enabled: Number(document.getElementById('enabled').value)
        };
        const id = document.getElementById('id').value;
        if(id){
          await fetch(`${API}/api/targets/`+id, { method:'PUT', headers, body: JSON.stringify(t) });
        } else {
          await fetch(`${API}/api/targets`, { method:'POST', headers, body: JSON.stringify(t) });
        }
        resetForm();
        fetchTargets();
      });

      async function loadLogs(){
        const g = document.getElementById('logGroup').value;
        const q = document.getElementById('logQuery').value;
        const since = document.getElementById('logSince').value;
        if(!g){ alert('Enter log group'); return; }
        const u = new URL(`${API}/api/logs`, location.origin);
        u.searchParams.set('group', g); if(q) u.searchParams.set('q', q); u.searchParams.set('since', since);
        const r = await fetch(u, { headers });
        const arr = await r.json();
        const pre = document.getElementById('logs');
        pre.textContent = arr.map(e=> new Date(e.ts).toISOString()+" "+e.stream+"\n"+e.message).join('\n\n');
      }

      // Live socket
      const socket = io('', { path: '/socket.io' });
      socket.on('connect', ()=> console.log('socket connected'));
      socket.on('result', (e)=>{
        const li = document.createElement('li');
        li.innerHTML = `${e.at} — <strong>${e.name}</strong> (${e.type}) — `+
          `<span class="pill ${e.status==='UP'?'up':'down'}">${e.status}</span> — ${e.latency} ms`;
        const ul = document.getElementById('events');
        ul.prepend(li);
        while(ul.children.length>200) ul.removeChild(ul.lastChild);
      });

      fetchTargets();
    </script>
  </body>
</html>

---

# File: .env.example
PORT=3000
API_KEY=change-me-please
SMTP_HOST=smtp.internal.local
SMTP_PORT=25
FROM_EMAIL=pinger@cloudcx.local
AWS_REGION=eu-west-2
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=...
