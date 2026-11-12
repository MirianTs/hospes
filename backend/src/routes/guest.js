import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';
import * as serial from '../serial.js';
import * as access from '../access.js';
import {
  assertCanEnter,
  describeBooking,
  findBooking,
  hasOverlap,
  listBookings,
  ownBooking,
  serviceRequestsFor,
} from '../bookings.js';
import { fail, newAccessCode, nowIso, parseStay, toId } from '../util.js';

const router = Router();

// Entering the code again on a later day keeps the first checked_in_at.
function markCheckedIn(b) {
  if (b.status !== 'checked_in') {
    db.prepare(`UPDATE bookings SET status = 'checked_in', checked_in_at = ? WHERE id = ?`).run(nowIso(), b.id);
  }
  return describeBooking(findBooking(b.id));
}

function hotelCheckinInfo(hotelId) {
  return db.prepare('SELECT checkin_info FROM hotels WHERE id = ?').get(hotelId)?.checkin_info || null;
}

router.post('/bookings', requireAuth, (req, res) => {
  const { room_id, check_in, check_out } = req.body || {};
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(toId(room_id));
  if (!room) fail(404, 'ოთახი ვერ მოიძებნა');
  if (room.status !== 'available') fail(409, 'ოთახი დროებით მიუწვდომელია');
  const nights = parseStay(check_in, check_out);
  if (hasOverlap(room.id, check_in, check_out)) fail(409, 'ამ თარიღებზე ოთახი უკვე დაკავებულია');

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO bookings (user_id, room_id, check_in, check_out, status, source, total_price)
       VALUES (?, ?, ?, ?, 'pending', 'internal', ?)`,
    )
    .run(req.user.id, room.id, check_in, check_out, nights * room.price);
  res.status(201).json(describeBooking(findBooking(lastInsertRowid)));
});

router.get('/bookings/my', requireAuth, (req, res) => {
  const pending = db.prepare(
    `SELECT COUNT(*) AS n FROM service_requests WHERE booking_id = ? AND status = 'pending'`,
  );
  res.json(
    listBookings('b.user_id = ?', [req.user.id]).map((b) => ({
      ...describeBooking(b),
      pending_requests: pending.get(b.id).n,
    })),
  );
});

router.get('/bookings/:id', requireAuth, (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  const services = db
    .prepare('SELECT id, name, price, description FROM hotel_services WHERE hotel_id = ? AND active = 1 ORDER BY id')
    .all(b.hotel_id);
  res.json({
    ...describeBooking(b),
    service_requests: serviceRequestsFor(b.id),
    hotel_services: services,
    // Where the key box is: only for key-box rooms, and only once checked in.
    checkin_info: b.status === 'checked_in' && b.key_type === 'box' ? hotelCheckinInfo(b.hotel_id) : null,
  });
});

// Mock payment: no card data reaches the server. Paying confirms the booking and issues the access code.
router.post('/bookings/:id/pay', requireAuth, (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  if (b.status !== 'pending') fail(409, 'ეს ჯავშანი უკვე გადახდილია ან გაუქმებულია');
  db.prepare(`UPDATE bookings SET status = 'confirmed', paid_at = ?, access_code = ? WHERE id = ?`).run(
    nowIso(),
    newAccessCode(),
    b.id,
  );
  res.json(describeBooking(findBooking(b.id)));
});

router.post('/bookings/:id/cancel', requireAuth, (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  if (!['pending', 'confirmed'].includes(b.status)) fail(409, 'ამ ეტაპზე ჯავშნის გაუქმება შეუძლებელია');
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(b.id);
  res.json(describeBooking(findBooking(b.id)));
});

// Check-out: the guest drops the room key into the return compartment (servo 4), which opens for it.
export const RETURN_LOCK = 4;
router.post('/bookings/:id/checkout', requireAuth, async (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  if (b.status !== 'checked_in') fail(409, 'ჩექაუთი მხოლოდ ჩექინის შემდეგაა შესაძლებელი');
  const result = await serial.openLock(RETURN_LOCK);
  if (result.error) fail(503, result.error);
  access.recordEvent({ kind: 'app', result: 'opened', lock_id: RETURN_LOCK, label: `${req.user.name} · ჩექაუთი, ოთახი ${b.room_number}` });
  db.prepare(`UPDATE bookings SET status = 'checked_out', checked_out_at = ? WHERE id = ?`).run(nowIso(), b.id);
  res.json({ ...describeBooking(findBooking(b.id)), return_lock: RETURN_LOCK, hardware: result.mock ? 'mock' : 'sent' });
});

// Every room's key sits in a key locker box. Verified guest + active booking + right code -> check-in.
// When the key is in a Hospes Lock compartment (rooms.lock_id), the code also sends "OPEN<lock_id>" to the Arduino.
router.post('/checkin/code', requireAuth, async (req, res) => {
  const { booking_id, code } = req.body || {};
  const b = ownBooking(toId(booking_id), req.user);
  if (req.user.verification_status !== 'verified') {
    fail(403, 'ჩექინისთვის საჭიროა ვინაობის ვერიფიკაცია', { need: 'verification' });
  }
  assertCanEnter(b);
  if (String(code || '').trim() !== b.access_code) fail(400, 'კოდი არასწორია');
  let hardware = null;
  if (b.lock_id) {
    const result = await serial.openLock(b.lock_id);
    if (result.error) fail(503, result.error);
    access.recordEvent({ kind: 'app', result: 'opened', lock_id: b.lock_id, label: `${req.user.name} · ოთახი ${b.room_number}` });
    hardware = result.mock ? 'mock' : 'sent';
  }
  res.json({ ok: true, lock_id: b.lock_id ?? null, hardware, booking: markCheckedIn(b), checkin_info: hotelCheckinInfo(b.hotel_id) });
});

router.get('/bookings/:id/services', requireAuth, (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  res.json(serviceRequestsFor(b.id));
});

router.post('/bookings/:id/services', requireAuth, (req, res) => {
  const b = ownBooking(toId(req.params.id), req.user);
  if (!['confirmed', 'checked_in'].includes(b.status)) {
    fail(409, 'სერვისის მოთხოვნა შეიძლება მხოლოდ გადახდილ, აქტიურ ჯავშანზე');
  }
  const service = db
    .prepare('SELECT * FROM hotel_services WHERE id = ? AND hotel_id = ? AND active = 1')
    .get(toId(req.body?.hotel_service_id), b.hotel_id);
  if (!service) fail(404, 'ეს სერვისი ამ ობიექტზე არ არის');
  const note = String(req.body?.note || '').trim().slice(0, 300) || null;
  db.prepare('INSERT INTO service_requests (booking_id, hotel_service_id, note) VALUES (?, ?, ?)').run(
    b.id,
    service.id,
    note,
  );
  res.status(201).json(serviceRequestsFor(b.id));
});

export default router;
