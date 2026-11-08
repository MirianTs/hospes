import { useEffect } from 'react';
import { connectLock, reconnectLock, serialSupported, useLock } from '../lockSerial.js';
import Icon from './Icon.jsx';
import { Spinner } from './ui.jsx';

// Shows whether the Hospes Lock (Arduino by USB) is connected and lets the user connect it.
export default function LockConnect() {
  const lock = useLock();
  useEffect(() => {
    reconnectLock();
  }, []);
  if (!serialSupported) {
    return <p className="lock-connect muted small">Hospes Lock-ის USB კავშირი მუშაობს Chrome-ში ან Edge-ში, კომპიუტერზე.</p>;
  }
  return (
    <div className="lock-connect">
      {lock.status === 'ready' ? (
        <span className="lock-on">
          <span className="lock-dot" /> Hospes Lock მიერთებულია
        </span>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={connectLock} disabled={lock.status === 'connecting'}>
          {lock.status === 'connecting' ? <Spinner small /> : <Icon name="key" size={14} />} Hospes Lock-ის მიერთება (USB)
        </button>
      )}
      {lock.error && <span className="small lock-err">{lock.error}</span>}
    </div>
  );
}
