// Card access: decides whether a tapped RFID card opens a door, and keeps the access log
// that the admin "card access" page follows live.
import { db } from './db.js';
import * as serial from './serial.js';

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function broadcast(message) {
  for (const listener of listeners) {
    try {
      listener(message);
    } catch {
      // a closed connection; its cleanup removes it
    }
  }
}

export function recordEvent({ kind, result, lock_id = null, uid = null, label = null }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO access_events (kind, result, lock_id, uid, label) VALUES (?, ?, ?, ?, ?)')
    .run(kind, result, lock_id, uid, label);
  const event = db.prepare('SELECT * FROM access_events WHERE id = ?').get(lastInsertRowid);
  broadcast({ type: 'event', event });
  return event;
}

export function recentEvents(limit = 60) {
  return db.prepare('SELECT * FROM access_events ORDER BY id DESC LIMIT ?').all(limit);
}

export const normalizeUid = (uid) =>
  String(uid || '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .slice(0, 20);

export function listCards() {
  return db.prepare('SELECT * FROM rfid_cards ORDER BY created_at').all();
}

export function saveCard({ uid, label, lock_id }) {
  db.prepare(
    `INSERT INTO rfid_cards (uid, label, lock_id) VALUES (?, ?, ?)
     ON CONFLICT (uid) DO UPDATE SET label = excluded.label, lock_id = excluded.lock_id`,
  ).run(uid, label, lock_id);
  return listCards();
}

export function deleteCard(uid) {
  db.prepare('DELETE FROM rfid_cards WHERE uid = ?').run(uid);
  return listCards();
}

// "Open for any card" is on until someone switches to registered cards only.
export function openAny() {
  return (db.prepare(`SELECT value FROM settings WHERE key = 'rfid_open_any'`).get()?.value ?? '1') === '1';
}

export function setOpenAny(on) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('rfid_open_any', ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
  ).run(on ? '1' : '0');
  broadcastStatus();
}

export function broadcastStatus() {
  broadcast({ type: 'status', hardware: serial.status(), open_any: openAny() });
}

// A tapped card opens its registered compartment; an unregistered card opens compartment 1,
// but only while "open for any card" is on. Every tap is logged, allowed or denied.
export async function handleCard(rawUid) {
  const uid = normalizeUid(rawUid);
  if (!uid) return;
  const card = db.prepare('SELECT * FROM rfid_cards WHERE uid = ?').get(uid);
  const lock = card?.lock_id ?? 1;
  if (!card && !openAny()) {
    recordEvent({ kind: 'card', result: 'denied', uid, lock_id: lock });
    return;
  }
  recordEvent({ kind: 'card', result: 'allowed', uid, label: card?.label ?? null, lock_id: lock });
  const res = await serial.openLock(lock);
  if (res.error) recordEvent({ kind: 'error', result: 'failed', lock_id: lock, label: res.error });
}

export function handleDoor({ lock, open }) {
  recordEvent({ kind: 'door', result: open ? 'opened' : 'locked', lock_id: lock });
}
