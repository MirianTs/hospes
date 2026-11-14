import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { config } from '../config.js';
import { getUser, publicUser, requireAuth, signToken } from '../auth.js';
import { fail, nowIso } from '../util.js';

const router = Router();

fs.mkdirSync(config.uploadDir, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) =>
      cb(null, `u${req.user.id}-${file.fieldname}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => cb(null, Boolean(EXT[file.mimetype])),
});

router.post('/register', (req, res) => {
  const { name, phone, email, password } = req.body || {};
  // A number or object here would make .trim() throw and turn a bad request into a 500.
  if ([name, phone, email, password].some((v) => v != null && typeof v !== 'string')) fail(400, 'ველები ტექსტით უნდა იყოს შევსებული');
  if (!name?.trim() || !email?.trim() || !password) fail(400, 'შეავსეთ სახელი, ელფოსტა და პაროლი');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) fail(400, 'ელფოსტის ფორმატი არასწორია');
  // 254 characters is the longest address SMTP can deliver to.
  if (email.trim().length > 254) fail(400, 'ელფოსტა ძალიან გრძელია');
  if (String(password).length < 6) fail(400, 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
  // bcrypt only looks at the first 72 bytes, so a longer password would match on its prefix alone.
  if (Buffer.byteLength(password) > 72) fail(400, 'პაროლი ძალიან გრძელია (მაქს. 72 ბაიტი)');
  if (name.trim().length > 80) fail(400, 'სახელი მაქსიმუმ 80 სიმბოლოა');
  if (phone && phone.trim().length > 30) fail(400, 'ტელეფონის ნომერი ძალიან გრძელია');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim())) {
    fail(409, 'ეს ელფოსტა უკვე რეგისტრირებულია');
  }
  // Self-registration always creates a guest; owners and admins are set up by an admin.
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, 'guest')`)
    .run(name.trim(), phone?.trim() || null, email.trim().toLowerCase(), bcrypt.hashSync(String(password), 10));
  const user = getUser(lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// Compared against when the email is unknown (see /login).
const DUMMY_HASH = bcrypt.hashSync('hospes-no-such-user', 10);

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  // users.email is COLLATE NOCASE (db.js), so this lookup and the duplicate check in /register ignore case.
  const user = email ? db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim()) : null;
  // An unknown email still costs one bcrypt comparison, so response time doesn't reveal which emails exist.
  if (!bcrypt.compareSync(String(password || ''), user?.password_hash ?? DUMMY_HASH) || !user) {
    fail(401, 'ელფოსტა ან პაროლი არასწორია');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const PHOTO_FIELDS = [
  { name: 'id_doc', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
];
// Demo mode keeps uploads in memory only, so nothing is written to disk.
const discardPhotos = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 2 } });

function removeUploads(files) {
  for (const file of Object.values(files || {}).flat()) fs.rm(file.path, { force: true }, () => {});
}

// FACE_VERIFICATION=demo: always verified, photos optional and not stored.
function demoVerify(req, res) {
  const reported = Number(req.body?.distance);
  const distance = Number.isFinite(reported) && reported >= 0 ? reported : 0.25;
  db.prepare(
    `UPDATE users SET verification_status = 'verified', face_distance = ?, verified_at = ? WHERE id = ?`,
  ).run(distance, nowIso(), req.user.id);
  res.json({ verified: true, distance, threshold: config.faceMatchThreshold, demo: true, user: publicUser(getUser(req.user.id)) });
}

// FACE_VERIFICATION=real: the browser compares the ID photo with the selfie (face-api)
// and sends both images plus the resulting distance. The server trusts that distance.
router.post(
  '/verify',
  requireAuth,
  (req, res, next) =>
    config.faceVerification === 'demo' ? discardPhotos.fields(PHOTO_FIELDS)(req, res, next) : upload.fields(PHOTO_FIELDS)(req, res, next),
  (req, res) => {
    if (config.faceVerification === 'demo') return demoVerify(req, res);
    const idDoc = req.files?.id_doc?.[0];
    const selfie = req.files?.selfie?.[0];
    const distance = Number(req.body?.distance);
    if (!idDoc || !selfie || !Number.isFinite(distance) || distance < 0) {
      // multer has already written whatever did arrive; don't leave orphaned ID photos on disk.
      removeUploads(req.files);
      if (!idDoc || !selfie) fail(400, 'საჭიროა პირადობის ფოტო და სელფი (JPEG, PNG ან WebP)');
      fail(400, 'სახეების შედარების შედეგი არ მოვიდა');
    }

    const verified = distance <= config.faceMatchThreshold;
    db.prepare(
      `UPDATE users SET verification_status = ?, id_doc_url = ?, selfie_url = ?, face_distance = ?, verified_at = ?
       WHERE id = ?`,
    ).run(
      verified ? 'verified' : 'rejected',
      `uploads/${idDoc.filename}`,
      `uploads/${selfie.filename}`,
      distance,
      verified ? nowIso() : null,
      req.user.id,
    );
    // A second verification replaces the first one's photos; the old files are no longer referenced.
    for (const old of [req.user.id_doc_url, req.user.selfie_url]) {
      if (old) fs.rm(path.join(config.uploadDir, path.basename(old)), { force: true }, () => {});
    }
    res.json({
      verified,
      distance,
      threshold: config.faceMatchThreshold,
      user: publicUser(getUser(req.user.id)),
    });
  },
);

export default router;
