import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// backend/ folder
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load backend/.env no matter which folder the server is started from.
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

export const config = {
  // API_PORT rather than PORT: dev tools often set PORT for the web server.
  port: Number(process.env.API_PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'hospes-dev-secret-change-me',
  dbPath: path.resolve(ROOT, process.env.DB_PATH || 'data/hospes.db'),
  uploadDir: path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads'),
  // COM port of the Arduino (e.g. COM3), "auto" to detect it, or empty for mock mode
  arduinoPort: (process.env.ARDUINO_PORT || '').trim(),
  arduinoBaud: Number(process.env.ARDUINO_BAUD) || 9600,
  // face-api euclidean distance: <= threshold counts as the same person
  faceMatchThreshold: Number(process.env.FACE_MATCH_THRESHOLD) || 0.6,
  // "demo": verification always succeeds and no photos are stored (for the pitch);
  // "real": the browser compares the faces and the server stores the photos.
  faceVerification: (process.env.FACE_VERIFICATION || 'demo').trim().toLowerCase() === 'real' ? 'real' : 'demo',
  timezone: process.env.TIMEZONE || 'Asia/Tbilisi',
};
