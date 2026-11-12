import { db } from './db.js';
import { fail, nightsBetween, today, withinStay } from './util.js';

// True when another non-cancelled booking holds any night of [checkIn, checkOut).
// Internal bookings and external blocks are checked together; the check-out day itself
// stays free, so a new guest can arrive the day the previous one leaves.
export function hasOverlap(roomId, checkIn, checkOut, excludeBookingId = 0) {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM bookings
         WHERE room_id = ? AND status != 'cancelled' AND id != ?
           AND check_in < ? AND ? < check_out
         LIMIT 1`,
      )
      .get(roomId, excludeBookingId, checkOut, checkIn),
  );
}

const BOOKING_SELECT = `
  SELECT b.*,
         r.number AS room_number, r.title AS room_title, r.key_type, r.lock_id, r.price AS room_price,
         h.id AS hotel_id, h.name AS hotel_name, json_extract(h.photos, '$[0]') AS hotel_photo, h.address AS hotel_address, h.lat, h.lng,
         u.name AS guest_name, u.phone AS guest_phone, u.email AS guest_email,
         u.verification_status AS guest_verification
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  JOIN hotels h ON h.id = r.hotel_id
  LEFT JOIN users u ON u.id = b.user_id`;

export function findBooking(id) {
  return db.prepare(`${BOOKING_SELECT} WHERE b.id = ?`).get(id);
}

export function listBookings(where, params) {
  return db.prepare(`${BOOKING_SELECT} WHERE ${where} ORDER BY b.check_in DESC, b.id DESC`).all(...params);
}

export function serviceRequestsFor(bookingId) {
  return db
    .prepare(
      `SELECT sr.*, s.name AS service_name, s.price AS service_price
       FROM service_requests sr JOIN hotel_services s ON s.id = sr.hotel_service_id
       WHERE sr.booking_id = ? ORDER BY sr.created_at DESC`,
    )
    .all(bookingId);
}

// Adds fields the UI needs to decide what to show.
export function describeBooking(b) {
  const day = today();
  const paid = ['confirmed', 'checked_in', 'checked_out'].includes(b.status);
  return {
    ...b,
    nights: nightsBetween(b.check_in, b.check_out),
    paid,
    within_stay: withinStay(b, day),
    // checked_in stays allowed: the code opens the box again on any later day of the stay (POST /checkin/code).
    can_check_in: ['confirmed', 'checked_in'].includes(b.status) && withinStay(b, day),
    today: day,
  };
}

// The booking must exist and belong to this user.
export function ownBooking(id, user) {
  const b = findBooking(id);
  if (!b || b.user_id !== user.id) fail(404, 'ჯავშანი ვერ მოიძებნა');
  return b;
}

// Common checks before the guest can enter the room.
export function assertCanEnter(b) {
  if (b.status === 'pending') fail(409, 'ჯავშანი ჯერ არ არის გადახდილი');
  if (b.status === 'cancelled') fail(409, 'ჯავშანი გაუქმებულია');
  if (b.status === 'checked_out') fail(409, 'ამ ჯავშანზე უკვე გასული ხართ');
  if (!withinStay(b)) {
    fail(403, `კოდი მოქმედებს მხოლოდ ${b.check_in}-დან ${b.check_out}-მდე`, {
      check_in: b.check_in,
      check_out: b.check_out,
    });
  }
}
