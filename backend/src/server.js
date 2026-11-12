import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config, ROOT } from './config.js';
import { createSchema } from './db.js';
import { seedIfEmpty } from './seed.js';
import * as serial from './serial.js';
import * as access from './access.js';
import { HttpError, today } from './util.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import guestRoutes from './routes/guest.js';
import ownerRoutes from './routes/owner.js';
import adminRoutes from './routes/admin.js';

createSchema();
seedIfEmpty();

// Card taps and door changes from the Arduino go to the access log.
serial.events.on('card', (uid) => access.handleCard(uid).catch((err) => console.error('[rfid]', err)));
serial.events.on('door', access.handleDoor);
serial.events.on('status', access.broadcastStatus);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, today: today(), hardware: serial.status() });
});
// Settings the web app needs before it renders a page.
app.get('/api/config', (req, res) => {
  res.json({ face_verification: config.faceVerification, face_match_threshold: config.faceMatchThreshold });
});
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', guestRoutes);
app.use('/api', ownerRoutes);
// Unknown /api paths get a JSON 404 here instead of falling through to the site's index.html below.
app.use('/api', (req, res) => res.status(404).json({ error: 'API მარშრუტი ვერ მოიძებნა' }));

// After `npm run build` in web/, the same server also serves the site (one URL for the demo).
const webDist = path.resolve(ROOT, '../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(webDist, 'index.html')) : next()));
}

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra });
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(400).json({ error: tooBig ? 'ფაილი ძალიან დიდია (მაქს. 8 MB)' : 'ფაილის ატვირთვა ვერ მოხერხდა' });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'მოთხოვნის JSON არასწორია' });
  console.error(err);
  res.status(500).json({ error: 'სერვერის შეცდომა' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Hospes API: http://localhost:${config.port}`);
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const n of nets || []) {
      if (n.family === 'IPv4' && !n.internal) console.log(`  in the local network: http://${n.address}:${config.port}`);
    }
  }
  serial.connect();
});
