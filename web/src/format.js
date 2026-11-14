import { L } from './prefs.js';

// Language: labels below are getters, so they read the current language when used, not when imported.

// Keep in step with TIMEZONE in backend/.env: the server decides which dates a code is valid on.
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
const MONTHS_KA = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (i) => L(MONTHS_KA[i], MONTHS_EN[i]);

export function fmtDate(dateStr, withYear = false) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${d} ${month(m - 1)}${withYear ? ` ${y}` : ''}`;
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
  return `${Number(p.day)} ${month(Number(p.month) - 1)}, ${p.hour}:${p.minute}`;
}

export function fmtTime(iso) {
  // Like fmtDateTime: an event without a time shows nothing instead of throwing "Invalid time value".
  if (!iso) return '';
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
  return L(`${n} ღამე`, `${n} night${n === 1 ? '' : 's'}`);
}

const status = (ka, en, tone) => ({ get label() { return L(ka, en); }, tone });
export const BOOKING_STATUS = {
  pending: status('გადასახდელი', 'Awaiting payment', 'gold'),
  confirmed: status('დადასტურებული', 'Confirmed', 'blue'),
  checked_in: status('შესახლებული', 'Checked in', 'green'),
  checked_out: status('დასრულებული', 'Completed', 'plain'),
  cancelled: status('გაუქმებული', 'Cancelled', 'red'),
};

export const KEY_TYPE = {
  // The only entry method: the key waits in a key locker box that opens with the booking code.
  box: {
    get label() { return L('გასაღების ლოქერ-ბოქსი', 'Key locker box'); },
    get short() { return L('ლოქერ-ბოქსი', 'Locker box'); },
    icon: 'key',
  },
};

export const VERIFICATION = {
  unverified: status('ვერიფიკაცია გასავლელია', 'Not verified yet', 'gold'),
  verified: status('ვერიფიცირებული', 'Verified', 'green'),
  rejected: status('ვერიფიკაცია ვერ გაიარა', 'Verification failed', 'red'),
};

// Region and town names in English. The Georgian names stay the keys everywhere (filters, URLs);
// placeName() is only for showing them.
const PLACE_EN = {
  'თბილისი': 'Tbilisi',
  'მცხეთა, ყაზბეგი, ხევსურეთი': 'Mtskheta, Kazbegi, Khevsureti',
  'მცხეთა': 'Mtskheta',
  'სტეფანწმინდა': 'Stepantsminda',
  'გუდაური': 'Gudauri',
  'სნო': 'Sno',
  'ჯუთა': 'Juta',
  'ფასანაური': 'Pasanauri',
  'როშკა': 'Roshka',
  'კახეთი': 'Kakheti',
  'თელავი': 'Telavi',
  'სიღნაღი': 'Sighnaghi',
  'წინანდალი': 'Tsinandali',
  'ყვარელი': 'Kvareli',
  'ლაგოდეხი': 'Lagodekhi',
  'თუშეთი': 'Tusheti',
  'ომალო': 'Omalo',
  'დართლო': 'Dartlo',
  'სვანეთი': 'Svaneti',
  'მესტია': 'Mestia',
  'უშგული': 'Ushguli',
  'მაზერი': 'Mazeri',
  'ბეჩო': 'Becho',
  'ლენტეხი': 'Lentekhi',
  'რაჭა': 'Racha',
  'ონი': 'Oni',
  'ამბროლაური': 'Ambrolauri',
  'შოვი': 'Shovi',
  'იმერეთი': 'Imereti',
  'ქუთაისი': 'Kutaisi',
  'საირმე': 'Sairme',
  'სამეგრელო': 'Samegrelo',
  'მარტვილი': 'Martvili',
  'გურია': 'Guria',
  'ბახმარო': 'Bakhmaro',
  'აჭარა': 'Adjara',
  'ბათუმი': 'Batumi',
  'კობულეთი': 'Kobuleti',
  'გოდერძი': 'Goderdzi',
  'ბეშუმი': 'Beshumi',
  'სამცხე-ჯავახეთი': 'Samtskhe-Javakheti',
  'ბორჯომი': 'Borjomi',
  'ბაკურიანი': 'Bakuriani',
  'ასპინძა': 'Aspindza',
  'აბასთუმანი': 'Abastumani',
  'სხვა': 'Other',
};
const PLACE_KA = Object.fromEntries(Object.entries(PLACE_EN).map(([ka, en]) => [en, ka]));
export const placeName = (ka) => L(ka, PLACE_EN[ka] || ka);

// Town or village = first part of the address ("მესტია, ზემო სვანეთი" -> "მესტია"), grouped by tourist region.
// English addresses ("Mestia, Upper Svaneti") map back to the Georgian key.
export const cityOf = (address = '') => {
  const first = address.split(',')[0].trim();
  return PLACE_KA[first] || first;
};
export const REGIONS = [
  ['თბილისი', ['თბილისი']],
  ['მცხეთა, ყაზბეგი, ხევსურეთი', ['მცხეთა', 'სტეფანწმინდა', 'გუდაური', 'სნო', 'ჯუთა', 'ფასანაური', 'როშკა']],
  ['კახეთი', ['თელავი', 'სიღნაღი', 'წინანდალი', 'ყვარელი', 'ლაგოდეხი']],
  ['თუშეთი', ['ომალო', 'დართლო']],
  ['სვანეთი', ['მესტია', 'უშგული', 'მაზერი', 'ბეჩო', 'ლენტეხი']],
  ['რაჭა', ['ონი', 'ამბროლაური', 'შოვი']],
  ['იმერეთი', ['ქუთაისი', 'საირმე']],
  ['სამეგრელო', ['მარტვილი']],
  ['გურია', ['ბახმარო']],
  ['აჭარა', ['ბათუმი', 'კობულეთი', 'გოდერძი', 'ბეშუმი']],
  ['სამცხე-ჯავახეთი', ['ბორჯომი', 'ბაკურიანი', 'ასპინძა', 'აბასთუმანი']],
];

const poiType = (id, ka, en, oneKa, oneEn, icon, color) => ({
  id,
  get label() { return L(ka, en); },
  get one() { return L(oneKa, oneEn); },
  icon,
  color,
});
export const POI_TYPES = [
  poiType('cafe', 'კაფეები', 'Cafés', 'კაფე', 'Café', 'coffee', '#c65a3e'),
  poiType('tour', 'ტურები', 'Tours', 'ტური', 'Tour', 'compass', '#c9922e'),
  poiType('guide', 'გიდები', 'Guides', 'გიდი', 'Guide', 'users', '#7a52b3'),
  poiType('trail', 'სასეირნო და ბილიკები', 'Walks & trails', 'სასეირნო / ბილიკი', 'Walk / trail', 'mountain', '#3d7a4c'),
  poiType('landmark', 'ღირსშესანიშნაობები', 'Landmarks', 'ღირსშესანიშნაობა', 'Landmark', 'landmark', '#7a1f3d'),
];
export const HOTEL_COLOR = '#2563c9';
export const POI_BY_ID = Object.fromEntries(POI_TYPES.map((t) => [t.id, t]));

export const ROLE = {
  get guest() { return L('სტუმარი', 'Guest'); },
  get owner() { return L('მფლობელი', 'Owner'); },
  get admin() { return L('ადმინი', 'Admin'); },
};

// Straight-line distance in km, for "nearby" lists.
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
