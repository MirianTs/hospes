const TOKEN_KEY = 'hospes_token';

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
  const headers = {};
  const token = getToken();
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
    throw new ApiError(0, 'სერვერთან კავშირი ვერ დამყარდა. ჩართულია backend?');
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('hospes:logout'));
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `შეცდომა (${res.status})`, data);
  return data;
}

// Follows a server-sent-events endpoint. EventSource can't send the auth header,
// so this reads the stream with fetch and reconnects after a drop.
// onState gets 'open' / 'closed'. Returns a function that stops it.
export function stream(path, onMessage, onState) {
  let stopped = false;
  let controller = null;
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
