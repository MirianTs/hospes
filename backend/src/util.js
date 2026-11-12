import crypto from 'node:crypto';
import { config } from './config.js';

// An error with an HTTP status. Route handlers throw it (usually through fail());
// the error handler in server.js sends it as { error: message, ...extra }.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function fail(status, message, extra) {
  throw new HttpError(status, message, extra);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Today's date (YYYY-MM-DD) in the hotel's timezone, not the server's.
export function today() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

// Validates a stay and returns its number of nights.
export function parseStay(checkIn, checkOut, { allowPast = false } = {}) {
  if (!isDate(checkIn) || !isDate(checkOut)) fail(400, 'თარიღები არასწორია (ფორმატი: YYYY-MM-DD)');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) fail(400, 'გასვლის თარიღი შესვლის თარიღის შემდეგ უნდა იყოს');
  if (nights > 60) fail(400, 'ერთი ჯავშანი მაქსიმუმ 60 ღამეა');
  if (!allowPast && checkIn < today()) fail(400, 'შესვლის თარიღი წარსულშია');
  return nights;
}

// The access code works from the check-in day through the check-out day.
export function withinStay(booking, day = today()) {
  return day >= booking.check_in && day <= booking.check_out;
}

export function newAccessCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export const nowIso = () => new Date().toISOString();

export function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fail(400, 'არასწორი იდენტიფიკატორი');
}

export function mapsUrl(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
