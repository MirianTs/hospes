// Servo buttons: a tiny separate site with three buttons, one per servo (doors 1-3).
// It changes nothing in Hospes: a press goes to the Hospes backend's servo test route
// (POST /admin/locks/:id/open; the backend owns the Arduino), and the door states come
// from its live feed. No dependencies; Node 22+ (built-in fetch).
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.SERVO_BUTTONS_PORT) || 5501;
const API = (process.env.HOSPES_API || 'http://localhost:4000/api').replace(/\/$/, '');
// The seeded demo admin (backend/src/seed.js); override for a real setup.
const EMAIL = process.env.HOSPES_EMAIL || 'admin@hospes.test';
const PASSWORD = process.env.HOSPES_PASSWORD || 'admin123';
const SERVOS = 3; // servos 1-3 = D3, D5, D6 in hardware/hospes_locks

const state = {
  backend: false, // connected to the Hospes backend feed
  board: null, // { mode, open, ready } from the backend
  openMs: 5000, // how long a door stays open (the backend reports the sketch's value)
  doors: Array(SERVOS).fill(false),
};
// When each door was last seen opening, on this server's clock, so the page can count down,
// and how many openings were seen, so a pressed button knows when the board has confirmed.
const seenOpenAt = [];
const opens = Array(SERVOS).fill(0);
let lastOpenedAt = [];
const pages = new Set();
let token = null;

function snapshot() {
  const doors = state.doors.map((open, i) => ({
    open,
    leftMs: open ? Math.max(0, state.openMs - (Date.now() - (seenOpenAt[i] ?? Date.now()))) : 0,
    opens: opens[i],
  }));
  return { backend: state.backend, board: state.board, openMs: state.openMs, doors };
}

function broadcast() {
  const message = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of pages) res.write(message);
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed (${res.status})`);
  return (await res.json()).token;
}

// Calls the Hospes API as the demo admin, logging in again once if the session expired.
async function hospes(route, options = {}) {
  for (let retried = false; ; retried = true) {
    token ??= await login();
    const res = await fetch(`${API}${route}`, { ...options, headers: { Authorization: `Bearer ${token}` } });
    if (res.status !== 401 || retried) return res;
    token = null;
  }
}

function onStatus({ mode, open, ready, doors = [], openedAt = [], openMs }) {
  state.board = { mode, open, ready };
  state.openMs = openMs || state.openMs;
  for (let i = 0; i < SERVOS; i++) {
    state.doors[i] = Boolean(doors[i]);
    // A new timestamp also comes when an open door is opened again (its timer restarts).
    if (openedAt[i] && openedAt[i] !== lastOpenedAt[i]) {
      seenOpenAt[i] = Date.now();
      opens[i]++;
    }
  }
  lastOpenedAt = openedAt;
  broadcast();
}

function handle(block) {
  const data = block
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .join('\n');
  if (!data) return;
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'status') onStatus(msg.hardware);
  } catch {
    // not JSON: ignore
  }
}

// Follows GET /admin/rfid/stream and reconnects (and logs in again) whenever it drops.
async function follow() {
  for (;;) {
    try {
      const res = await hospes('/admin/rfid/stream');
      if (!res.ok || !res.body) throw new Error(`feed failed (${res.status})`);
      if (!state.backend) console.log('[servo-buttons] connected to', API);
      state.backend = true;
      broadcast();
      const decoder = new TextDecoder();
      let buffer = '';
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          handle(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
        }
      }
      throw new Error('feed closed');
    } catch (err) {
      if (state.backend) console.log('[servo-buttons] lost the Hospes backend:', err.message);
      state.backend = false;
      state.board = null;
      state.doors.fill(false);
      broadcast();
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function reply(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

// POST /open/<n>: asks the Hospes backend to open servo n; it locks again by itself.
async function openServo(n, res) {
  try {
    const r = await hospes(`/admin/locks/${n}/open`, { method: 'POST', signal: AbortSignal.timeout(8000) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return reply(res, r.status, { error: body.error || `Hospes-მა უარი თქვა (${r.status})` });
    console.log(`[servo-buttons] servo ${n}: ${body.hardware}`);
    reply(res, 200, { ok: true, hardware: body.hardware });
  } catch (err) {
    // fetch() throws TypeError when the backend is down; login() throws when the demo admin is missing.
    const down = err instanceof TypeError || err.name === 'TimeoutError';
    reply(res, 502, { error: down ? 'Hospes-ის სერვერი არ პასუხობს (backend, პორტი 4000)' : 'Hospes-ში ადმინად შესვლა ვერ მოხერხდა' });
  }
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    const open = /^\/open\/(\d+)$/.exec(pathname);
    if (open && req.method === 'POST') {
      const n = Number(open[1]);
      if (n < 1 || n > SERVOS) return reply(res, 400, { error: `სერვოს ნომერი 1–${SERVOS}` });
      return openServo(n, res);
    }
    if (pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`retry: 2000\ndata: ${JSON.stringify(snapshot())}\n\n`);
      pages.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 15000);
      req.on('close', () => {
        clearInterval(ping);
        pages.delete(res);
      });
      return;
    }
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(fs.readFileSync(path.join(HERE, 'index.html')));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`Servo buttons: http://localhost:${PORT}`);
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const n of nets || []) {
        if (n.family === 'IPv4' && !n.internal) console.log(`  in the local network: http://${n.address}:${PORT}`);
      }
    }
  });

follow();
