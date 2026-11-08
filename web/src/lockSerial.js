import { useSyncExternalStore } from 'react';

// Hospes Lock straight from the browser (Web Serial, Chrome / Edge on a computer):
// the Arduino with the servos is plugged in by USB, the page sends "OPEN<n>".
// Works with both sketches: hardware/servo-locker (reads the digit) and hardware/hospes_locks.
// Once the user has picked the port, the browser remembers it and we reconnect by ourselves.

export const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

let state = { status: 'off', error: null, lastOpened: null }; // off | connecting | ready
let port = null;
let writer = null;
let readyWait = null;
const subs = new Set();

function set(patch) {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn());
}

async function readLoop(p) {
  const decoder = new TextDecoderStream();
  p.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      if (lines.some((l) => l.startsWith('READY'))) readyWait?.();
    }
  } catch {
    // unplugged
  }
  if (port === p) {
    port = null;
    writer = null;
    set({ status: 'off' });
  }
}

async function attach(p) {
  set({ status: 'connecting', error: null });
  try {
    await p.open({ baudRate: 9600 });
  } catch (e) {
    set({ status: 'off', error: 'პორტი დაკავებულია: დახურე Arduino IDE-ის Serial Monitor ან სხვა ფანჯარა.' });
    throw e;
  }
  port = p;
  writer = p.writable.getWriter();
  // Opening the port restarts the Uno; it prints READY when it's up. Don't wait forever.
  const ready = new Promise((resolve) => {
    readyWait = resolve;
  });
  readLoop(p);
  await Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]);
  readyWait = null;
  set({ status: 'ready' });
}

// Ask the user to pick the Arduino (needs a click).
export async function connectLock() {
  if (!serialSupported || port) return;
  let p;
  try {
    p = await navigator.serial.requestPort();
  } catch {
    return; // closed the picker
  }
  await attach(p).catch(() => {});
}

// Reconnect to a port the user already allowed, without asking.
export async function reconnectLock() {
  if (!serialSupported || port || state.status === 'connecting') return;
  const [p] = await navigator.serial.getPorts();
  if (p) await attach(p).catch(() => {});
}

// true when the command went to the board.
export async function openCompartment(n) {
  if (!writer || !n) return false;
  try {
    await writer.write(new TextEncoder().encode(`OPEN${n}\n`));
    set({ lastOpened: n });
    return true;
  } catch {
    return false;
  }
}

export function useLock() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => state,
  );
}

if (serialSupported) {
  navigator.serial.addEventListener('connect', () => reconnectLock());
}
