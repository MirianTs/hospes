// Copies the face-api model weights into public/models so verification works offline.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(web, 'node_modules', '@vladmandic', 'face-api', 'model');
const dest = path.join(web, 'public', 'models');
const MODELS = ['ssd_mobilenetv1_model', 'face_landmark_68_model', 'face_recognition_model'];

if (!fs.existsSync(src)) {
  console.log('[face-models] @vladmandic/face-api is not installed yet, skipping');
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
let copied = 0;
for (const file of fs.readdirSync(src)) {
  if (MODELS.some((m) => file.startsWith(m))) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
    copied++;
  }
}
console.log(`[face-models] ${copied} files copied to public/models`);
