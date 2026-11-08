import { useEffect, useState } from 'react';
import { connectLock, openCompartment, reconnectLock, serialSupported, useLock } from '../lockSerial.js';
import Icon from './Icon.jsx';
import { Alert, Spinner } from './ui.jsx';
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

// Shown when the board didn't confirm OPEN<n>: reconnect (picking the Arduino's port) and try again.
export function LockRetry({ lock }) {
  const [state, setState] = useState(null); // null | 'busy' | true | 'noreply' | false
  const retry = async () => {
    setState('busy');
    setState(await openCompartment(lock));
  };
  if (state === true) {
    return (
      <Alert tone="success" icon="key">
        {L(`Hospes Lock: განყოფილება #${lock} გაიღო. 5 წამში თავისით ჩაიკეტება.`, `Hospes Lock: compartment #${lock} is open. It locks by itself in 5 seconds.`)}
      </Alert>
    );
  }
  return (
    <Alert tone="warn">
      {L(
        `Arduino-მ არ დაადასტურა, რომ განყოფილება #${lock} გაიღო. მიაერთე Hospes Lock (აირჩიე Arduino-ს პორტი) და დააჭირე „ხელახლა გაღებას“.`,
        `The Arduino didn't confirm that compartment #${lock} opened. Connect Hospes Lock (choose the Arduino's port) and press "Open again".`
      )}
      <div className="inline mt-1" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <LockConnect />
        <button type="button" className="btn btn-primary btn-sm" onClick={retry} disabled={state === 'busy'}>
          {state === 'busy' ? <Spinner small /> : <Icon name="key" size={14} />} {L('ხელახლა გაღება', 'Open again')}
        </button>
      </div>
    </Alert>
  );
}
