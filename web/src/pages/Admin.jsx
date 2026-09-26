import { useState } from 'react';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { Alert, Badge, ErrorBox, Loading, Spinner, useAction, useApi, VerificationBadge } from '../components/ui.jsx';
import { fmtTime, POI_TYPES, ROLE } from '../format.js';

const TABS = [
  { id: 'objects', label: 'ობიექტები', icon: 'home' },
  { id: 'users', label: 'მომხმარებლები', icon: 'users' },
  { id: 'hardware', label: 'Arduino', icon: 'chip' },
];

function PickOnMap({ value, onChange }) {
  const lat = parseFloat(value?.lat);
  const lng = parseFloat(value?.lng);
  const picked = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  return (
    <div className="field">
      <span>ადგილი რუკაზე (დააჭირე რუკას)</span>
      <MapView onPick={onChange} picked={picked} height="220px" fit={false} />
      <div className="form-row mt-1">
        <input
          className="input input-sm"
          placeholder="lat"
          value={value?.lat ?? ''}
          onChange={(e) => onChange({ lat: e.target.value, lng: value?.lng ?? '' })}
          aria-label="განედი"
        />
        <input
          className="input input-sm"
          placeholder="lng"
          value={value?.lng ?? ''}
          onChange={(e) => onChange({ lat: value?.lat ?? '', lng: e.target.value })}
          aria-label="გრძედი"
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
      <h3 className="card-title">ახალი სასტუმრო</h3>
      <label className="field">
        <span>სახელი</span>
        <input className="input" required value={form.name} onChange={set('name')} />
      </label>
      <label className="field">
        <span>მისამართი</span>
        <input className="input" required value={form.address} onChange={set('address')} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>მფლობელი</span>
          <select className="input" value={form.owner_id} onChange={set('owner_id')}>
            <option value="">— არ არის —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Google რეიტინგი</span>
          <input className="input" type="number" min="0" max="5" step="0.1" value={form.google_rating} onChange={set('google_rating')} />
        </label>
      </div>
      <PickOnMap value={point} onChange={setPoint} />
      <label className="field">
        <span>აღწერა</span>
        <textarea className="input" value={form.description} onChange={set('description')} />
      </label>
      <label className="field">
        <span>ჩექინის ინსტრუქცია (ჩანს მხოლოდ ჩექინის შემდეგ)</span>
        <input className="input" placeholder="მაგ. გასაღების ყუთი ჭიშკართან" value={form.checkin_info} onChange={set('checkin_info')} />
      </label>
      <ErrorBox error={action.error} />
      {done && <Alert tone="success">დაემატა: {done.name}. ახლა ოთახები დაამატე.</Alert>}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} სასტუმროს დამატება
      </button>
    </form>
  );
}

function NewRoom({ hotels, onCreated }) {
  const empty = { hotel_id: '', number: '', title: '', capacity: '2', price: '', key_type: 'box', lock_id: '1' };
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
      lock_id: form.key_type === 'smartlock' ? Number(form.lock_id) : null,
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
      <h3 className="card-title">ახალი ოთახი</h3>
      <label className="field">
        <span>სასტუმრო</span>
        <select className="input" required value={form.hotel_id} onChange={set('hotel_id')}>
          <option value="">აირჩიე…</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="field">
          <span>ნომერი</span>
          <input className="input" required value={form.number} onChange={set('number')} />
        </label>
        <label className="field">
          <span>ფასი ღამეში, ₾</span>
          <input className="input" type="number" min="0" required value={form.price} onChange={set('price')} />
        </label>
        <label className="field">
          <span>ადგილები</span>
          <input className="input" type="number" min="1" max="12" value={form.capacity} onChange={set('capacity')} />
        </label>
      </div>
      <label className="field">
        <span>სათაური</span>
        <input className="input" placeholder="მაგ. ორადგილიანი, აივნით" value={form.title} onChange={set('title')} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>შესვლის ტიპი</span>
          <select className="input" value={form.key_type} onChange={set('key_type')}>
            <option value="box">კოდი და გასაღების ყუთი</option>
            <option value="smartlock">ჭკვიანი საკეტი (Arduino)</option>
          </select>
        </label>
        {form.key_type === 'smartlock' && (
          <label className="field">
            <span>საკეტი (servo 1–4)</span>
            <select className="input" value={form.lock_id} onChange={set('lock_id')}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  #{n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ErrorBox error={action.error} />
      {done && <Alert tone="success">ოთახი {done.number} დაემატა.</Alert>}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} ოთახის დამატება
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
      <h3 className="card-title">ახალი ადგილი რუკაზე</h3>
      <div className="form-row">
        <label className="field">
          <span>კატეგორია</span>
          <select className="input" value={form.type} onChange={set('type')}>
            {POI_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.one}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>სახელი</span>
          <input className="input" required value={form.name} onChange={set('name')} />
        </label>
      </div>
      <label className="field">
        <span>აღწერა</span>
        <input className="input" value={form.description} onChange={set('description')} />
      </label>
      <PickOnMap value={point} onChange={setPoint} />
      <label className="field">
        <span>Google Maps ბმული (არასავალდებულო)</span>
        <input className="input" type="url" value={form.google_maps_url} onChange={set('google_maps_url')} />
      </label>
      <ErrorBox error={action.error} />
      {done && <Alert tone="success">დაემატა: {done.name}</Alert>}
      <button type="submit" className="btn btn-primary mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="plus" size={16} />} ადგილის დამატება
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
              <th>მომხმარებელი</th>
              <th>როლი</th>
              <th>ვერიფიკაცია</th>
              <th className="num">სახეების მანძილი</th>
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
                  <select className="input input-sm" value={u.role} onChange={(e) => update(u, { role: e.target.value })} aria-label="როლი">
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
                      aria-label="ვერიფიკაციის სტატუსი"
                    >
                      <option value="unverified">გასავლელი</option>
                      <option value="verified">დადასტურებული</option>
                      <option value="rejected">უარყოფილი</option>
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
      setLast(res);
      setTimeout(hw.reload, 400);
    }
  };
  const s = hw.data;
  return (
    <div className="grid grid-2">
      <div className="card card-body">
        <div className="spread">
          <h3 className="mb-0">კავშირი</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={hw.reload}>
            <Icon name="refresh" size={14} /> განახლება
          </button>
        </div>
        <ErrorBox error={hw.error} />
        {s && (
          <dl className="kv mt-2">
            <dt>რეჟიმი</dt>
            <dd>{s.mode === 'mock' ? <Badge tone="gold">დემო (ARDUINO_PORT არ არის)</Badge> : <Badge tone="blue">Serial</Badge>}</dd>
            <dt>პორტი</dt>
            <dd>{s.path || '—'}</dd>
            <dt>სტატუსი</dt>
            <dd>
              {s.mode === 'mock' ? '—' : s.open ? <Badge tone="green">დაკავშირებულია{s.ready ? '' : ' (ირთვება…)'}</Badge> : <Badge tone="red">არ არის დაკავშირებული</Badge>}
            </dd>
            {s.lastError && (
              <>
                <dt>შეცდომა</dt>
                <dd className="small">{s.lastError}</dd>
              </>
            )}
            <dt>COM პორტები</dt>
            <dd className="small">{s.ports.length ? s.ports.map((p) => `${p.path} ${p.manufacturer || ''}`).join(', ') : 'ვერ მოიძებნა'}</dd>
          </dl>
        )}
        <hr className="divider" />
        <div className="label">საკეტის ტესტი</div>
        <div className="inline mt-1">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" className="btn btn-outline" disabled={action.busy} onClick={() => open(n)}>
              <Icon name="unlock" size={15} /> OPEN{n}
            </button>
          ))}
        </div>
        <ErrorBox error={action.error} />
        {last && (
          <p className="small muted mt-1 mb-0">
            ბოლო: OPEN{last.lock_id} → {last.hardware === 'mock' ? 'ჩაიწერა ლოგში (დემო)' : 'გაიგზავნა დაფაზე'}
          </p>
        )}
      </div>
      <div className="card card-body">
        <h3 className="card-title">Serial ლოგი</h3>
        <pre className="small" style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, Consolas, monospace' }}>
          {s?.log.length ? s.log.map((l) => `${fmtTime(l.at)}  ${l.line}`).join('\n') : 'ჯერ ცარიელია'}
        </pre>
        <p className="muted small mt-2 mb-0">
          დაფის მისაერთებლად backend/.env-ში ჩაწერე ARDUINO_PORT=COM3 (ან auto) და გადატვირთე backend.
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
        <h1>ადმინისტრირება</h1>
        <p>ობიექტებს, ოთახებსა და რუკის ადგილებს მხოლოდ ადმინი ამატებს. აქვეა მომხმარებლები და Arduino-ს შემოწმება.</p>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
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
