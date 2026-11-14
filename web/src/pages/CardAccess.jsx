import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, STATIC_DEMO, stream } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, Loading, Spinner, useAction, useApi } from '../components/ui.jsx';
import { fmtTime } from '../format.js';
import { L } from '../prefs.js';

const spaced = (uid) => (uid || '').match(/.{1,2}/g)?.join(' ') ?? '';

function describe(e, cards) {
  const card = e.uid ? cards.get(e.uid) : null;
  const who = e.uid ? `${spaced(e.uid)}${card?.label ? ` (${card.label})` : ''}` : '';
  switch (`${e.kind}:${e.result}`) {
    case 'card:allowed':
      return {
        icon: 'key',
        tone: 'ok',
        text: L(`ბარათი ${who} მიიდო → განყოფილება #${e.lock_id} იღება`, `Card ${who} tapped → compartment #${e.lock_id} opening`),
      };
    case 'card:denied':
      return { icon: 'ban', tone: 'no', text: L(`უცნობი ბარათი ${who} → წვდომა აკრძალულია`, `Unknown card ${who} → access denied`) };
    case 'door:opened':
      return { icon: 'unlock', tone: 'ok', text: L(`განყოფილება #${e.lock_id} გაიღო`, `Compartment #${e.lock_id} opened`) };
    case 'door:locked':
      return { icon: 'lock', tone: 'info', text: L(`განყოფილება #${e.lock_id} დაიკეტა`, `Compartment #${e.lock_id} locked`) };
    case 'app:opened':
      return {
        icon: 'unlock',
        tone: 'ok',
        text: L(`აპიდან გაიღო განყოფილება #${e.lock_id}: ${e.label}`, `Compartment #${e.lock_id} opened from the app: ${e.label}`),
      };
    case 'admin:opened':
      return {
        icon: 'unlock',
        tone: 'ok',
        text: L(`ადმინმა გააღო განყოფილება #${e.lock_id} (${e.label})`, `Admin opened compartment #${e.lock_id} (${e.label})`),
      };
    default:
      return { icon: 'alert', tone: 'no', text: e.label || L('შეცდომა', 'Error') };
  }
}

function Door({ n, open, openedAt, openMs, now }) {
  const left = open && openedAt ? Math.max(0, Math.ceil((openMs - (now - Date.parse(openedAt))) / 1000)) : 0;
  return (
    <div className={`door${open ? ' open' : ''}`}>
      <div className="ico">
        <Icon name={open ? 'unlock' : 'lock'} size={30} strokeWidth={2.2} />
      </div>
      <div className="muted small">
        {L('განყოფილება', 'Compartment')} #{n}
        {n === 4 ? L(' · დაბრუნება', ' · return') : ''}
      </div>
      <div className="state">
        {open ? L(`ღიაა${left ? ` · ${left} წმ` : ''}`, `Open${left ? ` · ${left} s` : ''}`) : L('დაკეტილია', 'Locked')}
      </div>
    </div>
  );
}

function Connection({ hw, live }) {
  if (!hw) return null;
  let board;
  if (hw.mode === 'mock') board = <Badge tone="gold">{L('დემო რეჟიმი: Arduino არ არის მიერთებული', 'Demo mode: no Arduino connected')}</Badge>;
  else if (hw.open && hw.ready) board = <Badge tone="green">{L('Arduino დაკავშირებულია', 'Arduino connected')} · {hw.path}</Badge>;
  else if (hw.open) board = <Badge tone="gold">{L('Arduino ირთვება…', 'Arduino starting…')} · {hw.path}</Badge>;
  else board = <Badge tone="red">{L('Arduino არ არის დაკავშირებული', 'Arduino not connected')}</Badge>;
  const reader =
    hw.mode === 'mock' ? null : hw.reader === 'ok' ? (
      <Badge tone="green" icon="check">
        {L('RFID მკითხველი მუშაობს', 'RFID reader is working')}
      </Badge>
    ) : hw.reader === 'missing' ? (
      <Badge tone="red" icon="alert">
        {L('RFID მკითხველი ვერ მოიძებნა', 'RFID reader not found')}
      </Badge>
    ) : (
      <Badge>{L('მკითხველის სტატუსი უცნობია', 'Reader status unknown')}</Badge>
    );
  return (
    <div className="card card-body">
      <div className="spread">
        <h3 className="mb-0">{L('კავშირი', 'Connection')}</h3>
        <span className={`live${live === 'open' ? ' on' : ''}`}>
          <span className="dot" aria-hidden="true" /> {live === 'open' ? L('ცოცხალი', 'Live') : L('უკავშირდება…', 'Connecting…')}
        </span>
      </div>
      <div className="stack mt-2" style={{ gap: 8, alignItems: 'flex-start' }}>
        {board}
        {reader}
      </div>
      {hw.mode === 'serial' && hw.reader === 'missing' && (
        <p className="small muted mt-2 mb-0">
          {L(
            'შეამოწმე SDA→10, SCK→13, MOSI→11, MISO→12, RST→9, 3.3V→3.3V და GND.',
            'Check SDA→10, SCK→13, MOSI→11, MISO→12, RST→9, 3.3V→3.3V and GND.',
          )}
        </p>
      )}
      {hw.mode === 'mock' && (
        <p className="small muted mt-2 mb-0">
          {STATIC_DEMO
            ? L(
                'ონლაინ დემოში ბარათის მკითხველი არ მუშაობს (საჭიროა ლეპტოპზე გაშვებული backend). გამოიყენე სიმულაცია.',
                'The card reader does not work in the online demo (it needs the backend running on a laptop). Use the simulation.',
              )
            : L(
                'დაფის მისაერთებლად backend/.env-ში ჩაწერე ARDUINO_PORT=auto და გადატვირთე backend. მანამდე გამოიყენე სიმულაცია.',
                'To connect the board, set ARDUINO_PORT=auto in backend/.env and restart the backend. Until then, use the simulation.',
              )}
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
    if (!window.confirm(L(`წავშალო ბარათი ${spaced(uid)}?`, `Delete card ${spaced(uid)}?`))) return;
    const list = await action.run(() => api(`/admin/rfid/cards/${uid}`, { method: 'DELETE' }));
    if (list) setCards(list);
  };
  const simulate = () =>
    action.run(() => api('/admin/rfid/simulate', { method: 'POST', body: { uid: lastCard?.uid || cards[0]?.uid } }));

  if (initial.loading && !initial.data) return <Loading />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>{L('ბარათით შესვლა', 'Card access')}</h1>
        <p>
          {L(
            'ლოქერის 4 განყოფილება: #1–#3 ოთახების გასაღებებია (ჩექინისას იღება), #4 გასაღების დასაბრუნებელია (ჩექაუთისას იღება). მიადე ბარათი RC522 მკითხველს: განყოფილება გაიღება, მოვლენა აქ ჩაიწერება და 5 წამში ისევ დაიკეტება.',
            'The locker has 4 compartments: #1–#3 hold room keys (they open at check-in), #4 is for returning keys (it opens at check-out). Tap a card on the RC522 reader: the compartment opens, the event is logged here and it locks again after 5 seconds.',
          )}
        </p>
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
            <h3 className="mb-0">{L('ჟურნალი', 'Log')}</h3>
            <span className="muted small">{L(`ბოლო ${events.length} მოვლენა`, `Last ${events.length} events`)}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            {events.length === 0 ? (
              <div className="empty">
                <Icon name="key" size={30} />
                <p className="mb-0">{L('ჯერ ცარიელია. მიადე ბარათი მკითხველს.', 'Empty so far. Tap a card on the reader.')}</p>
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
            <h3 className="card-title">{L('ვის უღებს ლოქერს', 'Who can open the locker')}</h3>
            <div className="chips">
              <button type="button" className={`chip${openAny ? ' on' : ''}`} onClick={() => setMode(true)} disabled={action.busy} aria-pressed={openAny}>
                {L('ნებისმიერ ბარათს', 'Any card')}
              </button>
              <button type="button" className={`chip${!openAny ? ' on' : ''}`} onClick={() => setMode(false)} disabled={action.busy} aria-pressed={!openAny}>
                {L('მხოლოდ დაშვებულს', 'Allowed cards only')}
              </button>
            </div>
            {!openAny && cards.length === 0 && (
              <p className="small muted mt-2 mb-0">
                {L('დაშვებული ბარათი ჯერ არ არის: მიადე ბარათი და ქვემოთ დაამატე.', 'No allowed cards yet: tap a card and add it below.')}
              </p>
            )}
          </div>

          {lastUnknown && (
            <form className="card card-body" onSubmit={addCard}>
              <h3 className="card-title">{L('ახალი ბარათი', 'New card')}</h3>
              <div className="uid">{spaced(lastUnknown)}</div>
              <div className="form-row mt-2">
                <input
                  className="input input-sm"
                  placeholder={L('სახელი, მაგ. ნინოს ბარათი', "Name, e.g. Nino's card")}
                  aria-label={L('ბარათის სახელი', 'Card name')}
                  maxLength={60}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <select
                  className="input input-sm"
                  style={{ maxWidth: 110 }}
                  value={lockId}
                  onChange={(e) => setLockId(e.target.value)}
                  aria-label={L('განყოფილება', 'Compartment')}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {L('განყოფილება', 'Compartment')} #{n}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={action.busy}>
                <Icon name="plus" size={14} /> {L('დაშვება', 'Allow')}
              </button>
            </form>
          )}

          <div className="card card-body">
            <h3 className="card-title">{L('დაშვებული ბარათები', 'Allowed cards')}</h3>
            {cards.length === 0 ? (
              <p className="muted small mb-0">{L('ჯერ არცერთი.', 'None yet.')}</p>
            ) : (
              <ul className="service-list">
                {cards.map((c) => (
                  <li key={c.uid}>
                    <div>
                      <div>{c.label || L('უსახელო ბარათი', 'Unnamed card')}</div>
                      <div className="muted small uid">
                        {spaced(c.uid)} · {L('განყოფილება', 'compartment')} #{c.lock_id}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => removeCard(c.uid)}
                      title={L('წაშლა', 'Delete')}
                      aria-label={L(`წაშლა: ${c.label || spaced(c.uid)}`, `Delete: ${c.label || spaced(c.uid)}`)}
                    >
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
              {action.busy ? <Spinner small /> : <Icon name="key" size={14} />} {L('ბარათის სიმულაცია', 'Simulate a card')}
            </button>
            <Link to="/admin" className="btn btn-ghost btn-sm">
              {L('ადმინისტრირება', 'Administration')}
            </Link>
          </div>
          {hw?.mode === 'serial' && !hw.open && (
            <Alert tone="warn">
              {L('სანამ Arduino არ დაუკავშირდება, ბარათი ლოქერს ვერ გააღებს.', 'Until the Arduino connects, cards cannot open the locker.')}
            </Alert>
          )}
        </aside>
      </div>
    </div>
  );
}
