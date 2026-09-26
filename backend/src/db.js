import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('foreign_keys = ON');

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'owner', 'admin')),
      verification_status TEXT NOT NULL DEFAULT 'unverified'
        CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
      id_doc_url TEXT,
      selfie_url TEXT,
      face_distance REAL,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW}
    );

    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      google_rating REAL,
      description TEXT,
      photos TEXT NOT NULL DEFAULT '[]',
      checkin_info TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW}
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
      number TEXT NOT NULL,
      title TEXT,
      capacity INTEGER NOT NULL DEFAULT 2,
      price REAL NOT NULL CHECK (price >= 0),
      key_type TEXT NOT NULL CHECK (key_type IN ('box', 'smartlock')),
      lock_id INTEGER UNIQUE CHECK (lock_id BETWEEN 1 AND 4),
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'maintenance')),
      UNIQUE (hotel_id, number),
      CHECK (key_type = 'box' OR lock_id IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS hotel_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
      description TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
      source TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal', 'external')),
      access_code TEXT,
      total_price REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW},
      paid_at TEXT,
      checked_in_at TEXT,
      checked_out_at TEXT,
      CHECK (check_out > check_in)
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings (room_id, check_in, check_out);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      hotel_service_id INTEGER NOT NULL REFERENCES hotel_services(id),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW},
      done_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pois (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('cafe', 'tour', 'guide', 'trail', 'landmark')),
      name TEXT NOT NULL,
      description TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      google_maps_url TEXT
    );

    -- Card access (RC522). Hardware setup, so a demo reset (npm run seed) keeps it.
    CREATE TABLE IF NOT EXISTS rfid_cards (
      uid TEXT PRIMARY KEY,
      label TEXT,
      lock_id INTEGER NOT NULL DEFAULT 1 CHECK (lock_id BETWEEN 1 AND 4),
      created_at TEXT NOT NULL DEFAULT ${NOW}
    );

    CREATE TABLE IF NOT EXISTS access_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL DEFAULT ${NOW},
      kind TEXT NOT NULL CHECK (kind IN ('card', 'door', 'app', 'admin', 'error')),
      result TEXT NOT NULL CHECK (result IN ('allowed', 'denied', 'opened', 'locked', 'failed')),
      lock_id INTEGER,
      uid TEXT,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
