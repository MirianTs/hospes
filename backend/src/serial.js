// Bridge to the Arduino Uno that drives the door servos and the RC522 card reader.
// Protocol (9600 baud, one line each): in "OPEN1".."OPEN4"; out READY, RFID OK,
// RFID:<uid>, OPENED<n>, LOCKED<n>, ERR ...
// With ARDUINO_PORT unset the bridge runs in mock mode: commands are logged and
// doors open and lock on a timer, as the real board would.
import { EventEmitter } from 'node:events';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { config } from './config.js';

// Emits "card" (uid), "door" ({ lock, open }) and "status" (state changed).
export const events = new EventEmitter();

export const OPEN_MS = 5000; // same as OPEN_MS in the sketch

const state = {
  mode: config.arduinoPort ? 'serial' : 'mock',
  port: null,
  path: null,
  open: false,
  ready: false,
  reader: null, // 'ok' | 'missing' | null (unknown)
  doors: [false, false, false, false],
  openedAt: [null, null, null, null],
  lastError: null,
  log: [],
};
let reconnectTimer = null;
let readyWaiters = [];
const mockTimers = [];

function remember(line) {
  state.log.push({ at: new Date().toISOString(), line });
  if (state.log.length > 30) state.log.shift();
}

function changed() {
  events.emit('status');
}

// Only a new error is announced, so the 3 s reconnect loop doesn't flood the card access page.
function setError(message) {
  if (state.lastError === message) return;
  state.lastError = message;
  changed();
}

function markReady() {
  state.ready = true;
  readyWaiters.forEach((resolve) => resolve());
  readyWaiters = [];
  changed();
}

function setDoor(lock, open) {
  state.doors[lock - 1] = open;
  state.openedAt[lock - 1] = open ? new Date().toISOString() : null;
  events.emit('door', { lock, open });
  changed();
}

function onLine(line) {
  remember(`< ${line}`);
  console.log('[arduino] <', line);
  if (line.startsWith('READY')) return markReady();
  if (line.startsWith('RFID:')) return events.emit('card', line.slice(5).trim());
  if (line.startsWith('RFID OK')) {
    state.reader = 'ok';
    return changed();
  }
  if (line.startsWith('ERR RFID')) {
    state.reader = 'missing';
    return changed();
  }
  const door = /^(OPENED|LOCKED)([1-4])$/.exec(line);
  if (door) setDoor(Number(door[2]), door[1] === 'OPENED');
}

// Boards whose USB chip is common on Uno originals and clones (USB vendor ids):
// 2341 / 2a03 Arduino, 1a86 WCH CH340, 0403 FTDI, 10c4 Silicon Labs CP210x.
const KNOWN_VENDORS = ['2341', '2a03', '1a86', '0403', '10c4'];

async function resolvePath() {
  if (config.arduinoPort.toLowerCase() !== 'auto') return config.arduinoPort;
  const ports = await SerialPort.list();
  const match = ports.find(
    (p) =>
      KNOWN_VENDORS.includes((p.vendorId || '').toLowerCase()) ||
      /arduino|ch340|wch/i.test(`${p.manufacturer || ''} ${p.friendlyName || ''}`),
  );
  return match?.path || null;
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 3000);
}

export async function connect() {
  if (state.mode === 'mock') {
    console.log('[arduino] ARDUINO_PORT is not set: mock mode (commands are only logged)');
    return;
  }
  const path = await resolvePath().catch(() => null);
  if (!path) {
    setError('Arduino ვერ მოიძებნა');
    return scheduleReconnect();
  }
  const port = new SerialPort({ path, baudRate: config.arduinoBaud, autoOpen: false });
  port.pipe(new ReadlineParser({ delimiter: '\n' })).on('data', (raw) => {
    const line = raw.trim();
    if (line) onLine(line);
  });
  port.on('close', () => {
    state.open = false;
    state.ready = false;
    console.log('[arduino] disconnected, retrying...');
    changed();
    scheduleReconnect();
  });
  port.on('error', (err) => setError(err.message));
  port.open((err) => {
    if (err) {
      if (state.lastError !== err.message) console.log('[arduino] cannot open', path, '-', err.message);
      setError(err.message);
      return scheduleReconnect();
    }
    Object.assign(state, { port, path, open: true, ready: false, reader: null, lastError: null });
    state.doors.fill(false);
    state.openedAt.fill(null);
    console.log('[arduino] connected on', path);
    changed();
    // Opening the port resets the Uno. The sketch prints READY after boot;
    // if an older sketch never does, treat it as ready after 2.5 s.
    setTimeout(() => state.open && !state.ready && markReady(), 2500);
  });
}

function waitUntilReady(ms) {
  if (state.ready) return Promise.resolve();
  return new Promise((resolve) => {
    readyWaiters.push(resolve);
    setTimeout(resolve, ms);
  });
}

// Returns { sent: true } when written to the board, { mock: true } in mock mode,
// or { error } when a board is configured but not connected.
export async function openLock(lockId) {
  const cmd = `OPEN${lockId}`;
  if (state.mode === 'mock') {
    remember(`> ${cmd} (mock)`);
    console.log('[arduino:mock] >', cmd);
    setDoor(lockId, true);
    clearTimeout(mockTimers[lockId]);
    mockTimers[lockId] = setTimeout(() => setDoor(lockId, false), OPEN_MS);
    return { mock: true, command: cmd };
  }
  if (!state.open || !state.port) return { error: 'Arduino არ არის დაკავშირებული', command: cmd };
  await waitUntilReady(3000);
  // The board can be unplugged during that wait; don't report a command as sent to a closed port.
  if (!state.open || !state.port) return { error: 'Arduino არ არის დაკავშირებული', command: cmd };
  state.port.write(`${cmd}\n`);
  remember(`> ${cmd}`);
  console.log('[arduino] >', cmd);
  return { sent: true, command: cmd };
}

export function status() {
  const { mode, path, open, ready, reader, doors, openedAt, lastError, log } = state;
  return { mode, path, open, ready, reader, doors, openedAt, openMs: OPEN_MS, lastError, log: log.slice(-12) };
}

export async function listPorts() {
  try {
    return await SerialPort.list();
  } catch {
    return [];
  }
}
