import { useSyncExternalStore } from 'react';
import { L } from './prefs.js';

// Hospes Lock straight from the browser (Web Serial, Chrome / Edge on a computer):
// the Arduino with the servos is plugged in by USB, the page sends "OPEN<n>".
// Works with both sketches: hardware/servo-locker (reads the digit) and hardware/hospes_locks.
// Once the user has picked the port, the browser remembers it and we reconnect by ourselves.

export const serialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

let state = { status: 'off', error: null, lastOpened: null }; // off | connecting | ready
let port = null;
let writer = null;
let reader = null;
let readyWait = null;
let confirmWait = null; // { n, resolve } while waiting for the board to answer OPEN<n>
const subs = new Set();

// USB-serial chips used on Arduino boards: Arduino, FTDI (FT232R), CH340, CP210x.
// The picker is not filtered: on Windows a board on the FTDI driver (FTDIBUS) reports no USB ids,
// so a filter would hide it. For reconnecting we skip Bluetooth ports and prefer known chips.
const ARDUINO_VENDORS = [0x2341, 0x2a03, 0x0403, 0x1a86, 0x10c4];
const portScore = (p) => {
  const info = p.getInfo();
  if (info.bluetoothServiceClassId) return 0;
  return ARDUINO_VENDORS.includes(info.usbVendorId) ? 2 : 1;
};
// servo-locker answers "OPEN <n>", hospes_locks answers "OPENED<n>".
const confirms = (line, n) => new RegExp(`^OPEN(ED)? ?${n}$`).test(line.trim());

function set(patch) {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn());
}

async function readLoop(p) {
  const decoder = new TextDecoderStream();
  p.readable.pipeTo(decoder.writable).catch(() => {});
  reader = decoder.readable.getReader();
  let buf = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      if (lines.some((l) => l.includes('READY'))) readyWait?.();
      if (confirmWait && lines.some((l) => confirms(l, confirmWait.n))) confirmWait.resolve(true);
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
    set({ status: 'off', error: L(
        'პორტი დაკავებულია: დახურე Arduino IDE-ის Serial Monitor ან სხვა ფანჯარა.',
        'The port is busy: close the Arduino IDE Serial Monitor or any other window using it.'
      ),
    });
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
  // getPorts() rejects when a permissions policy blocks Web Serial; treat that as "no saved port".
  const ports = await navigator.serial.getPorts().catch(() => []);
  const [p] = ports.filter((x) => portScore(x) > 0).sort((a, b) => portScore(b) - portScore(a));
  if (p) await attach(p).catch(() => {});
}

// Let go of the port (e.g. it turned out to be the wrong one) so the user can pick again.
async function release() {
  const p = port;
  port = null;
  try {
    await reader?.cancel();
    writer?.releaseLock();
    await p?.close();
  } catch {
    // already closed
  }
  writer = null;
}

// true when the board confirmed the compartment opened; 'noreply' when the command went out but the
// board didn't answer (wrong port or old sketch); false when no board is connected.
export async function openCompartment(n) {
  if (!writer || !n) return false;
  const confirmed = new Promise((resolve) => {
    confirmWait = { n, resolve };
    setTimeout(() => resolve(false), 2000);
  });
  try {
    await writer.write(new TextEncoder().encode(`OPEN${n}\n`));
  } catch {
    confirmWait = null;
    return false;
  }
  const ok = await confirmed;
  confirmWait = null;
  if (ok) {
    set({ lastOpened: n });
    return true;
  }
  await release();
  set({
    status: 'off',
    error: L(
      'Arduino-მ არ უპასუხა: ალბათ სხვა პორტი იყო არჩეული. ხელახლა მიაერთე და აირჩიე Arduino-ს პორტი.',
      "The Arduino didn't answer: probably another port was picked. Connect again and choose the Arduino's port."
    ),
  });
  return 'noreply';
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
