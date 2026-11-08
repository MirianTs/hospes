import { useEffect } from 'react';
import { connectLock, reconnectLock, serialSupported, useLock } from '../lockSerial.js';
import Icon from './Icon.jsx';
import { Spinner } from './ui.jsx';
import { L } from '../prefs.js';

// Shows whether the Hospes Lock (Arduino by USB) is connected and lets the user connect it.
export default function LockConnect() {
  const lock = useLock();
  useEffect(() => {
    reconnectLock();
  }, []);
  if (!serialSupported) {
    return <p className="lock-connect muted small">{L('Hospes Lock-ის USB კავშირი მუშაობს Chrome-ში ან Edge-ში, კომპიუტერზე.', 'The Hospes Lock USB connection works in Chrome or Edge on a computer.')}</p>;
  }
  return (
    <div className="lock-connect">
      {lock.status === 'ready' ? (
        <span className="lock-on">
          <span className="lock-dot" /> {L('Hospes Lock მიერთებულია', 'Hospes Lock connected')}
        </span>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" onClick={connectLock} disabled={lock.status === 'connecting'}>
          {lock.status === 'connecting' ? <Spinner small /> : <Icon name="key" size={14} />} {L('Hospes Lock-ის მიერთება (USB)', 'Connect Hospes Lock (USB)')}
        </button>
      )}
      {lock.error && <span className="small lock-err">{lock.error}</span>}
    </div>
  );
}
