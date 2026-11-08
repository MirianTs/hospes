import { useState } from 'react';
import { api, STATIC_DEMO } from '../api.js';
import Icon from '../components/Icon.jsx';
import LockConnect from '../components/LockConnect.jsx';
import { openCompartment } from '../lockSerial.js';
import MapView from '../components/MapView.jsx';
import { Alert, Badge, ErrorBox, Loading, Spinner, useAction, useApi, VerificationBadge } from '../components/ui.jsx';
import { fmtTime, POI_TYPES, ROLE } from '../format.js';
import { L } from '../prefs.js';

const TABS = () => [
  { id: 'objects', label: L('ობიექტები', 'Properties'), icon: 'home' },
  { id: 'users', label: L('მომხმარებლები', 'Users'), icon: 'users' },
  { id: 'hardware', label: 'Arduino', icon: 'chip' },
];

function PickOnMap({ value, onChange }) {
  const lat = parseFloat(value?.lat);
  const lng = parseFloat(value?.lng);
  const picked = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  return (
    <div className="field">
      <span>{L('ადგილი რუკაზე (დააჭირე რუკას)', 'Location on the map (click the map)')}</span>
      <MapView onPick={onChange} picked={picked} height="220px" fit={false} />
      <div className="form-row mt-1">
        <input
          className="input input-sm"
          placeholder="lat"
          value={value?.lat ?? ''}
          onChange={(e) => onChange({ lat: e.target.value, lng: value?.lng ?? '' })}
          aria-label={L('განედი', 'Latitude')}
        />
        <input
          className="input input-sm"
          placeholder="lng"
          value={value?.lng ?? ''}
          onChange={(e) => onChange({ lat: value?.lat ?? '', lng: e.target.value })}
          aria-label={L('გრძედი', 'Longitude')}
        />
      </div>
    </div>
  );
}

function NewHotel({ owners, onCreated }) {
  const empty = { name: '', address: '', owner_id: '', google_rating: '', description: '', checkin_info: '' };
  const [form, setForm] = useState(empty);
  const [point, setPoint] = useState(null);
  const action = useAction();
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const h = await action.run(() =>
      api('/admin/hotels', { method: 'POST', body: { ...form, owner_id: form.owner_id || null, lat: point?.lat, lng: point?.lng } }),
    );
    if (h) {
      setDone(h);
      setForm(empty);
      setPoint(null);
      onCreated();
    }
  };
  return (
    <form className="card card-body" onSubmit={submit}>
      <h3 className="card-title">{L('ახალი სასტუმრო', 'New property')}</h3>
      <label className="field">
        <span>{L('სახელი', 'Name')}</span>
        <input className="input" required value={form.name} onChange={set('name')} />
      </label>
      <label className="field">
        <span>{L('მისამართი', 'Address')}</span>
        <input className="input" required value={form.address} onChange={set('address')} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>{L('მფლობელი', 'Owner')}</span>
          <select className="input" value={form.owner_id} onChange={set('owner_id')}>
            <option value="">{L('— არ არის —', '— None —')}</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{L('Google რეიტინგი', 'Google rating')}</span>
          <input className="input" type="number" min="0" max="5" step="0.1" value={form.google_rating} onChange={set('google_rating')} />
        </label>
      </div>
      <PickOnMap value={point} onChange={setPoint} />
      <label className="field">
        <span>{L('აღწერა', 'Description')}</span>
        <textarea className="input" value={form.description} onChange={set('description')} />
      </label>
      <label className="field">
        <span>{L('ჩექინის ინსტრუქცია (ჩანს მხოლოდ ჩექინის შემდეგ)', 'Check-in instructions (shown only after check-in)')}</span>
        <input
          className="input"
          placeholder={L('მაგ. გასაღების ყუთი ჭიშკართან', 'e.g. key box by the gate')}
          value={form.checkin_info}
          onChange={set('checkin_info')}
        />
      </label>
      <ErrorBox error={action.error} />
      {done && (
        <Alert tone="success">
          {L('დაემატა:', 'Added:')} {done.name}. {L('ახლა ოთახები დაამატე.', 'Now add its rooms.')}
        </Alert>
      )}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} {L('სასტუმროს დამატება', 'Add property')}
      </button>
    </form>
  );
}

function NewRoom({ hotels, onCreated }) {
  const empty = { hotel_id: '', number: '', title: '', capacity: '2', price: '', lock_id: '' };
  const [form, setForm] = useState(empty);
  const action = useAction();
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      hotel_id: Number(form.hotel_id),
      price: Number(form.price),
      capacity: Number(form.capacity),
      lock_id: form.lock_id ? Number(form.lock_id) : null,
    };
    const r = await action.run(() => api('/admin/rooms', { method: 'POST', body }));
    if (r) {
      setDone(r);
      setForm({ ...empty, hotel_id: form.hotel_id });
      onCreated();
    }
  };
  return (
    <form className="card card-body" onSubmit={submit}>
      <h3 className="card-title">{L('ახალი ოთახი', 'New room')}</h3>
      <label className="field">
        <span>{L('სასტუმრო', 'Property')}</span>
        <select className="input" required value={form.hotel_id} onChange={set('hotel_id')}>
          <option value="">{L('აირჩიე…', 'Choose…')}</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="field">
          <span>{L('ნომერი', 'Number')}</span>
          <input className="input" required value={form.number} onChange={set('number')} />
        </label>
        <label className="field">
          <span>{L('ფასი ღამეში, ₾', 'Price per night, ₾')}</span>
          <input className="input" type="number" min="0" required value={form.price} onChange={set('price')} />
        </label>
        <label className="field">
          <span>{L('ადგილები', 'Guests')}</span>
          <input className="input" type="number" min="1" max="12" value={form.capacity} onChange={set('capacity')} />
        </label>
      </div>
      <label className="field">
        <span>{L('სათაური', 'Title')}</span>
        <input className="input" placeholder={L('მაგ. ორადგილიანი, აივნით', 'e.g. double room with balcony')} value={form.title} onChange={set('title')} />
      </label>
      <label className="field">
        <span>{L('გასაღები: Hospes Lock-ის განყოფილება', 'Key: Hospes Lock compartment')}</span>
        <select className="input" value={form.lock_id} onChange={set('lock_id')}>
          <option value="">{L('კოდიანი ლოქერ-ბოქსი (Arduino-ს გარეშე)', 'Code locker box (no Arduino)')}</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>
              {L('განყოფილება', 'Compartment')} #{n} (servo)
            </option>
          ))}
        </select>
      </label>
      <ErrorBox error={action.error} />
      {done && <Alert tone="success">{L(`ოთახი ${done.number} დაემატა.`, `Room ${done.number} added.`)}</Alert>}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} {L('ოთახის დამატება', 'Add room')}
      </button>
    </form>
  );
}

function NewPoi() {
  const empty = { type: 'cafe', name: '', description: '', google_maps_url: '' };
  const [form, setForm] = useState(empty);
  const [point, setPoint] = useState(null);
  const action = useAction();
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const p = await action.run(() => api('/admin/pois', { method: 'POST', body: { ...form, lat: point?.lat, lng: point?.lng } }));
    if (p) {
      setDone(p);
      setForm(empty);
      setPoint(null);
    }
  };
  return (
    <form className="card card-body" onSubmit={submit}>
      <h3 className="card-title">{L('ახალი ადგილი რუკაზე', 'New place on the map')}</h3>
      <div className="form-row">
        <label className="field">
          <span>{L('კატეგორია', 'Category')}</span>
          <select className="input" value={form.type} onChange={set('type')}>
            {POI_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.one}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{L('სახელი', 'Name')}</span>
          <input className="input" required value={form.name} onChange={set('name')} />
        </label>
      </div>
      <label className="field">
        <span>{L('აღწერა', 'Description')}</span>
        <input className="input" value={form.description} onChange={set('description')} />
      </label>
      <PickOnMap value={point} onChange={setPoint} />
      <label className="field">
        <span>{L('Google Maps ბმული (არასავალდებულო)', 'Google Maps link (optional)')}</span>
        <input className="input" type="url" value={form.google_maps_url} onChange={set('google_maps_url')} />
      </label>
      <ErrorBox error={action.error} />
      {done && <Alert tone="success">{L('დაემატა:', 'Added:')} {done.name}</Alert>}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} {L('ადგილის დამატება', 'Add place')}
      </button>
    </form>
  );
}

function UsersTab() {
  const users = useApi('/admin/users');
  const action = useAction();
  const update = async (u, patch) => {
    const updated = await action.run(() => api(`/admin/users/${u.id}`, { method: 'PATCH', body: patch }));
    if (updated) users.setData((list) => list.map((x) => (x.id === updated.id ? updated : x)));
  };
  if (users.loading && !users.data) return <Loading />;
  return (
    <div className="card">
      <ErrorBox error={users.error || action.error} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{L('მომხმარებელი', 'User')}</th>
              <th>{L('როლი', 'Role')}</th>
              <th>{L('ვერიფიკაცია', 'Verification')}</th>
              <th className="num">{L('სახეების მანძილი', 'Face distance')}</th>
            </tr>
          </thead>
          <tbody>
            {(users.data || []).map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <div className="muted small">{u.email}</div>
                </td>
                <td>
                  <select className="input input-sm" value={u.role} onChange={(e) => update(u, { role: e.target.value })} aria-label={L('როლი', 'Role')}>
                    {Object.entries(ROLE).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="inline" style={{ flexWrap: 'nowrap' }}>
                    <VerificationBadge status={u.verification_status} />
                    <select
                      className="input input-sm"
                      style={{ width: 'auto' }}
                      value={u.verification_status}
                      onChange={(e) => update(u, { verification_status: e.target.value })}
                      aria-label={L('ვერიფიკაციის სტატუსი', 'Verification status')}
                    >
                      <option value="unverified">{L('გასავლელი', 'Not verified')}</option>
                      <option value="verified">{L('დადასტურებული', 'Verified')}</option>
                      <option value="rejected">{L('უარყოფილი', 'Rejected')}</option>
                    </select>
                  </div>
                </td>
                <td className="num">{u.face_distance != null ? u.face_distance.toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HardwareTab() {
  const hw = useApi('/admin/hardware');
  const action = useAction();
  const [last, setLast] = useState(null);
  const open = async (n) => {
    const res = await action.run(() => api(`/admin/locks/${n}/open`, { method: 'POST' }));
    if (res) {
      const sent = await openCompartment(n);
      setLast({ ...res, sent });
      setTimeout(hw.reload, 400);
    }
  };
  const s = hw.data;
  return (
    <div className="grid grid-2">
      <div className="card card-body">
        <div className="spread">
          <h3 className="mb-0">{L('კავშირი', 'Connection')}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={hw.reload}>
            <Icon name="refresh" size={14} /> {L('განახლება', 'Refresh')}
          </button>
        </div>
        <ErrorBox error={hw.error} />
        {s && (
          <dl className="kv mt-2">
            <dt>{L('რეჟიმი', 'Mode')}</dt>
            <dd>{s.mode === 'mock' ? <Badge tone="gold">{L('დემო (ARDUINO_PORT არ არის)', 'Demo (no ARDUINO_PORT)')}</Badge> : <Badge tone="blue">Serial</Badge>}</dd>
            <dt>{L('პორტი', 'Port')}</dt>
            <dd>{s.path || '—'}</dd>
            <dt>{L('სტატუსი', 'Status')}</dt>
            <dd>
              {s.mode === 'mock' ? (
                '—'
              ) : s.open ? (
                <Badge tone="green">
                  {L('დაკავშირებულია', 'Connected')}
                  {s.ready ? '' : L(' (ირთვება…)', ' (starting…)')}
                </Badge>
              ) : (
                <Badge tone="red">{L('არ არის დაკავშირებული', 'Not connected')}</Badge>
              )}
            </dd>
            {s.lastError && (
              <>
                <dt>{L('შეცდომა', 'Error')}</dt>
                <dd className="small">{s.lastError}</dd>
              </>
            )}
            <dt>{L('COM პორტები', 'COM ports')}</dt>
            <dd className="small">{s.ports.length ? s.ports.map((p) => `${p.path} ${p.manufacturer || ''}`).join(', ') : L('ვერ მოიძებნა', 'None found')}</dd>
          </dl>
        )}
        <hr className="divider" />
        <div className="label">{L('საკეტის ტესტი', 'Lock test')}</div>
        <LockConnect />
        <div className="inline mt-1">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" className="btn btn-outline" disabled={action.busy} onClick={() => open(n)}>
              <Icon name="unlock" size={15} /> OPEN{n}{n === 4 ? L(' (დაბრუნება)', ' (return)') : ''}
            </button>
          ))}
        </div>
        <ErrorBox error={action.error} />
        {last && (
          <p className="small muted mt-1 mb-0">
            {L('ბოლო:', 'Last:')} OPEN{last.lock_id} →{' '}
            {last.sent
              ? L('გაიგზავნა USB-ით (ბრაუზერიდან)', 'sent over USB (from the browser)')
              : last.hardware === 'mock'
                ? L('ჩაიწერა ლოგში (დემო)', 'written to the log (demo)')
                : L('გაიგზავნა დაფაზე', 'sent to the board')}
          </p>
        )}
      </div>
      <div className="card card-body">
        <h3 className="card-title">{L('Serial ლოგი', 'Serial log')}</h3>
        <pre className="small" style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Consolas, monospace' }}>
          {s?.log.length ? s.log.map((l) => `${fmtTime(l.at)}  ${l.line}`).join('\n') : L('ჯერ ცარიელია', 'Empty so far')}
        </pre>
        <p className="muted small mt-2 mb-0">
          {STATIC_DEMO
            ? L(
                'ონლაინ დემოში დაფა ბრაუზერს USB-ით უერთდება: დააჭირე „Hospes Lock-ის მიერთებას“ (Chrome ან Edge). ღილაკები და ჩექინი/ჩექაუთი OPEN<N>-ს პირდაპირ აგზავნის.',
                'In the online demo the board connects to the browser over USB: click "Connect Hospes Lock" (Chrome or Edge). The buttons and check-in/check-out send OPEN<N> directly.',
              )
            : L(
                'დაფის მისაერთებლად backend/.env-ში ჩაწერე ARDUINO_PORT=COM3 (ან auto) და გადატვირთე backend. ან ბრაუზერიდან: „Hospes Lock-ის მიერთება“.',
                'To connect the board, set ARDUINO_PORT=COM3 (or auto) in backend/.env and restart the backend. Or from the browser: "Connect Hospes Lock".',
              )}
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('objects');
  const users = useApi('/admin/users');
  const hotels = useApi('/hotels');
  const owners = (users.data || []).filter((u) => u.role === 'owner');

  return (
    <div className="container">
      <div className="page-head">
        <h1>{L('ადმინისტრირება', 'Administration')}</h1>
        <p>
          {L(
            'ობიექტებს, ოთახებსა და რუკის ადგილებს მხოლოდ ადმინი ამატებს. აქვეა მომხმარებლები და Arduino-ს შემოწმება.',
            'Only an admin adds properties, rooms and map places. Users and the Arduino check are here too.',
          )}
        </p>
      </div>
      <div className="tabs" role="tablist">
        {TABS().map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'objects' && (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <NewHotel owners={owners} onCreated={hotels.reload} />
          <div className="stack" style={{ gap: 20 }}>
            <NewRoom hotels={hotels.data || []} onCreated={hotels.reload} />
            <NewPoi />
          </div>
        </div>
      )}
      {tab === 'users' && <UsersTab />}
      {tab === 'hardware' && <HardwareTab />}
    </div>
  );
}
