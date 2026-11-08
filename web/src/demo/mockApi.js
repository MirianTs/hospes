// Browser-only stand-in for the Hospes API, used by the GitHub Pages demo (VITE_STATIC_DEMO=1).
// Same routes, rules, response shapes and messages as backend/src; the data lives in this
// visitor's localStorage and the Arduino is simulated (doors open for 5 s, then lock).
import { HOTELS, POIS, USERS } from './demoData.js';

export const STORE_KEY = 'hospes_demo_v1';
const VERSION = 4; // 2: places all over Georgia; 3: key locker box only, more cottages and sights; 4: Tbilisi places
const TIMEZONE = 'Asia/Tbilisi';
const OPEN_MS = 5000;
const FACE_THRESHOLD = 0.6;

// ---------- helpers (backend/src/util.js) ----------

class Fail extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function fail(status, message, extra) {
  throw new Fail(status, message, extra);
}

function today() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    new Date(),
  );
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const nightsBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

function parseStay(checkIn, checkOut, { allowPast = false } = {}) {
  if (!isDate(checkIn) || !isDate(checkOut)) fail(400, 'თარიღები არასწორია (ფორმატი: YYYY-MM-DD)');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) fail(400, 'გასვლის თარიღი შესვლის თარიღის შემდეგ უნდა იყოს');
  if (nights > 60) fail(400, 'ერთი ჯავშანი მაქსიმუმ 60 ღამეა');
  if (!allowPast && checkIn < today()) fail(400, 'შესვლის თარიღი წარსულშია');
  return nights;
}

const withinStay = (b, day = today()) => day >= b.check_in && day <= b.check_out;
const newAccessCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
const nowIso = () => new Date().toISOString();
const mapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function toId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fail(400, 'არასწორი იდენტიფიკატორი');
}

// Passwords are hashed even here, in case a visitor types a real one.
async function hash(text) {
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`hospes-demo:${text}`));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261; // FNV-1a fallback outside secure contexts
  for (const c of `hospes-demo:${text}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `fnv${(h >>> 0).toString(16)}`;
}

// ---------- store ----------

let db = null;

async function seed() {
  const t = today();
  const s = {
    version: VERSION,
    seq: {},
    users: [],
    hotels: [],
    rooms: [],
    services: [],
    bookings: [],
    requests: [],
    pois: [],
    cards: [],
    events: [],
    settings: { open_any: true },
  };
  const id = (table) => (s.seq[table] = (s.seq[table] || 0) + 1);
  const users = {};
  for (const u of USERS) {
    const row = {
      id: id('users'),
      name: u.name,
      phone: u.phone || null,
      email: u.email,
      password_hash: await hash(u.password),
      role: u.role,
      verification_status: u.verified ? 'verified' : 'unverified',
      id_doc_url: null,
      selfie_url: null,
      face_distance: null,
      verified_at: u.verified ? nowIso() : null,
      created_at: nowIso(),
    };
    s.users.push(row);
    users[u.key] = row.id;
  }
  const rooms = {};
  const services = {};
  for (const h of HOTELS) {
    const hotelId = id('hotels');
    s.hotels.push({
      id: hotelId,
      name: h.name,
      address: h.address,
      lat: h.lat,
      lng: h.lng,
      owner_id: users[h.owner],
      google_rating: h.rating,
      description: h.description,
      photos: h.photos || [],
      checkin_info: h.checkin_info,
      created_at: nowIso(),
    });
    for (const r of h.rooms) {
      const roomId = id('rooms');
      s.rooms.push({
        id: roomId,
        hotel_id: hotelId,
        number: r.number,
        title: r.title,
        capacity: r.capacity,
        price: r.price,
        key_type: r.key_type,
        lock_id: r.lock_id ?? null,
        status: 'available',
      });
      rooms[`${h.key}:${r.number}`] = roomId;
    }
    for (const sv of h.services) {
      const serviceId = id('services');
      s.services.push({ id: serviceId, hotel_id: hotelId, name: sv.name, price: sv.price, description: sv.description, active: 1 });
      services[`${h.key}:${sv.name}`] = serviceId;
    }
  }
  for (const p of POIS) s.pois.push({ id: id('pois'), ...p, google_maps_url: null });

  const booking = (b) => {
    const row = {
      id: id('bookings'),
      user_id: null,
      source: 'internal',
      access_code: null,
      total_price: 0,
      note: null,
      created_at: nowIso(),
      paid_at: null,
      checked_in_at: null,
      checked_out_at: null,
      ...b,
    };
    s.bookings.push(row);
    return row.id;
  };
  // Ready-made bookings so both check-in types can be shown right away.
  const smartStay = booking({
    user_id: users.giorgi,
    room_id: rooms['alazani:102'],
    check_in: t,
    check_out: addDays(t, 2),
    status: 'confirmed',
    access_code: newAccessCode(),
    total_price: 280,
    paid_at: nowIso(),
  });
  booking({
    user_id: users.giorgi,
    room_id: rooms['kvareli:1'],
    check_in: t,
    check_out: addDays(t, 1),
    status: 'confirmed',
    access_code: newAccessCode(),
    total_price: 80,
    paid_at: nowIso(),
  });
  booking({
    user_id: users.giorgi,
    room_id: rooms['tsinandali:A'],
    check_in: addDays(t, -12),
    check_out: addDays(t, -10),
    status: 'checked_out',
    access_code: newAccessCode(),
    total_price: 260,
    paid_at: nowIso(),
    checked_in_at: nowIso(),
    checked_out_at: nowIso(),
  });
  booking({ user_id: users.anna, room_id: rooms['alazani:201'], check_in: addDays(t, 5), check_out: addDays(t, 8), status: 'pending', total_price: 540 });
  booking({ room_id: rooms['alazani:101'], check_in: addDays(t, 3), check_out: addDays(t, 6), status: 'confirmed', source: 'external', note: 'Booking.com #4821' });
  booking({ room_id: rooms['marani:1'], check_in: addDays(t, 1), check_out: addDays(t, 3), status: 'confirmed', source: 'external', note: 'ტელეფონით' });
  s.requests.push({
    id: id('requests'),
    booking_id: smartStay,
    hotel_service_id: services['alazani:საუზმე'],
    status: 'pending',
    note: 'ხვალ 9:00-ზე, 2 ადამიანი',
    created_at: nowIso(),
    done_at: null,
  });
  return s;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    // storage full or blocked: the demo still works until the page is reloaded
  }
}

const ready = (async () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved?.version === VERSION) db = saved;
  } catch {
    // unreadable: start fresh
  }
  if (!db) {
    db = await seed();
    save();
  }
})();

const nextId = (table) => (db.seq[table] = (db.seq[table] || 0) + 1);
const find = (table, id) => db[table].find((row) => row.id === id);

// ---------- users & auth (backend/src/auth.js) ----------

function publicUser(u) {
  if (!u) return null;
  const { password_hash, id_doc_url, selfie_url, ...rest } = u;
  return { ...rest, has_documents: Boolean(id_doc_url && selfie_url) };
}

const tokenFor = (user) => `demo-${user.id}`;

function userFromToken(token) {
  const m = /^demo-(\d+)$/.exec(token || '');
  return m ? find('users', Number(m[1])) || null : null;
}

function auth(ctx) {
  const user = userFromToken(ctx.token);
  if (!user) fail(401, 'საჭიროა ავტორიზაცია');
  return user;
}

function role(ctx, ...roles) {
  const user = auth(ctx);
  if (!roles.includes(user.role)) fail(403, 'ამ მოქმედების უფლება არ გაქვთ');
  return user;
}

// ---------- simulated Arduino (backend/src/serial.js in mock mode) ----------

const hw = { doors: [false, false, false, false], openedAt: [null, null, null, null], log: [], timers: [] };
const listeners = new Set();

function broadcast(message) {
  for (const listener of listeners) {
    try {
      listener(clone(message));
    } catch {
      // a page that went away
    }
  }
}

function hwStatus() {
  return {
    mode: 'mock',
    path: null,
    open: false,
    ready: false,
    reader: null,
    doors: [...hw.doors],
    openedAt: [...hw.openedAt],
    openMs: OPEN_MS,
    lastError: null,
    log: hw.log.slice(-12),
  };
}

const broadcastStatus = () => broadcast({ type: 'status', hardware: hwStatus(), open_any: db.settings.open_any });

function recordEvent({ kind, result, lock_id = null, uid = null, label = null }) {
  const event = { id: nextId('events'), at: nowIso(), kind, result, lock_id, uid, label };
  db.events.push(event);
  if (db.events.length > 200) db.events.splice(0, db.events.length - 200);
  save();
  broadcast({ type: 'event', event });
  return event;
}

function setDoor(lock, open) {
  hw.doors[lock - 1] = open;
  hw.openedAt[lock - 1] = open ? nowIso() : null;
  recordEvent({ kind: 'door', result: open ? 'opened' : 'locked', lock_id: lock });
  broadcastStatus();
}

function openLock(lock) {
  hw.log.push({ at: nowIso(), line: `> OPEN${lock} (mock)` });
  if (hw.log.length > 30) hw.log.shift();
  setDoor(lock, true);
  clearTimeout(hw.timers[lock]);
  hw.timers[lock] = setTimeout(() => setDoor(lock, false), OPEN_MS);
  return { mock: true, command: `OPEN${lock}` };
}

// Live feed used by the card access page (GET /admin/rfid/stream on the real server).
export function subscribe(path, listener) {
  if (path !== '/admin/rfid/stream') return () => {};
  ready.then(() => listener(clone({ type: 'status', hardware: hwStatus(), open_any: db.settings.open_any })));
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------- bookings (backend/src/bookings.js) ----------

function hasOverlap(roomId, checkIn, checkOut, excludeId = 0) {
  return db.bookings.some(
    (b) => b.room_id === roomId && b.status !== 'cancelled' && b.id !== excludeId && b.check_in < checkOut && checkIn < b.check_out,
  );
}

function joinBooking(b) {
  const r = find('rooms', b.room_id);
  const h = find('hotels', r.hotel_id);
  const u = b.user_id ? find('users', b.user_id) : null;
  return {
    ...b,
    room_number: r.number,
    room_title: r.title,
    key_type: r.key_type,
    lock_id: r.lock_id,
    room_price: r.price,
    hotel_id: h.id,
    hotel_name: h.name,
    hotel_address: h.address,
    lat: h.lat,
    lng: h.lng,
    guest_name: u?.name ?? null,
    guest_phone: u?.phone ?? null,
    guest_email: u?.email ?? null,
    guest_verification: u?.verification_status ?? null,
  };
}

function describe(b) {
  const day = today();
  return {
    ...b,
    nights: nightsBetween(b.check_in, b.check_out),
    paid: ['confirmed', 'checked_in', 'checked_out'].includes(b.status),
    within_stay: withinStay(b, day),
    can_check_in: ['confirmed', 'checked_in'].includes(b.status) && withinStay(b, day),
    today: day,
  };
}

const bookingView = (id) => describe(joinBooking(find('bookings', id)));

function listBookings(filter) {
  return db.bookings
    .filter(filter)
    .map(joinBooking)
    .sort((a, b) => b.check_in.localeCompare(a.check_in) || b.id - a.id);
}

function ownBooking(id, user) {
  const b = find('bookings', id);
  if (!b || b.user_id !== user.id) fail(404, 'ჯავშანი ვერ მოიძებნა');
  return joinBooking(b);
}

function assertCanEnter(b) {
  if (b.status === 'pending') fail(409, 'ჯავშანი ჯერ არ არის გადახდილი');
  if (b.status === 'cancelled') fail(409, 'ჯავშანი გაუქმებულია');
  if (b.status === 'checked_out') fail(409, 'ამ ჯავშანზე უკვე გასული ხართ');
  if (!withinStay(b)) {
    fail(403, `კოდი მოქმედებს მხოლოდ ${b.check_in}-დან ${b.check_out}-მდე`, { check_in: b.check_in, check_out: b.check_out });
  }
}

function serviceRequestsFor(bookingId) {
  return db.requests
    .filter((r) => r.booking_id === bookingId)
    .map((r) => {
      const s = find('services', r.hotel_service_id);
      return { ...r, service_name: s.name, service_price: s.price };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const pendingRequests = (bookingId) => db.requests.filter((r) => r.booking_id === bookingId && r.status === 'pending').length;
const activeServices = (hotelId) =>
  db.services.filter((s) => s.hotel_id === hotelId && s.active).map(({ id, name, price, description }) => ({ id, name, price, description }));

function markCheckedIn(b) {
  const row = find('bookings', b.id);
  if (row.status !== 'checked_in') Object.assign(row, { status: 'checked_in', checked_in_at: nowIso() });
  return bookingView(b.id);
}

const checkinInfo = (hotelId) => find('hotels', hotelId)?.checkin_info || null;

// ---------- hotels & POIs (backend/src/routes/public.js) ----------

const POI_TYPES = ['cafe', 'tour', 'guide', 'trail', 'landmark'];

function hotelOut(h) {
  const { checkin_info, ...rest } = h;
  return { ...rest, photos: h.photos || [], google_maps_url: mapsUrl(h.lat, h.lng) };
}

function optionalNumber(value) {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : fail(400, 'ფასის ფილტრი არასწორია');
}

function listHotels(q) {
  const minPrice = optionalNumber(q.min_price);
  const maxPrice = optionalNumber(q.max_price);
  const keyType = ['box', 'smartlock'].includes(q.key_type) ? q.key_type : null;
  const hasStay = Boolean(q.check_in || q.check_out);
  if (hasStay) parseStay(q.check_in, q.check_out);
  const filtered = hasStay || keyType || minPrice !== null || maxPrice !== null;
  const search = String(q.q || '').trim().toLowerCase();
  return [...db.hotels]
    .sort((a, b) => (b.google_rating ?? 0) - (a.google_rating ?? 0) || a.id - b.id)
    .flatMap((h) => {
      if (search && !`${h.name} ${h.address} ${h.description || ''}`.toLowerCase().includes(search)) return [];
      let rooms = db.rooms.filter((r) => r.hotel_id === h.id && r.status === 'available');
      if (keyType) rooms = rooms.filter((r) => r.key_type === keyType);
      if (minPrice !== null) rooms = rooms.filter((r) => r.price >= minPrice);
      if (maxPrice !== null) rooms = rooms.filter((r) => r.price <= maxPrice);
      if (hasStay) rooms = rooms.filter((r) => !hasOverlap(r.id, q.check_in, q.check_out));
      if (filtered && rooms.length === 0) return [];
      return [
        {
          ...hotelOut(h),
          min_price: rooms.length ? Math.min(...rooms.map((r) => r.price)) : null,
          rooms_count: rooms.length,
          key_types: [...new Set(rooms.map((r) => r.key_type))],
          services: db.services.filter((s) => s.hotel_id === h.id && s.active).map((s) => s.name),
        },
      ];
    });
}

function hotelDetail(id, q) {
  const hotel = find('hotels', toId(id));
  if (!hotel) fail(404, 'ობიექტი ვერ მოიძებნა');
  const hasStay = Boolean(q.check_in || q.check_out);
  const nights = hasStay ? parseStay(q.check_in, q.check_out) : null;
  const rooms = db.rooms
    .filter((r) => r.hotel_id === hotel.id)
    .sort((a, b) => a.number.localeCompare(b.number))
    .map((r) => ({
      ...r,
      available: r.status === 'available' && (!hasStay || !hasOverlap(r.id, q.check_in, q.check_out)),
      total_price: nights ? nights * r.price : null,
    }));
  const owner = find('users', hotel.owner_id);
  return { ...hotelOut(hotel), rooms, services: activeServices(hotel.id), host: owner ? { name: owner.name, phone: owner.phone } : null, nights };
}

// ---------- owner helpers (backend/src/routes/owner.js) ----------

const hotelIds = (user) => (user.role === 'admin' ? db.hotels : db.hotels.filter((h) => h.owner_id === user.id)).map((h) => h.id);

function assertOwnsHotel(user, hotelId) {
  if (!hotelIds(user).includes(hotelId)) fail(403, 'ეს ობიექტი თქვენ არ გეკუთვნით');
}

function roomOf(user, roomId) {
  const room = find('rooms', roomId);
  if (!room) fail(404, 'ოთახი ვერ მოიძებნა');
  assertOwnsHotel(user, room.hotel_id);
  return room;
}

function selectedHotels(user, hotelIdParam) {
  const ids = hotelIds(user);
  if (hotelIdParam === undefined || hotelIdParam === '') return ids;
  const id = toId(hotelIdParam);
  if (!ids.includes(id)) fail(403, 'ეს ობიექტი თქვენ არ გეკუთვნით');
  return [id];
}

function serviceOf(user, id) {
  const s = db.services.find((x) => x.id === id && x.active);
  if (!s) fail(404, 'სერვისი ვერ მოიძებნა');
  assertOwnsHotel(user, s.hotel_id);
  return s;
}

function parseService(body, current = {}) {
  const name = body.name !== undefined ? String(body.name).trim().slice(0, 80) : current.name;
  const price = body.price !== undefined ? Number(body.price) : current.price;
  const description = body.description !== undefined ? String(body.description).trim().slice(0, 300) || null : current.description ?? null;
  if (!name) fail(400, 'მიუთითეთ სერვისის სახელი');
  if (!Number.isFinite(price) || price < 0) fail(400, 'ფასი არასწორია');
  return { name, price, description };
}

// ---------- admin helpers (backend/src/routes/admin.js) ----------

function coord(value, min, max, label) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n) || n < min || n > max) fail(400, `${label} არასწორია`);
  return n;
}

function text(value, max, label, required = true) {
  const s = String(value ?? '').trim().slice(0, max);
  if (required && !s) fail(400, `მიუთითეთ: ${label}`);
  return s || null;
}

const normalizeUid = (uid) =>
  String(uid || '')
    .replace(/[^0-9a-f]/gi, '')
    .toUpperCase()
    .slice(0, 20);

async function handleCard(rawUid) {
  const uid = normalizeUid(rawUid);
  if (!uid) return;
  const card = db.cards.find((c) => c.uid === uid);
  const lock = card?.lock_id ?? 1;
  if (!card && !db.settings.open_any) {
    recordEvent({ kind: 'card', result: 'denied', uid, lock_id: lock });
    return;
  }
  recordEvent({ kind: 'card', result: 'allowed', uid, label: card?.label ?? null, lock_id: lock });
  openLock(lock);
}

// ---------- routes ----------

const routes = [];
function route(method, pattern, handler, status = 200) {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  routes.push({ method, regex, keys, handler, status });
}

route('GET', '/config', () => ({ face_verification: 'demo', face_match_threshold: FACE_THRESHOLD }));
route('GET', '/health', () => ({ ok: true, today: today(), hardware: hwStatus() }));

// auth
route(
  'POST',
  '/auth/register',
  async ({ body }) => {
    const { name, phone, email, password } = body;
    if (!name?.trim() || !email?.trim() || !password) fail(400, 'შეავსეთ სახელი, ელფოსტა და პაროლი');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) fail(400, 'ელფოსტის ფორმატი არასწორია');
    if (String(password).length < 6) fail(400, 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) fail(409, 'ეს ელფოსტა უკვე რეგისტრირებულია');
    const user = {
      id: nextId('users'),
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email.trim().toLowerCase(),
      password_hash: await hash(String(password)),
      role: 'guest',
      verification_status: 'unverified',
      id_doc_url: null,
      selfie_url: null,
      face_distance: null,
      verified_at: null,
      created_at: nowIso(),
    };
    db.users.push(user);
    return { token: tokenFor(user), user: publicUser(user) };
  },
  201,
);
route('POST', '/auth/login', async ({ body }) => {
  const email = String(body.email || '').trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user || user.password_hash !== (await hash(String(body.password || '')))) fail(401, 'ელფოსტა ან პაროლი არასწორია');
  return { token: tokenFor(user), user: publicUser(user) };
});
route('GET', '/auth/me', (ctx) => ({ user: publicUser(auth(ctx)) }));
// Demo verification: always succeeds; the photos are not kept.
route('POST', '/auth/verify', (ctx) => {
  const user = auth(ctx);
  const reported = Number(ctx.form?.get?.('distance'));
  const distance = Number.isFinite(reported) && reported >= 0 ? reported : 0.25;
  Object.assign(user, { verification_status: 'verified', face_distance: distance, verified_at: nowIso() });
  return { verified: true, distance, threshold: FACE_THRESHOLD, demo: true, user: publicUser(user) };
});

// public
route('GET', '/hotels', ({ query }) => listHotels(query));
route('GET', '/hotels/:id', ({ params, query }) => hotelDetail(params.id, query));
route('GET', '/rooms/:id/availability', ({ params, query }) => {
  const room = find('rooms', toId(params.id));
  if (!room) fail(404, 'ოთახი ვერ მოიძებნა');
  const t = today();
  const booked = db.bookings
    .filter((b) => b.room_id === room.id && b.status !== 'cancelled' && b.check_out > t)
    .sort((a, b) => a.check_in.localeCompare(b.check_in))
    .map(({ check_in, check_out }) => ({ check_in, check_out }));
  let available = null;
  let nights = null;
  if (query.check_in || query.check_out) {
    nights = parseStay(query.check_in, query.check_out);
    available = room.status === 'available' && !hasOverlap(room.id, query.check_in, query.check_out);
  }
  return { room_id: room.id, status: room.status, price: room.price, booked, available, nights, total_price: nights ? nights * room.price : null };
});
route('GET', '/pois', ({ query }) => {
  const types = String(query.type || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const unknown = types.filter((t) => !POI_TYPES.includes(t));
  if (unknown.length) fail(400, `უცნობი კატეგორია: ${unknown.join(', ')}`, { allowed: POI_TYPES });
  return db.pois
    .filter((p) => !types.length || types.includes(p.type))
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name))
    .map((p) => ({ ...p, google_maps_url: p.google_maps_url || mapsUrl(p.lat, p.lng) }));
});

// guest
route(
  'POST',
  '/bookings',
  (ctx) => {
    const user = auth(ctx);
    const { room_id, check_in, check_out } = ctx.body;
    const room = find('rooms', toId(room_id));
    if (!room) fail(404, 'ოთახი ვერ მოიძებნა');
    if (room.status !== 'available') fail(409, 'ოთახი დროებით მიუწვდომელია');
    const nights = parseStay(check_in, check_out);
    if (hasOverlap(room.id, check_in, check_out)) fail(409, 'ამ თარიღებზე ოთახი უკვე დაკავებულია');
    const booking = {
      id: nextId('bookings'),
      user_id: user.id,
      room_id: room.id,
      check_in,
      check_out,
      status: 'pending',
      source: 'internal',
      access_code: null,
      total_price: nights * room.price,
      note: null,
      created_at: nowIso(),
      paid_at: null,
      checked_in_at: null,
      checked_out_at: null,
    };
    db.bookings.push(booking);
    return bookingView(booking.id);
  },
  201,
);
route('GET', '/bookings/my', (ctx) => {
  const user = auth(ctx);
  return listBookings((b) => b.user_id === user.id).map((b) => ({ ...describe(b), pending_requests: pendingRequests(b.id) }));
});
route('GET', '/bookings/:id', (ctx) => {
  const b = ownBooking(toId(ctx.params.id), auth(ctx));
  return {
    ...describe(b),
    service_requests: serviceRequestsFor(b.id),
    hotel_services: activeServices(b.hotel_id),
    checkin_info: b.status === 'checked_in' && b.key_type === 'box' ? checkinInfo(b.hotel_id) : null,
  };
});
route('POST', '/bookings/:id/pay', (ctx) => {
  const b = ownBooking(toId(ctx.params.id), auth(ctx));
  if (b.status !== 'pending') fail(409, 'ეს ჯავშანი უკვე გადახდილია ან გაუქმებულია');
  Object.assign(find('bookings', b.id), { status: 'confirmed', paid_at: nowIso(), access_code: newAccessCode() });
  return bookingView(b.id);
});
route('POST', '/bookings/:id/cancel', (ctx) => {
  const b = ownBooking(toId(ctx.params.id), auth(ctx));
  if (!['pending', 'confirmed'].includes(b.status)) fail(409, 'ამ ეტაპზე ჯავშნის გაუქმება შეუძლებელია');
  find('bookings', b.id).status = 'cancelled';
  return bookingView(b.id);
});
route('POST', '/bookings/:id/checkout', (ctx) => {
  const b = ownBooking(toId(ctx.params.id), auth(ctx));
  if (b.status !== 'checked_in') fail(409, 'ჩექაუთი მხოლოდ ჩექინის შემდეგაა შესაძლებელი');
  Object.assign(find('bookings', b.id), { status: 'checked_out', checked_out_at: nowIso() });
  return bookingView(b.id);
});
// Same as backend/src/routes/guest.js: code check-in for every room; a Hospes Lock compartment (lock_id) opens too.
route('POST', '/checkin/code', (ctx) => {
  const user = auth(ctx);
  const b = ownBooking(toId(ctx.body.booking_id), user);
  if (user.verification_status !== 'verified') fail(403, 'ჩექინისთვის საჭიროა ვინაობის ვერიფიკაცია', { need: 'verification' });
  assertCanEnter(b);
  if (String(ctx.body.code || '').trim() !== b.access_code) fail(400, 'კოდი არასწორია');
  if (b.lock_id) {
    openLock(b.lock_id);
    recordEvent({ kind: 'app', result: 'opened', lock_id: b.lock_id, label: `${user.name} · ოთახი ${b.room_number}` });
  }
  return {
    ok: true,
    lock_id: b.lock_id ?? null,
    hardware: b.lock_id ? 'mock' : null,
    booking: markCheckedIn(b),
    checkin_info: checkinInfo(b.hotel_id),
  };
});
route('GET', '/bookings/:id/services', (ctx) => serviceRequestsFor(ownBooking(toId(ctx.params.id), auth(ctx)).id));
route(
  'POST',
  '/bookings/:id/services',
  (ctx) => {
    const b = ownBooking(toId(ctx.params.id), auth(ctx));
    if (!['confirmed', 'checked_in'].includes(b.status)) fail(409, 'სერვისის მოთხოვნა შეიძლება მხოლოდ გადახდილ, აქტიურ ჯავშანზე');
    const serviceId = toId(ctx.body.hotel_service_id);
    const service = db.services.find((s) => s.id === serviceId && s.hotel_id === b.hotel_id && s.active);
    if (!service) fail(404, 'ეს სერვისი ამ ობიექტზე არ არის');
    const note = String(ctx.body.note || '').trim().slice(0, 300) || null;
    db.requests.push({ id: nextId('requests'), booking_id: b.id, hotel_service_id: service.id, status: 'pending', note, created_at: nowIso(), done_at: null });
    return serviceRequestsFor(b.id);
  },
  201,
);

// owner
route('GET', '/owner/hotels', (ctx) => {
  const ids = hotelIds(role(ctx, 'owner', 'admin'));
  return db.hotels
    .filter((h) => ids.includes(h.id))
    .map((h) => ({
      ...hotelOut(h),
      checkin_info: h.checkin_info,
      rooms: db.rooms.filter((r) => r.hotel_id === h.id).sort((a, b) => a.number.localeCompare(b.number)),
      services: db.services.filter((s) => s.hotel_id === h.id && s.active),
    }));
});
route('GET', '/owner/bookings', (ctx) => {
  const ids = selectedHotels(role(ctx, 'owner', 'admin'), ctx.query.hotel_id);
  return listBookings((b) => ids.includes(find('rooms', b.room_id).hotel_id)).map((b) => ({ ...describe(b), pending_requests: pendingRequests(b.id) }));
});
route('PATCH', '/rooms/:id', (ctx) => {
  const room = roomOf(role(ctx, 'owner', 'admin'), toId(ctx.params.id));
  const { price, status, title } = ctx.body;
  if (price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0 || p > 10000) fail(400, 'ფასი არასწორია');
    room.price = p;
  }
  if (status !== undefined) {
    if (!['available', 'maintenance'].includes(status)) fail(400, 'სტატუსი: available ან maintenance');
    room.status = status;
  }
  if (title !== undefined) room.title = String(title).trim().slice(0, 80) || null;
  return room;
});
route('GET', '/owner/services', (ctx) => {
  const ids = selectedHotels(role(ctx, 'owner', 'admin'), ctx.query.hotel_id);
  return db.services.filter((s) => s.active && ids.includes(s.hotel_id));
});
route(
  'POST',
  '/owner/services',
  (ctx) => {
    const user = role(ctx, 'owner', 'admin');
    const hotelId = toId(ctx.body.hotel_id);
    assertOwnsHotel(user, hotelId);
    const s = parseService(ctx.body);
    const row = { id: nextId('services'), hotel_id: hotelId, ...s, active: 1 };
    db.services.push(row);
    return row;
  },
  201,
);
route('PATCH', '/owner/services/:id', (ctx) => {
  const current = serviceOf(role(ctx, 'owner', 'admin'), toId(ctx.params.id));
  Object.assign(current, parseService(ctx.body, current));
  return current;
});
route('DELETE', '/owner/services/:id', (ctx) => {
  serviceOf(role(ctx, 'owner', 'admin'), toId(ctx.params.id)).active = 0;
  return { ok: true };
});
route(
  'POST',
  '/owner/blocks',
  (ctx) => {
    const room = roomOf(role(ctx, 'owner', 'admin'), toId(ctx.body.room_id));
    const { check_in, check_out } = ctx.body;
    parseStay(check_in, check_out);
    if (hasOverlap(room.id, check_in, check_out)) fail(409, 'ამ თარიღებზე ოთახი უკვე დაკავებულია');
    const booking = {
      id: nextId('bookings'),
      user_id: null,
      room_id: room.id,
      check_in,
      check_out,
      status: 'confirmed',
      source: 'external',
      access_code: null,
      total_price: 0,
      note: String(ctx.body.note || '').trim().slice(0, 120) || 'Booking.com',
      created_at: nowIso(),
      paid_at: null,
      checked_in_at: null,
      checked_out_at: null,
    };
    db.bookings.push(booking);
    return bookingView(booking.id);
  },
  201,
);
route('DELETE', '/owner/blocks/:id', (ctx) => {
  const user = role(ctx, 'owner', 'admin');
  const row = find('bookings', toId(ctx.params.id));
  if (!row || row.source !== 'external') fail(404, 'გარე ჯავშანი ვერ მოიძებნა');
  assertOwnsHotel(user, find('rooms', row.room_id).hotel_id);
  row.status = 'cancelled';
  return { ok: true };
});
route('GET', '/owner/service-requests', (ctx) => {
  const ids = selectedHotels(role(ctx, 'owner', 'admin'), ctx.query.hotel_id);
  return db.requests
    .map((sr) => {
      const s = find('services', sr.hotel_service_id);
      const b = find('bookings', sr.booking_id);
      const r = find('rooms', b.room_id);
      const h = find('hotels', r.hotel_id);
      const u = b.user_id ? find('users', b.user_id) : null;
      return {
        ...sr,
        service_name: s.name,
        service_price: s.price,
        check_in: b.check_in,
        check_out: b.check_out,
        room_number: r.number,
        hotel_id: h.id,
        hotel_name: h.name,
        guest_name: u?.name ?? null,
        guest_phone: u?.phone ?? null,
      };
    })
    .filter((sr) => ids.includes(sr.hotel_id))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done') || b.created_at.localeCompare(a.created_at));
});
route('PATCH', '/owner/service-requests/:id', (ctx) => {
  const user = role(ctx, 'owner', 'admin');
  const sr = find('requests', toId(ctx.params.id));
  if (!sr) fail(404, 'მოთხოვნა ვერ მოიძებნა');
  assertOwnsHotel(user, find('rooms', find('bookings', sr.booking_id).room_id).hotel_id);
  const { status } = ctx.body;
  if (!['pending', 'done'].includes(status)) fail(400, 'სტატუსი: pending ან done');
  Object.assign(sr, { status, done_at: status === 'done' ? nowIso() : null });
  return sr;
});

// admin
route('GET', '/admin/users', (ctx) => (role(ctx, 'admin'), [...db.users].sort((a, b) => a.id - b.id).map(publicUser)));
route('PATCH', '/admin/users/:id', (ctx) => {
  role(ctx, 'admin');
  const user = find('users', toId(ctx.params.id));
  if (!user) fail(404, 'მომხმარებელი ვერ მოიძებნა');
  const nextRole = ctx.body.role ?? user.role;
  const status = ctx.body.verification_status ?? user.verification_status;
  if (!['guest', 'owner', 'admin'].includes(nextRole)) fail(400, 'როლი არასწორია');
  if (!['unverified', 'verified', 'rejected'].includes(status)) fail(400, 'ვერიფიკაციის სტატუსი არასწორია');
  Object.assign(user, { role: nextRole, verification_status: status });
  return publicUser(user);
});
route(
  'POST',
  '/admin/hotels',
  (ctx) => {
    role(ctx, 'admin');
    const b = ctx.body;
    const ownerId = b.owner_id ? toId(b.owner_id) : null;
    if (ownerId && !db.users.some((u) => u.id === ownerId && u.role === 'owner')) fail(400, 'მფლობელი ვერ მოიძებნა (role = owner)');
    const rating = b.google_rating === undefined || b.google_rating === '' ? null : coord(b.google_rating, 0, 5, 'რეიტინგი');
    const hotel = {
      id: nextId('hotels'),
      name: text(b.name, 80, 'სახელი'),
      address: text(b.address, 160, 'მისამართი'),
      lat: coord(b.lat, -90, 90, 'განედი (lat)'),
      lng: coord(b.lng, -180, 180, 'გრძედი (lng)'),
      owner_id: ownerId,
      google_rating: rating,
      description: text(b.description, 1000, 'აღწერა', false),
      photos: Array.isArray(b.photos) ? b.photos.filter((p) => typeof p === 'string').slice(0, 10) : [],
      checkin_info: text(b.checkin_info, 300, 'ჩექინის ინფორმაცია', false),
      created_at: nowIso(),
    };
    db.hotels.push(hotel);
    return hotelOut(hotel);
  },
  201,
);
route(
  'POST',
  '/admin/rooms',
  (ctx) => {
    role(ctx, 'admin');
    const b = ctx.body;
    const hotelId = toId(b.hotel_id);
    if (!find('hotels', hotelId)) fail(404, 'ობიექტი ვერ მოიძებნა');
    const lockId = b.lock_id ? Number(b.lock_id) : null;
    if (lockId && ![1, 2, 3, 4].includes(lockId)) fail(400, 'Hospes Lock-ის განყოფილება: 1–4');
    if (lockId && db.rooms.some((r) => r.lock_id === lockId)) fail(409, `განყოფილება #${lockId} უკვე სხვა ოთახზეა მიბმული`);
    const number = text(b.number, 20, 'ოთახის ნომერი');
    if (db.rooms.some((r) => r.hotel_id === hotelId && r.number === number)) fail(409, 'ასეთი ნომრის ოთახი ამ ობიექტზე უკვე არსებობს');
    const room = {
      id: nextId('rooms'),
      hotel_id: hotelId,
      number,
      title: text(b.title, 80, 'სათაური', false),
      capacity: Math.max(1, Math.min(12, Number(b.capacity) || 2)),
      price: coord(b.price, 0, 10000, 'ფასი'),
      key_type: 'box',
      lock_id: lockId,
      status: 'available',
    };
    db.rooms.push(room);
    return room;
  },
  201,
);
route(
  'POST',
  '/admin/pois',
  (ctx) => {
    role(ctx, 'admin');
    const b = ctx.body;
    if (!POI_TYPES.includes(b.type)) fail(400, `კატეგორია: ${POI_TYPES.join(', ')}`);
    const poi = {
      id: nextId('pois'),
      type: b.type,
      name: text(b.name, 80, 'სახელი'),
      description: text(b.description, 500, 'აღწერა', false),
      lat: coord(b.lat, -90, 90, 'განედი (lat)'),
      lng: coord(b.lng, -180, 180, 'გრძედი (lng)'),
      google_maps_url: text(b.google_maps_url, 300, 'Google Maps ბმული', false),
    };
    db.pois.push(poi);
    return poi;
  },
  201,
);
route('GET', '/admin/hardware', (ctx) => (role(ctx, 'admin'), { ...hwStatus(), ports: [] }));
route('POST', '/admin/locks/:lockId/open', (ctx) => {
  const user = role(ctx, 'admin');
  const lockId = Number(ctx.params.lockId);
  if (![1, 2, 3, 4].includes(lockId)) fail(400, 'საკეტის ნომერი 1–4');
  openLock(lockId);
  recordEvent({ kind: 'admin', result: 'opened', lock_id: lockId, label: user.name });
  return { ok: true, lock_id: lockId, hardware: 'mock' };
});
route('GET', '/admin/rfid', (ctx) => {
  role(ctx, 'admin');
  return { cards: db.cards, open_any: db.settings.open_any, events: [...db.events].reverse().slice(0, 60), hardware: hwStatus() };
});
route(
  'POST',
  '/admin/rfid/cards',
  (ctx) => {
    role(ctx, 'admin');
    const uid = normalizeUid(ctx.body.uid);
    if (uid.length < 8) fail(400, 'ბარათის ID არასწორია');
    const lockId = Number(ctx.body.lock_id ?? 1);
    if (![1, 2, 3, 4].includes(lockId)) fail(400, 'საკეტის ნომერი 1–4');
    const label = String(ctx.body.label ?? '').trim().slice(0, 60) || null;
    const card = db.cards.find((c) => c.uid === uid);
    if (card) Object.assign(card, { label, lock_id: lockId });
    else db.cards.push({ uid, label, lock_id: lockId, created_at: nowIso() });
    return db.cards;
  },
  201,
);
route('DELETE', '/admin/rfid/cards/:uid', (ctx) => {
  role(ctx, 'admin');
  const uid = normalizeUid(ctx.params.uid);
  db.cards = db.cards.filter((c) => c.uid !== uid);
  return db.cards;
});
route('PATCH', '/admin/rfid/settings', (ctx) => {
  role(ctx, 'admin');
  if (typeof ctx.body.open_any !== 'boolean') fail(400, 'open_any: true ან false');
  db.settings.open_any = ctx.body.open_any;
  broadcastStatus();
  return { open_any: db.settings.open_any };
});
route('POST', '/admin/rfid/simulate', async (ctx) => {
  role(ctx, 'admin');
  const uid = normalizeUid(ctx.body.uid) || 'DE3000AA';
  await handleCard(uid);
  return { ok: true, uid };
});

// ---------- entry point, called by web/src/api.js ----------

export async function request({ method = 'GET', path, body, form, token }) {
  await ready;
  await new Promise((r) => setTimeout(r, 60)); // a little latency, so loading states look real
  const url = new URL(path, 'https://demo.invalid');
  const match = routes
    .filter((r) => r.method === method)
    .map((r) => ({ r, m: r.regex.exec(url.pathname) }))
    .find((x) => x.m);
  try {
    if (!match) fail(404, 'API მარშრუტი ვერ მოიძებნა');
    const params = Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m[i + 1])]));
    const ctx = { params, query: Object.fromEntries(url.searchParams), body: body ?? {}, form, token };
    const data = await match.r.handler(ctx);
    save();
    return { status: match.r.status, data: clone(data) };
  } catch (err) {
    if (err instanceof Fail) return { status: err.status, data: { error: err.message, ...err.extra } };
    console.error('[demo api]', err);
    return { status: 500, data: { error: 'სერვერის შეცდომა' } };
  }
}
