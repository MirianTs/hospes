import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { BOOKING_STATUS, KEY_TYPE, VERIFICATION } from '../format.js';
import Icon from './Icon.jsx';
import { L } from '../prefs.js';

// Loads `path` whenever it changes; `path = null` skips loading.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api(path);
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);
  return { ...state, reload: load, setData };
}

export function Spinner({ small }) {
  return <div className={`spinner${small ? ' spinner-sm' : ''}`} role="status" aria-label={L('იტვირთება', 'Loading')} />;
}

export function Loading() {
  return (
    <div className="center">
      <Spinner />
    </div>
  );
}

export function Alert({ tone = 'info', children, icon }) {
  const icons = { error: 'alert', success: 'checkCircle', info: 'alert', warn: 'alert' };
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon || icons[tone]} size={18} />
      <div>{children}</div>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <Alert tone="error">
      {error.message || String(error)}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>
            <Icon name="refresh" size={14} /> {L('თავიდან ცდა', 'Try again')}
          </button>
        </>
      )}
    </Alert>
  );
}

export function Badge({ tone = 'plain', icon, children }) {
  return (
    <span className={`badge${tone === 'plain' ? '' : ` badge-${tone}`}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = BOOKING_STATUS[status] || { label: status, tone: 'plain' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function KeyBadge({ type }) {
  const k = KEY_TYPE[type];
  if (!k) return null;
  return (
    <Badge tone="gold" icon={k.icon}>
      {k.short}
    </Badge>
  );
}

export function VerificationBadge({ status }) {
  const v = VERIFICATION[status] || VERIFICATION.unverified;
  return (
    <Badge tone={v.tone} icon={status === 'verified' ? 'shield' : 'alert'}>
      {v.label}
    </Badge>
  );
}

export function Rating({ value }) {
  if (value == null) return null;
  return (
    <span className="rating" title={L('Google-ის რეიტინგი', 'Google rating')}>
      <Icon name="star" size={14} /> {Number(value).toFixed(1)}
    </span>
  );
}

// Runs an async action with a busy flag and an error message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (fn) => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
