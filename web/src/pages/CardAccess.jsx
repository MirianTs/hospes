import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, stream } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, Loading, Spinner, useAction, useApi } from '../components/ui.jsx';
import { fmtTime } from '../format.js';

const spaced = (uid) => (uid || '').match(/.{1,2}/g)?.join(' ') ?? '';

function describe(e, cards) {
  const card = e.uid ? cards.get(e.uid) : null;
  const who = e.uid ? `${spaced(e.uid)}${card?.label ? ` (${card.label})` : ''}` : '';
  switch (`${e.kind}:${e.result}`) {
    case 'card:allowed':
      return { icon: 'key', tone: 'ok', text: `ბარათი ${who} მიიდო → კარი #${e.lock_id} იღება` };
    case 'card:denied':
      return { icon: 'ban', tone: 'no', text: `უცნობი ბარათი ${who} → წვდომა აკრძალულია` };
    case 'door:opened':
      return { icon: 'unlock', tone: 'ok', text: `კარი #${e.lock_id} გაიღო` };
    case 'door:locked':
      return { icon: 'lock', tone: 'info', text: `კარი #${e.lock_id} დაიკეტა` };
    case 'app:opened':
      return { icon: 'unlock', tone: 'ok', text: `აპიდან გაიღო კარი #${e.lock_id}: ${e.label}` };
    case 'admin:opened':
      return { icon: 'unlock', tone: 'ok', text: `ადმინმა გააღო კარი #${e.lock_id} (${e.label})` };
    default:
      return { icon: 'alert', tone: 'no', text: e.label || 'შეცდომა' };
  }
}

function Door({ n, open, openedAt, openMs, now }) {
  const left = open && openedAt ? Math.max(0, Math.ceil((openMs - (now - Date.parse(openedAt))) / 1000)) : 0;
  return (
    <div className={`door${open ? ' open' : ''}`}>
      <div className="ico">
        <Icon name={open ? 'unlock' : 'lock'} size={30} strokeWidth={2.2} />
      </div>
      <div className="muted small">კარი #{n}</div>
      <div className="state">{open ? `ღიაა${left ? ` · ${left} წმ` : ''}` : 'დაკეტილია'}</div>
    </div>
  );
}

function Connection({ hw, live }) {
  if (!hw) return null;
  let board;
  if (hw.mode === 'mock') board = <Badge tone="gold">დემო რეჟიმი: Arduino არ არის მიერთებული</Badge>;
  else if (hw.open && hw.ready) board = <Badge tone="green">Arduino დაკავშირებულია · {hw.path}</Badge>;
  else if (hw.open) board = <Badge tone="gold">Arduino ირთვება… · {hw.path}</Badge>;
  else board = <Badge tone="red">Arduino არ არის დაკავშირებული</Badge>;
  const reader =
    hw.mode === 'mock' ? null : hw.reader === 'ok' ? (
      <Badge tone="green" icon="check">
        RFID მკითხველი მუშაობს
      </Badge>
    ) : hw.reader === 'missing' ? (
      <Badge tone="red" icon="alert">
        RFID მკითხველი ვერ მოიძებნა
      </Badge>
    ) : (
      <Badge>მკითხველის სტატუსი უცნობია</Badge>
    );
  return (
    <div className="card card-body">
      <div className="spread">
        <h3 className="mb-0">კავშირი</h3>
        <span className={`live${live === 'open' ? ' on' : ''}`}>
          <span className="dot" /> {live === 'open' ? 'ცოცხალი' : 'უკავშირდება…'}
        </span>
      </div>
      <div className="stack mt-2" style={{ gap: 8, alignItems: 'flex-start' }}>
        {board}
        {reader}
      </div>
      {hw.mode === 'serial' && hw.reader === 'missing' && (
        <p className="small muted mt-2 mb-0">შეამოწმე SDA→10, SCK→13, MOSI→11, MISO→12, RST→9, 3.3V→3.3V და GND.</p>
      )}
      {hw.mode === 'mock' && (
        <p className="small muted mt-2 mb-0">
          დაფის მისაერთებლად backend/.env-ში ჩაწერე ARDUINO_PORT=auto და გადატვირთე backend. მანამდე გამოიყენე სიმულაცია.
        </p>
      )}
      {hw.lastError && hw.mode === 'serial' && !hw.open && <p className="small muted mt-2 mb-0">{hw.lastError}</p>}
    </div>
  );
}

export default function CardAccess() {
  const initial = useApi('/admin/rfid');
  const [events, setEvents] = useState([]);
  const [hw, setHw] = useState(null);
  const [openAny, setOpenAny] = useState(true);
  const [cards, setCards] = useState([]);
  const [live, setLive] = useState('closed');
  const [freshId, setFreshId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [label, setLabel] = useState('');
  const [lockId, setLockId] = useState('1');
  const action = useAction();

  useEffect(() => {
    if (!initial.data) return;
    setEvents(initial.data.events);
    setHw(initial.data.hardware);
    setOpenAny(initial.data.open_any);
    setCards(initial.data.cards);
  }, [initial.data]);

  useEffect(
    () =>
      stream(
        '/admin/rfid/stream',
        (msg) => {
          if (msg.type === 'event') {
            setEvents((list) => [msg.event, ...list.filter((e) => e.id !== msg.event.id)].slice(0, 60));
            setFreshId(msg.event.id);
          } else if (msg.type === 'status') {
            setHw(msg.hardware);
            setOpenAny(msg.open_any);
          }
        },
        setLive,
      ),
    [],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.uid, c])), [cards]);
  const lastCard = events.find((e) => e.kind === 'card');
  const lastUnknown = lastCard && !cardMap.has(lastCard.uid) ? lastCard.uid : null;

  const setMode = async (on) => {
    const res = await action.run(() => api('/admin/rfid/settings', { method: 'PATCH', body: { open_any: on } }));
    if (res) setOpenAny(res.open_any);
  };
  const addCard = async (e) => {
    e.preventDefault();
    const list = await action.run(() =>
      api('/admin/rfid/cards', { method: 'POST', body: { uid: lastUnknown, label, lock_id: Number(lockId) } }),
    );
    if (list) {
      setCards(list);
      setLabel('');
    }
  };
  const removeCard = async (uid) => {
    if (!window.confirm(`წავშალო ბარათი ${spaced(uid)}?`)) return;
    const list = await action.run(() => api(`/admin/rfid/cards/${uid}`, { method: 'DELETE' }));
    if (list) setCards(list);
  };
  const simulate = () =>
    action.run(() => api('/admin/rfid/simulate', { method: 'POST', body: { uid: lastCard?.uid || cards[0]?.uid } }));

  if (initial.loading && !initial.data) return <Loading />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>ბარათით შესვლა</h1>
        <p>მიადე ბარათი RC522 მკითხველს: კარი გაიღება, მოვლენა აქ ჩაიწერება და 5 წამში კარი ისევ დაიკეტება.</p>
      </div>
      <ErrorBox error={initial.error} onRetry={initial.reload} />

      {hw && (
        <div className="doors">
          {hw.doors.map((open, i) => (
            <Door key={i} n={i + 1} open={open} openedAt={hw.openedAt[i]} openMs={hw.openMs} now={now} />
          ))}
        </div>
      )}

      <div className="two-col mt-3">
        <div className="card">
          <div className="card-body spread" style={{ paddingBottom: 6 }}>
            <h3 className="mb-0">ჟურნალი</h3>
            <span className="muted small">ბოლო {events.length} მოვლენა</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {events.length === 0 ? (
              <div className="empty">
                <Icon name="key" size={30} />
                <p className="mb-0">ჯერ ცარიელია. მიადე ბარათი მკითხველს.</p>
              </div>
            ) : (
              <ul className="log">
                {events.map((e) => {
                  const d = describe(e, cardMap);
                  return (
                    <li key={e.id} className={e.id === freshId ? 'fresh' : ''}>
                      <span className="t">{fmtTime(e.at)}</span>
                      <Icon name={d.icon} size={18} className={d.tone} />
                      <span>{d.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <aside className="stack sticky" style={{ gap: 16 }}>
          <Connection hw={hw} live={live} />

          <div className="card card-body">
            <h3 className="card-title">ვის უღებს კარს</h3>
            <div className="chips">
              <button type="button" className={`chip${openAny ? ' on' : ''}`} onClick={() => setMode(true)} disabled={action.busy}>
                ნებისმიერ ბარათს
              </button>
              <button type="button" className={`chip${!openAny ? ' on' : ''}`} onClick={() => setMode(false)} disabled={action.busy}>
                მხოლოდ დაშვებულს
              </button>
            </div>
            {!openAny && cards.length === 0 && (
              <p className="small muted mt-2 mb-0">დაშვებული ბარათი ჯერ არ არის: მიადე ბარათი და ქვემოთ დაამატე.</p>
            )}
          </div>

          {lastUnknown && (
            <form className="card card-body" onSubmit={addCard}>
              <h3 className="card-title">ახალი ბარათი</h3>
              <div className="uid">{spaced(lastUnknown)}</div>
              <div className="form-row mt-2">
                <input className="input input-sm" placeholder="სახელი, მაგ. ნინოს ბარათი" value={label} onChange={(e) => setLabel(e.target.value)} />
                <select className="input input-sm" style={{ maxWidth: 110 }} value={lockId} onChange={(e) => setLockId(e.target.value)} aria-label="კარი">
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      კარი #{n}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={action.busy}>
                <Icon name="plus" size={14} /> დაშვება
              </button>
            </form>
          )}

          <div className="card card-body">
            <h3 className="card-title">დაშვებული ბარათები</h3>
            {cards.length === 0 ? (
              <p className="muted small mb-0">ჯერ არცერთი.</p>
            ) : (
              <ul className="service-list">
                {cards.map((c) => (
                  <li key={c.uid}>
                    <div>
                      <div>{c.label || 'უსახელო ბარათი'}</div>
                      <div className="muted small uid">
                        {spaced(c.uid)} · კარი #{c.lock_id}
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeCard(c.uid)} title="წაშლა" aria-label="წაშლა">
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ErrorBox error={action.error} />
          <div className="inline">
            <button type="button" className="btn btn-outline btn-sm" onClick={simulate} disabled={action.busy}>
              {action.busy ? <Spinner small /> : <Icon name="key" size={14} />} ბარათის სიმულაცია
            </button>
            <Link to="/admin" className="btn btn-ghost btn-sm">
              ადმინისტრირება
            </Link>
          </div>
          {hw?.mode === 'serial' && !hw.open && (
            <Alert tone="warn">სანამ Arduino არ დაუკავშირდება, ბარათი კარს ვერ გააღებს.</Alert>
          )}
        </aside>
      </div>
    </div>
  );
}
