// Card status: a tiny separate site that shows only whether the door is open or locked.
// It changes nothing in Hospes: it follows the Hospes backend's live card-access feed
// (which owns the Arduino) and re-broadcasts the door state to its own page.
// No dependencies; Node 22+ (built-in fetch).
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.CARD_STATUS_PORT) || 5500;
const API = (process.env.HOSPES_API || 'http://localhost:4000/api').replace(/\/$/, '');
// The seeded demo admin (backend/src/seed.js); override for a real setup.
const EMAIL = process.env.HOSPES_EMAIL || 'admin@hospes.test';
const PASSWORD = process.env.HOSPES_PASSWORD || 'admin123';

const state = {
  backend: false, // connected to the Hospes backend feed
  board: null, // { mode, open, ready, reader } from the backend
  doors: [false, false, false, false],
  lastCard: null, // { result: 'allowed' | 'denied', lock_id, at }
};
const pages = new Set();

function broadcast() {
  const message = `data: ${JSON.stringify(state)}\n\n`;
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

function handle(block) {
  const data = block
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .join('\n');
  if (!data) return;
  let msg;
  try {
    msg = JSON.parse(data);
  } catch {
    return;
  }
  if (msg.type === 'status') {
    const { mode, open, ready, reader, doors, log = [] } = msg.hardware;
    // The board's last reader error says why: not found (wiring) or antenna switching off (power).
    const readerError = [...log].reverse().find((l) => /RFID (OK|reader|antenna)/.test(l.line))?.line || '';
    state.board = { mode, open, ready, reader, power: reader === 'missing' && readerError.includes('antenna') };
    state.doors = doors;
    broadcast();
  } else if (msg.type === 'event' && msg.event.kind === 'card') {
    const { result, lock_id, at } = msg.event;
    state.lastCard = { result, lock_id, at };
    broadcast();
  }
}

// Follows GET /admin/rfid/stream and reconnects (and logs in again) whenever it drops.
async function follow() {
  let token = null;
  for (;;) {
    try {
      token ??= await login();
      const res = await fetch(`${API}/admin/rfid/stream`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        token = null;
        throw new Error('session expired');
      }
      if (!res.ok || !res.body) throw new Error(`feed failed (${res.status})`);
      if (!state.backend) console.log('[card-status] connected to', API);
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
      if (state.backend) console.log('[card-status] lost the Hospes backend:', err.message);
      state.backend = false;
      broadcast();
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`retry: 2000\ndata: ${JSON.stringify(state)}\n\n`);
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
    console.log(`Card status: http://localhost:${PORT}`);
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const n of nets || []) {
        if (n.family === 'IPv4' && !n.internal) console.log(`  in the local network: http://${n.address}:${PORT}`);
      }
    }
  });

follow();
