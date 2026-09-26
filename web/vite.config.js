import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// host: true makes the dev server reachable from a phone on the same Wi-Fi.
// /api is proxied to the backend, so the phone needs only this one address.
const api = { '/api': 'http://localhost:4000' };

export default defineConfig({
  plugins: [react()],
  // Polling: file-change events get lost inside OneDrive folders, which leaves stale code in the browser.
  server: { host: true, port: 5173, proxy: api, watch: { usePolling: true, interval: 300 } },
  preview: { host: true, port: 4173, proxy: api },
  // The face-api chunk (~1.3 MB) is lazy-loaded on the verification page only.
  build: { chunkSizeWarningLimit: 1500 },
});
