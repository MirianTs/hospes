export const TIMEZONE = 'Asia/Tbilisi';

// Today in Tbilisi as YYYY-MM-DD, built from parts so it doesn't depend on locale data.
export function todayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    new Date(),
  );
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

// Month names are spelled out here because many browsers ship without Georgian locale data
// and would silently fall back to English ("Sep 26").
const MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export function fmtDate(dateStr, withYear = false) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}

export function fmtRange(a, b) {
  return `${fmtDate(a)} – ${fmtDate(b, true)}`;
}

function tbilisiParts(iso) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

export function fmtDateTime(iso) {
  if (!iso) return '';
  const p = tbilisiParts(iso);
  return `${Number(p.day)} ${MONTHS[Number(p.month) - 1]}, ${p.hour}:${p.minute}`;
}

export function fmtTime(iso) {
  const p = tbilisiParts(iso);
  return `${p.hour}:${p.minute}:${p.second}`;
}

// 1250 -> "1 250 ₾", 12.5 -> "12,5 ₾" (Georgian style, without relying on locale data)
export function money(n) {
  const value = Math.round((Number(n) || 0) * 100) / 100;
  const [int, frac] = String(Math.abs(value)).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${value < 0 ? '−' : ''}${grouped}${frac ? `,${frac}` : ''} ₾`;
}

// First letter for an avatar. Georgian stays as is: toUpperCase() would turn it into Mtavruli.
export function initial(name = '') {
  const c = name.trim().charAt(0);
  return /[a-z]/i.test(c) ? c.toUpperCase() : c;
}

export function nightsLabel(n) {
  return `${n} ღამე`;
}

export const BOOKING_STATUS = {
  pending: { label: 'გადასახდელი', tone: 'gold' },
  confirmed: { label: 'დადასტურებული', tone: 'blue' },
  checked_in: { label: 'შესახლებული', tone: 'green' },
  checked_out: { label: 'დასრულებული', tone: 'plain' },
  cancelled: { label: 'გაუქმებული', tone: 'red' },
};

export const KEY_TYPE = {
  box: { label: 'კოდი და გასაღების ყუთი', short: 'კოდით', icon: 'key' },
  smartlock: { label: 'ჭკვიანი საკეტი', short: 'ჭკვიანი საკეტი', icon: 'lock' },
};

export const VERIFICATION = {
  unverified: { label: 'ვერიფიკაცია გასავლელია', tone: 'gold' },
  verified: { label: 'ვერიფიცირებული', tone: 'green' },
  rejected: { label: 'ვერიფიკაცია ვერ გაიარა', tone: 'red' },
};

export const POI_TYPES = [
  { id: 'cafe', label: 'კაფეები', one: 'კაფე', icon: 'coffee', color: '#c65a3e' },
  { id: 'tour', label: 'ტურები', one: 'ტური', icon: 'compass', color: '#c9922e' },
  { id: 'guide', label: 'გიდები', one: 'გიდი', icon: 'users', color: '#4f6aa3' },
  { id: 'trail', label: 'ბილიკები', one: 'ბილიკი', icon: 'mountain', color: '#3d7a4c' },
  { id: 'landmark', label: 'ღირსშესანიშნაობები', one: 'ღირსშესანიშნაობა', icon: 'landmark', color: '#7a1f3d' },
];
export const POI_BY_ID = Object.fromEntries(POI_TYPES.map((t) => [t.id, t]));

export const ROLE = { guest: 'სტუმარი', owner: 'მფლობელი', admin: 'ადმინი' };

// Straight-line distance in km, for "nearby" lists.
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
