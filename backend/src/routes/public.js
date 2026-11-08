import { Router } from 'express';
import { db } from '../db.js';
import { hasOverlap } from '../bookings.js';
import { fail, mapsUrl, parseJson, parseStay, toId, today } from '../util.js';

const router = Router();

export const POI_TYPES = ['cafe', 'tour', 'guide', 'trail', 'landmark'];

// checkin_info (where the key box is) is only revealed at check-in.
export function hotelOut(h) {
  const { checkin_info, ...rest } = h;
  return { ...rest, photos: parseJson(h.photos, []), google_maps_url: mapsUrl(h.lat, h.lng) };
}

function optionalNumber(value) {
  if (value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : fail(400, 'ფასის ფილტრი არასწორია');
}

// GET /hotels?q=&min_price=&max_price=&check_in=&check_out=
router.get('/hotels', (req, res) => {
  const { q, check_in, check_out } = req.query;
  const minPrice = optionalNumber(req.query.min_price);
  const maxPrice = optionalNumber(req.query.max_price);
  const keyType = ['box', 'smartlock'].includes(req.query.key_type) ? req.query.key_type : null;
  const hasStay = Boolean(check_in || check_out);
  if (hasStay) parseStay(check_in, check_out);
  const filtered = hasStay || keyType || minPrice !== null || maxPrice !== null;
  const search = String(q || '').trim().toLowerCase();

  const roomsByHotel = new Map();
  for (const r of db.prepare(`SELECT * FROM rooms WHERE status = 'available'`).all()) {
    if (!roomsByHotel.has(r.hotel_id)) roomsByHotel.set(r.hotel_id, []);
    roomsByHotel.get(r.hotel_id).push(r);
  }
  const servicesStmt = db.prepare('SELECT name FROM hotel_services WHERE hotel_id = ? AND active = 1 ORDER BY id');

  const result = [];
  for (const h of db.prepare('SELECT * FROM hotels ORDER BY google_rating DESC, id').all()) {
    if (search && !`${h.name} ${h.address} ${h.description || ''}`.toLowerCase().includes(search)) continue;
    let rooms = roomsByHotel.get(h.id) || [];
    if (keyType) rooms = rooms.filter((r) => r.key_type === keyType);
    if (minPrice !== null) rooms = rooms.filter((r) => r.price >= minPrice);
    if (maxPrice !== null) rooms = rooms.filter((r) => r.price <= maxPrice);
    if (hasStay) rooms = rooms.filter((r) => !hasOverlap(r.id, check_in, check_out));
    if (filtered && rooms.length === 0) continue;
    result.push({
      ...hotelOut(h),
      min_price: rooms.length ? Math.min(...rooms.map((r) => r.price)) : null,
      rooms_count: rooms.length,
      key_types: [...new Set(rooms.map((r) => r.key_type))],
      services: servicesStmt.all(h.id).map((s) => s.name),
    });
  }
  res.json(result);
});

// GET /hotels/:id?check_in=&check_out=  (rooms get an "available" flag for those dates)
router.get('/hotels/:id', (req, res) => {
  const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(toId(req.params.id));
  if (!hotel) fail(404, 'ობიექტი ვერ მოიძებნა');
  const { check_in, check_out } = req.query;
  const hasStay = Boolean(check_in || check_out);
  const nights = hasStay ? parseStay(check_in, check_out) : null;

  const rooms = db
    .prepare('SELECT * FROM rooms WHERE hotel_id = ? ORDER BY number')
    .all(hotel.id)
    .map((r) => ({
      ...r,
      available: r.status === 'available' && (!hasStay || !hasOverlap(r.id, check_in, check_out)),
      total_price: nights ? nights * r.price : null,
    }));
  const services = db
    .prepare('SELECT id, name, price, description FROM hotel_services WHERE hotel_id = ? AND active = 1 ORDER BY id')
    .all(hotel.id);
  const host = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(hotel.owner_id) || null;
  res.json({ ...hotelOut(hotel), rooms, services, host, nights });
});

// GET /rooms/:id/availability?check_in=&check_out=
router.get('/rooms/:id/availability', (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(toId(req.params.id));
  if (!room) fail(404, 'ოთახი ვერ მოიძებნა');
  const booked = db
    .prepare(
      `SELECT check_in, check_out FROM bookings
       WHERE room_id = ? AND status != 'cancelled' AND check_out > ? ORDER BY check_in`,
    )
    .all(room.id, today());
  const { check_in, check_out } = req.query;
  let available = null;
  let nights = null;
  if (check_in || check_out) {
    nights = parseStay(check_in, check_out);
    available = room.status === 'available' && !hasOverlap(room.id, check_in, check_out);
  }
  res.json({
    room_id: room.id,
    status: room.status,
    price: room.price,
    booked,
    available,
    nights,
    total_price: nights ? nights * room.price : null,
  });
});

// GET /pois?type=cafe,tour  (one or more types; all when omitted)
router.get('/pois', (req, res) => {
  const types = String(req.query.type || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const unknown = types.filter((t) => !POI_TYPES.includes(t));
  if (unknown.length) fail(400, `უცნობი კატეგორია: ${unknown.join(', ')}`, { allowed: POI_TYPES });
  const rows = types.length
    ? db.prepare(`SELECT * FROM pois WHERE type IN (${types.map(() => '?').join(',')}) ORDER BY type, name`).all(...types)
    : db.prepare('SELECT * FROM pois ORDER BY type, name').all();
  res.json(rows.map((p) => ({ ...p, google_maps_url: p.google_maps_url || mapsUrl(p.lat, p.lng) })));
});

export default router;
