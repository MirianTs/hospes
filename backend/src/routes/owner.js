import { Router } from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';
import { describeBooking, findBooking, hasOverlap, listBookings } from '../bookings.js';
import { fail, nowIso, parseStay, toId } from '../util.js';
import { hotelOut } from './public.js';

const router = Router();
const owner = requireRole('owner', 'admin');

// Admins see every hotel; owners only their own.
function hotelIds(user) {
  const rows =
    user.role === 'admin'
      ? db.prepare('SELECT id FROM hotels').all()
      : db.prepare('SELECT id FROM hotels WHERE owner_id = ?').all(user.id);
  return rows.map((r) => r.id);
}

function assertOwnsHotel(user, hotelId) {
  if (!hotelIds(user).includes(hotelId)) fail(403, 'ეს ობიექტი თქვენ არ გეკუთვნით');
}

function roomOf(user, roomId) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
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

// "?,?,?" for an IN (...) list; an empty list becomes IN (NULL), which matches nothing.
const placeholders = (ids) => ids.map(() => '?').join(',') || 'NULL';

router.get('/owner/hotels', owner, (req, res) => {
  const ids = hotelIds(req.user);
  const hotels = db.prepare(`SELECT * FROM hotels WHERE id IN (${placeholders(ids)}) ORDER BY id`).all(...ids);
  const rooms = db.prepare('SELECT * FROM rooms WHERE hotel_id = ? ORDER BY number');
  const services = db.prepare('SELECT * FROM hotel_services WHERE hotel_id = ? AND active = 1 ORDER BY id');
  res.json(
    hotels.map((h) => ({ ...hotelOut(h), checkin_info: h.checkin_info, rooms: rooms.all(h.id), services: services.all(h.id) })),
  );
});

// GET /owner/bookings?hotel_id=
router.get('/owner/bookings', owner, (req, res) => {
  const ids = selectedHotels(req.user, req.query.hotel_id);
  const pending = db.prepare(`SELECT COUNT(*) AS n FROM service_requests WHERE booking_id = ? AND status = 'pending'`);
  res.json(
    listBookings(`h.id IN (${placeholders(ids)})`, ids).map((b) => ({
      ...describeBooking(b),
      pending_requests: pending.get(b.id).n,
    })),
  );
});

// PATCH /rooms/:id  { price?, status?, title? }
router.patch('/rooms/:id', owner, (req, res) => {
  const room = roomOf(req.user, toId(req.params.id));
  const { price, status, title } = req.body || {};
  const next = { ...room };
  if (price !== undefined) {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0 || p > 10000) fail(400, 'ფასი არასწორია');
    next.price = p;
  }
  if (status !== undefined) {
    if (!['available', 'maintenance'].includes(status)) fail(400, 'სტატუსი: available ან maintenance');
    next.status = status;
  }
  if (title !== undefined) next.title = String(title).trim().slice(0, 80) || null;
  db.prepare('UPDATE rooms SET price = ?, status = ?, title = ? WHERE id = ?').run(next.price, next.status, next.title, room.id);
  res.json(db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id));
});

// ---- Extra services (breakfast, cleaning, ...) ----

function serviceOf(user, id) {
  const s = db.prepare('SELECT * FROM hotel_services WHERE id = ? AND active = 1').get(id);
  if (!s) fail(404, 'სერვისი ვერ მოიძებნა');
  assertOwnsHotel(user, s.hotel_id);
  return s;
}

function parseService(body, current = {}) {
  const name = body.name !== undefined ? String(body.name).trim().slice(0, 80) : current.name;
  const price = body.price !== undefined ? Number(body.price) : current.price;
  const description =
    body.description !== undefined ? String(body.description).trim().slice(0, 300) || null : current.description ?? null;
  if (!name) fail(400, 'მიუთითეთ სერვისის სახელი');
  if (!Number.isFinite(price) || price < 0) fail(400, 'ფასი არასწორია');
  return { name, price, description };
}

router.get('/owner/services', owner, (req, res) => {
  const ids = selectedHotels(req.user, req.query.hotel_id);
  res.json(
    db
      .prepare(`SELECT * FROM hotel_services WHERE active = 1 AND hotel_id IN (${placeholders(ids)}) ORDER BY hotel_id, id`)
      .all(...ids),
  );
});

router.post('/owner/services', owner, (req, res) => {
  const hotelId = toId(req.body?.hotel_id);
  assertOwnsHotel(req.user, hotelId);
  const s = parseService(req.body || {});
  const { lastInsertRowid } = db
    .prepare('INSERT INTO hotel_services (hotel_id, name, price, description) VALUES (?, ?, ?, ?)')
    .run(hotelId, s.name, s.price, s.description);
  res.status(201).json(db.prepare('SELECT * FROM hotel_services WHERE id = ?').get(lastInsertRowid));
});

router.patch('/owner/services/:id', owner, (req, res) => {
  const current = serviceOf(req.user, toId(req.params.id));
  const s = parseService(req.body || {}, current);
  db.prepare('UPDATE hotel_services SET name = ?, price = ?, description = ? WHERE id = ?').run(
    s.name,
    s.price,
    s.description,
    current.id,
  );
  res.json(db.prepare('SELECT * FROM hotel_services WHERE id = ?').get(current.id));
});

// Soft delete, so past service requests keep their name and price.
router.delete('/owner/services/:id', owner, (req, res) => {
  const s = serviceOf(req.user, toId(req.params.id));
  db.prepare('UPDATE hotel_services SET active = 0 WHERE id = ?').run(s.id);
  res.json({ ok: true });
});

// ---- Manual blocks for reservations made elsewhere (Booking.com, phone) ----

router.post('/owner/blocks', owner, (req, res) => {
  const { room_id, check_in, check_out } = req.body || {};
  const room = roomOf(req.user, toId(room_id));
  parseStay(check_in, check_out);
  if (hasOverlap(room.id, check_in, check_out)) fail(409, 'ამ თარიღებზე ოთახი უკვე დაკავებულია');
  const note = String(req.body?.note || '').trim().slice(0, 120) || 'Booking.com';
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, status, source, total_price, note)
       VALUES (NULL, ?, ?, ?, 'confirmed', 'external', 0, ?)`,
    )
    .run(room.id, check_in, check_out, note);
  res.status(201).json(describeBooking(findBooking(lastInsertRowid)));
});

router.delete('/owner/blocks/:id', owner, (req, res) => {
  const b = findBooking(toId(req.params.id));
  if (!b || b.source !== 'external') fail(404, 'გარე ჯავშანი ვერ მოიძებნა');
  assertOwnsHotel(req.user, b.hotel_id);
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(b.id);
  res.json({ ok: true });
});

// ---- Guests' service requests ----

router.get('/owner/service-requests', owner, (req, res) => {
  const ids = selectedHotels(req.user, req.query.hotel_id);
  res.json(
    db
      .prepare(
        `SELECT sr.*, s.name AS service_name, s.price AS service_price,
                b.check_in, b.check_out, r.number AS room_number, h.id AS hotel_id, h.name AS hotel_name,
                u.name AS guest_name, u.phone AS guest_phone
         FROM service_requests sr
         JOIN hotel_services s ON s.id = sr.hotel_service_id
         JOIN bookings b ON b.id = sr.booking_id
         JOIN rooms r ON r.id = b.room_id
         JOIN hotels h ON h.id = r.hotel_id
         LEFT JOIN users u ON u.id = b.user_id
         WHERE h.id IN (${placeholders(ids)})
         ORDER BY sr.status = 'done', sr.created_at DESC`,
      )
      .all(...ids),
  );
});

router.patch('/owner/service-requests/:id', owner, (req, res) => {
  const sr = db
    .prepare(
      `SELECT sr.*, r.hotel_id FROM service_requests sr
       JOIN bookings b ON b.id = sr.booking_id JOIN rooms r ON r.id = b.room_id WHERE sr.id = ?`,
    )
    .get(toId(req.params.id));
  if (!sr) fail(404, 'მოთხოვნა ვერ მოიძებნა');
  assertOwnsHotel(req.user, sr.hotel_id);
  const status = req.body?.status;
  if (!['pending', 'done'].includes(status)) fail(400, 'სტატუსი: pending ან done');
  db.prepare('UPDATE service_requests SET status = ?, done_at = ? WHERE id = ?').run(
    status,
    status === 'done' ? nowIso() : null,
    sr.id,
  );
  res.json(db.prepare('SELECT * FROM service_requests WHERE id = ?').get(sr.id));
});

export default router;
