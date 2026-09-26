import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db.js';
import { HttpError } from './util.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

export function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// Never send the password hash or the stored document paths to the client.
export function publicUser(u) {
  if (!u) return null;
  const { password_hash, id_doc_url, selfie_url, ...rest } = u;
  return { ...rest, has_documents: Boolean(id_doc_url && selfie_url) };
}

function userFromRequest(req) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  if (!match) return null;
  try {
    const payload = jwt.verify(match[1], config.jwtSecret);
    return getUser(payload.sub) || null;
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const user = userFromRequest(req);
  if (!user) return next(new HttpError(401, 'საჭიროა ავტორიზაცია'));
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) =>
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      if (!roles.includes(req.user.role)) return next(new HttpError(403, 'ამ მოქმედების უფლება არ გაქვთ'));
      next();
    });
}
