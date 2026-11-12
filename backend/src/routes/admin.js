import { Router } from 'express';
import { db } from '../db.js';
import { publicUser, requireRole } from '../auth.js';
import * as serial from '../serial.js';
import * as access from '../access.js';
import { fail, toId } from '../util.js';
import { hotelOut, POI_TYPES } from './public.js';

// New hotels, rooms and POIs are added only by an admin.
const router = Router();
router.use(requireRole('admin'));

function coord(value, min, max, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(400, `${label} არასწორია`);
  return n;
}

function text(value, max, label, required = true) {
  const s = String(value ?? '').trim().slice(0, max);
  if (required && !s) fail(400, `მიუთითეთ: ${label}`);
  return s || null;
}

router.get('/users', (req, res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map(publicUser));
});

// PATCH /admin/users/:id { role?, verification_status? } (e.g. verify a guest manually during the demo)
router.patch('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(toId(req.params.id));
  if (!user) fail(404, 'მომხმარებელი ვერ მოიძებნა');
  const role = req.body?.role ?? user.role;
  const status = req.body?.verification_status ?? user.verification_status;
  if (!['guest', 'owner', 'admin'].includes(role)) fail(400, 'როლი არასწორია');
  if (!['unverified', 'verified', 'rejected'].includes(status)) fail(400, 'ვერიფიკაციის სტატუსი არასწორია');
  db.prepare('UPDATE users SET role = ?, verification_status = ? WHERE id = ?').run(role, status, user.id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)));
});

// Every new place starts with rooms 1–3, each in its own Hospes Lock compartment; the owner sets prices later.
const DEFAULT_ROOMS = [
  { number: '1', title: 'ორადგილიანი', capacity: 2, price: 100, lock_id: 1 },
  { number: '2', title: 'სამადგილიანი', capacity: 3, price: 120, lock_id: 2 },
  { number: '3', title: 'საოჯახო ოთახი', capacity: 4, price: 150, lock_id: 3 },
];

router.post('/hotels', (req, res) => {
  const b = req.body || {};
  const ownerId = b.owner_id ? toId(b.owner_id) : null;
  if (ownerId && !db.prepare(`SELECT 1 FROM users WHERE id = ? AND role = 'owner'`).get(ownerId)) {
    fail(400, 'მფლობელი ვერ მოიძებნა (role = owner)');
  }
  const rating = b.google_rating === undefined || b.google_rating === '' ? null : coord(b.google_rating, 0, 5, 'რეიტინგი');
  const photos = Array.isArray(b.photos) ? b.photos.filter((p) => typeof p === 'string').slice(0, 10) : [];
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO hotels (name, address, lat, lng, owner_id, google_rating, description, photos, checkin_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      text(b.name, 80, 'სახელი'),
      text(b.address, 160, 'მისამართი'),
      coord(b.lat, -90, 90, 'განედი (lat)'),
      coord(b.lng, -180, 180, 'გრძედი (lng)'),
      ownerId,
      rating,
      text(b.description, 1000, 'აღწერა', false),
      JSON.stringify(photos),
      text(b.checkin_info, 300, 'ჩექინის ინფორმაცია', false),
    );
  const addRoom = db.prepare(
    `INSERT INTO rooms (hotel_id, number, title, capacity, price, key_type, lock_id) VALUES (?, ?, ?, ?, ?, 'box', ?)`,
  );
  for (const r of DEFAULT_ROOMS) addRoom.run(lastInsertRowid, r.number, r.title, r.capacity, r.price, r.lock_id);
  res.status(201).json(hotelOut(db.prepare('SELECT * FROM hotels WHERE id = ?').get(lastInsertRowid)));
});

router.post('/rooms', (req, res) => {
  const b = req.body || {};
  const hotelId = toId(b.hotel_id);
  if (!db.prepare('SELECT 1 FROM hotels WHERE id = ?').get(hotelId)) fail(404, 'ობიექტი ვერ მოიძებნა');
  // Keys are always in a key locker box; lock_id = optional Hospes Lock compartment (servo 1–3; 4 is the key return).
  const keyType = 'box';
  const lockId = b.lock_id ? Number(b.lock_id) : null;
  if (lockId && ![1, 2, 3].includes(lockId)) fail(400, 'Hospes Lock-ის განყოფილება: 1–3 (#4 გასაღების დასაბრუნებელია)');
  if (lockId && db.prepare('SELECT 1 FROM rooms WHERE hotel_id = ? AND lock_id = ?').get(hotelId, lockId)) {
    fail(409, `განყოფილება #${lockId} ამ ობიექტზე უკვე სხვა ოთახზეა მიბმული`);
  }
  const number = text(b.number, 20, 'ოთახის ნომერი');
  if (db.prepare('SELECT 1 FROM rooms WHERE hotel_id = ? AND number = ?').get(hotelId, number)) {
    fail(409, 'ასეთი ნომრის ოთახი ამ ობიექტზე უკვე არსებობს');
  }
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO rooms (hotel_id, number, title, capacity, price, key_type, lock_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      hotelId,
      number,
      text(b.title, 80, 'სათაური', false),
      Math.max(1, Math.min(12, Number(b.capacity) || 2)),
      coord(b.price, 0, 10000, 'ფასი'),
      keyType,
      lockId,
    );
  res.status(201).json(db.prepare('SELECT * FROM rooms WHERE id = ?').get(lastInsertRowid));
});

router.post('/pois', (req, res) => {
  const b = req.body || {};
  if (!POI_TYPES.includes(b.type)) fail(400, `კატეგორია: ${POI_TYPES.join(', ')}`);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO pois (type, name, description, lat, lng, google_maps_url) VALUES (?, ?, ?, ?, ?, ?)')
    .run(
      b.type,
      text(b.name, 80, 'სახელი'),
      text(b.description, 500, 'აღწერა', false),
      coord(b.lat, -90, 90, 'განედი (lat)'),
      coord(b.lng, -180, 180, 'გრძედი (lng)'),
      text(b.google_maps_url, 300, 'Google Maps ბმული', false),
    );
  res.status(201).json(db.prepare('SELECT * FROM pois WHERE id = ?').get(lastInsertRowid));
});

// Hardware check before the demo: connection state, last serial lines, available COM ports.
router.get('/hardware', async (req, res) => {
  res.json({ ...serial.status(), ports: await serial.listPorts() });
});

// Test a servo without a booking.
router.post('/locks/:lockId/open', async (req, res) => {
  const lockId = Number(req.params.lockId);
  if (![1, 2, 3, 4].includes(lockId)) fail(400, 'საკეტის ნომერი 1–4');
  const result = await serial.openLock(lockId);
  if (result.error) fail(503, result.error);
  access.recordEvent({ kind: 'admin', result: 'opened', lock_id: lockId, label: req.user.name });
  res.json({ ok: true, lock_id: lockId, hardware: result.mock ? 'mock' : 'sent' });
});

// ---- Card access (RC522) ----

function rfidState() {
  return {
    cards: access.listCards(),
    open_any: access.openAny(),
    events: access.recentEvents(),
    hardware: serial.status(),
  };
}

router.get('/rfid', (req, res) => {
  res.json(rfidState());
});

// Live feed for the card access page (server-sent events).
router.get('/rfid/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  const send = (message) => res.write(`data: ${JSON.stringify(message)}\n\n`);
  send({ type: 'status', hardware: serial.status(), open_any: access.openAny() });
  const unsubscribe = access.subscribe(send);
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

router.post('/rfid/cards', (req, res) => {
  // Hex UID as the RC522 reports it: at least 4 bytes (8 hex digits).
  const uid = access.normalizeUid(req.body?.uid);
  if (uid.length < 8) fail(400, 'ბარათის ID არასწორია');
  const lockId = Number(req.body?.lock_id ?? 1);
  if (![1, 2, 3, 4].includes(lockId)) fail(400, 'საკეტის ნომერი 1–4');
  const label = String(req.body?.label ?? '').trim().slice(0, 60) || null;
  res.status(201).json(access.saveCard({ uid, label, lock_id: lockId }));
});

router.delete('/rfid/cards/:uid', (req, res) => {
  res.json(access.deleteCard(access.normalizeUid(req.params.uid)));
});

router.patch('/rfid/settings', (req, res) => {
  if (typeof req.body?.open_any !== 'boolean') fail(400, 'open_any: true ან false');
  access.setOpenAny(req.body.open_any);
  res.json({ open_any: access.openAny() });
});

// Pretend a card was tapped: same path as a real tap (for testing without a reader).
router.post('/rfid/simulate', async (req, res) => {
  const uid = access.normalizeUid(req.body?.uid) || 'DE3000AA';
  await access.handleCard(uid);
  res.json({ ok: true, uid });
});

export default router;
