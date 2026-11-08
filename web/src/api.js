import { L } from './prefs.js';

const TOKEN_KEY = 'hospes_token';

// GitHub Pages build (VITE_STATIC_DEMO=1): no server, so requests go to an in-browser
// demo API with the same routes (src/demo/mockApi.js). Normal builds never load it.
export const STATIC_DEMO = import.meta.env.VITE_STATIC_DEMO === '1';
let demoModule = null;
// The condition is spelled out so a normal build drops the demo chunk entirely.
const demoApi = () =>
  (demoModule ??=
    import.meta.env.VITE_STATIC_DEMO === '1' ? import('./demo/mockApi.js') : Promise.reject(new Error('not a demo build')));

// Demo build only: forget this browser's demo data and start over.
export async function resetDemo() {
  const { STORE_KEY } = await demoApi();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // nothing stored
  }
  setToken(null);
  window.location.reload();
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked (private mode): the session just won't survive a reload
  }
}

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// api('/hotels'), api('/bookings', { method: 'POST', body: {...} }), api('/auth/verify', { method: 'POST', form })
export async function api(path, { method = 'GET', body, form } = {}) {
  const token = getToken();
  const { status, data } = STATIC_DEMO
    ? await (await demoApi()).request({ method, path, body, form, token })
    : await request(path, { method, body, form, token });
  if (status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('hospes:logout'));
  }
  if (status >= 400) throw new ApiError(status, data?.error || L(`შეცდომა (${status})`, `Error (${status})`), data);
  return data;
}

async function request(path, { method, body, form, token }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, L('სერვერთან კავშირი ვერ დამყარდა. ჩართულია backend?', 'Could not connect to the server. Is the backend running?'));
  }
  return { status: res.status, data: await res.json().catch(() => null) };
}

// Follows a server-sent-events endpoint. EventSource can't send the auth header,
// so this reads the stream with fetch and reconnects after a drop.
// onState gets 'open' / 'closed'. Returns a function that stops it.
export function stream(path, onMessage, onState) {
  let stopped = false;
  let controller = null;
  if (STATIC_DEMO) {
    let unsubscribe = () => {};
    demoApi().then((demo) => {
      if (stopped) return;
      onState?.('open');
      unsubscribe = demo.subscribe(path, onMessage);
    });
    return () => {
      stopped = true;
      unsubscribe();
    };
  }
  (async () => {
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await fetch(`/api${path}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        onState?.('open');
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const data = buffer
              .slice(0, end)
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trimStart())
              .join('\n');
            buffer = buffer.slice(end + 2);
            if (data) {
              try {
                onMessage(JSON.parse(data));
              } catch {
                // ignore a malformed message
              }
            }
          }
        }
      } catch {
        // dropped or refused: retry below
      }
      if (stopped) return;
      onState?.('closed');
      await new Promise((r) => setTimeout(r, 2000));
    }
  })();
  return () => {
    stopped = true;
    controller?.abort();
  };
}

// Builds "?a=1&b=2", skipping empty values.
export function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}
