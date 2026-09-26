import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Spinner, StatusBadge, useAction, useApi, VerificationBadge } from '../components/ui.jsx';
import { addDays, fmtDate, fmtDateTime, fmtRange, money, todayStr } from '../format.js';

const TABS = [
  { id: 'bookings', label: 'ჯავშნები', icon: 'calendar' },
  { id: 'rooms', label: 'ოთახები და ფასები', icon: 'home' },
  { id: 'requests', label: 'მოთხოვნები', icon: 'bell' },
  { id: 'services', label: 'სერვისები', icon: 'coffee' },
  { id: 'blocks', label: 'გარე ჯავშნები', icon: 'ban' },
];

function BookingsTab({ bookings, showHotel }) {
  const [all, setAll] = useState(false);
  const t = todayStr();
  const rows = (bookings.data || [])
    .filter((b) => all || (b.status !== 'cancelled' && b.check_out >= t))
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
  return (
    <div className="card">
      <div className="card-body spread" style={{ paddingBottom: 8 }}>
        <div className="chips">
          <button type="button" className={`chip${!all ? ' on' : ''}`} onClick={() => setAll(false)}>
            მიმდინარე და მომავალი
          </button>
          <button type="button" className={`chip${all ? ' on' : ''}`} onClick={() => setAll(true)}>
            ყველა
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={bookings.reload}>
          <Icon name="refresh" size={14} /> განახლება
        </button>
      </div>
      <ErrorBox error={bookings.error} />
      {bookings.loading && !bookings.data && <Loading />}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              {showHotel && <th>ობიექტი</th>}
              <th>ოთახი</th>
              <th>სტუმარი / წყარო</th>
              <th>თარიღები</th>
              <th>სტატუსი</th>
              <th className="num">თანხა</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className={b.status === 'cancelled' ? 'dim' : ''}>
                <td className="muted">{b.id}</td>
                {showHotel && <td>{b.hotel_name}</td>}
                <td className="nowrap">
                  {b.room_number} <KeyBadge type={b.key_type} />
                </td>
                <td>
                  {b.source === 'external' ? (
                    <span className="inline">
                      <Badge tone="blue" icon="external">
                        გარე
                      </Badge>
                      {b.note}
                    </span>
                  ) : (
                    <div>
                      <div className="inline">
                        {b.guest_name}
                        {b.pending_requests > 0 && (
                          <Badge tone="gold" icon="bell">
                            {b.pending_requests}
                          </Badge>
                        )}
                      </div>
                      <div className="muted small">{b.guest_phone || b.guest_email}</div>
                    </div>
                  )}
                </td>
                <td className="nowrap">
                  {fmtRange(b.check_in, b.check_out)}
                  {b.check_in === t && ['pending', 'confirmed'].includes(b.status) && (
                    <div>
                      <Badge tone="green">დღეს ჩამოდის</Badge>
                    </div>
                  )}
                </td>
                <td>
                  <StatusBadge status={b.status} />
                  {b.source === 'internal' && b.guest_verification && (
                    <div className="mt-1">
                      <VerificationBadge status={b.guest_verification} />
                    </div>
                  )}
                </td>
                <td className="num">{b.source === 'external' ? '—' : money(b.total_price)}</td>
              </tr>
            ))}
            {bookings.data && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  ჯავშნები არ არის.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoomRow({ room, onSaved }) {
  const [price, setPrice] = useState(String(room.price));
  const [status, setStatus] = useState(room.status);
  const action = useAction();
  const dirty = Number(price) !== room.price || status !== room.status;
  const save = async () => {
    const updated = await action.run(() => api(`/rooms/${room.id}`, { method: 'PATCH', body: { price: Number(price), status } }));
    if (updated) onSaved(updated);
  };
  return (
    <tr>
      <td className="nowrap">
        <strong>{room.number}</strong>
        <div className="muted small">{room.title}</div>
      </td>
      <td className="nowrap">
        <KeyBadge type={room.key_type} />
        {room.lock_id && <div className="muted small mt-1">Arduino საკეტი #{room.lock_id}</div>}
      </td>
      <td>
        <div className="inline" style={{ flexWrap: 'nowrap' }}>
          <input
            className="input input-sm"
            type="number"
            min="0"
            step="5"
            style={{ width: 96 }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label={`ოთახი ${room.number}: ფასი`}
          />
          <span className="muted">₾</span>
        </div>
      </td>
      <td>
        <select className="input input-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="სტატუსი">
          <option value="available">ღიაა ჯავშნისთვის</option>
          <option value="maintenance">დროებით დახურული</option>
        </select>
      </td>
      <td className="num">
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || action.busy} onClick={save}>
          {action.busy ? <Spinner small /> : <Icon name="check" size={14} />} შენახვა
        </button>
        {action.error && <div className="small" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
      </td>
    </tr>
  );
}

function RoomsTab({ hotels, setHotels }) {
  const replaceRoom = (updated) =>
    setHotels((list) =>
      list.map((h) => (h.id === updated.hotel_id ? { ...h, rooms: h.rooms.map((r) => (r.id === updated.id ? updated : r)) } : h)),
    );
  return (
    <div className="stack" style={{ gap: 16 }}>
      {hotels.map((h) => (
        <div key={h.id} className="card">
          <div className="card-body" style={{ paddingBottom: 4 }}>
            <h3 className="mb-0">{h.name}</h3>
            <div className="muted small">{h.address}</div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ოთახი</th>
                  <th>შესვლა</th>
                  <th>ფასი ღამეში</th>
                  <th>სტატუსი</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {h.rooms.map((r) => (
                  <RoomRow key={`${r.id}-${r.price}-${r.status}`} room={r} onSaved={replaceRoom} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="muted small">ახალ ოთახს ან ობიექტს ადმინისტრატორი ამატებს.</p>
    </div>
  );
}

function RequestsTab({ requests, showHotel, onChange }) {
  const action = useAction();
  const setStatus = async (r, status) => {
    if (await action.run(() => api(`/owner/service-requests/${r.id}`, { method: 'PATCH', body: { status } }))) onChange();
  };
  const rows = requests.data || [];
  return (
    <div className="card">
      <ErrorBox error={requests.error || action.error} />
      {requests.loading && !requests.data && <Loading />}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>სერვისი</th>
              {showHotel && <th>ობიექტი</th>}
              <th>სტუმარი</th>
              <th>კომენტარი</th>
              <th>დრო</th>
              <th>სტატუსი</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === 'done' ? 'dim' : ''}>
                <td>
                  <strong>{r.service_name}</strong>
                  <div className="muted small">{r.service_price ? money(r.service_price) : 'უფასო'}</div>
                </td>
                {showHotel && <td>{r.hotel_name}</td>}
                <td>
                  {r.guest_name}
                  <div className="muted small">ოთახი {r.room_number}</div>
                </td>
                <td className="small">{r.note || <span className="muted">—</span>}</td>
                <td className="small nowrap">{fmtDateTime(r.created_at)}</td>
                <td>
                  <Badge tone={r.status === 'done' ? 'green' : 'gold'}>{r.status === 'done' ? 'შესრულდა' : 'მოლოდინში'}</Badge>
                </td>
                <td className="num">
                  {r.status === 'pending' ? (
                    <button type="button" className="btn btn-success btn-sm" disabled={action.busy} onClick={() => setStatus(r, 'done')}>
                      <Icon name="check" size={14} /> შესრულდა
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={action.busy} onClick={() => setStatus(r, 'pending')}>
                      დაბრუნება
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests.data && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  მოთხოვნები ჯერ არ არის.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServiceRow({ service, onChange }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: service.name, price: String(service.price), description: service.description || '' });
  const action = useAction();
  const save = async () => {
    const body = { ...form, price: Number(form.price) };
    if (await action.run(() => api(`/owner/services/${service.id}`, { method: 'PATCH', body }))) {
      setEdit(false);
      onChange();
    }
  };
  const remove = async () => {
    if (!window.confirm(`წავშალო სერვისი „${service.name}“?`)) return;
    if (await action.run(() => api(`/owner/services/${service.id}`, { method: 'DELETE' }))) onChange();
  };
  if (edit) {
    return (
      <li className="stack" style={{ gap: 8 }}>
        <div className="form-row">
          <input className="input input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="სახელი" />
          <input
            className="input input-sm"
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            aria-label="ფასი"
            style={{ maxWidth: 110 }}
          />
        </div>
        <input
          className="input input-sm"
          placeholder="აღწერა"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {action.error && <div className="small" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
        <div className="inline">
          <button type="button" className="btn btn-primary btn-sm" disabled={action.busy} onClick={save}>
            შენახვა
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>
            გაუქმება
          </button>
        </div>
      </li>
    );
  }
  return (
    <li>
      <div>
        <div>{service.name}</div>
        {service.description && <div className="muted small">{service.description}</div>}
      </div>
      <div className="inline" style={{ flexWrap: 'nowrap' }}>
        <strong className="nowrap">{service.price ? money(service.price) : 'უფასო'}</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>
          შეცვლა
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={remove} title="წაშლა" aria-label="წაშლა">
          <Icon name="trash" size={15} />
        </button>
      </div>
    </li>
  );
}

function NewService({ hotelId, onChange }) {
  const [form, setForm] = useState({ name: '', price: '', description: '' });
  const action = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const body = { hotel_id: hotelId, ...form, price: Number(form.price || 0) };
    if (await action.run(() => api('/owner/services', { method: 'POST', body }))) {
      setForm({ name: '', price: '', description: '' });
      onChange();
    }
  };
  return (
    <form onSubmit={submit} className="mt-2">
      <div className="form-row">
        <input className="input input-sm" required placeholder="ახალი სერვისი, მაგ. გვიანი ჩექაუთი" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          className="input input-sm"
          type="number"
          min="0"
          placeholder="ფასი ₾"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          style={{ maxWidth: 110 }}
        />
        <button type="submit" className="btn btn-outline btn-sm" style={{ flex: '0 0 auto' }} disabled={action.busy}>
          <Icon name="plus" size={14} /> დამატება
        </button>
      </div>
      {action.error && <div className="small mt-1" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
    </form>
  );
}

function ServicesTab({ hotels, onChange }) {
  return (
    <div className="grid grid-2">
      {hotels.map((h) => (
        <div key={h.id} className="card card-body">
          <h3 className="card-title">{h.name}</h3>
          <ul className="service-list">
            {h.services.map((s) => (
              <ServiceRow key={`${s.id}-${s.name}-${s.price}`} service={s} onChange={onChange} />
            ))}
          </ul>
          <NewService hotelId={h.id} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function BlocksTab({ hotels, bookings, onChange }) {
  const t = todayStr();
  const rooms = hotels.flatMap((h) => h.rooms.map((r) => ({ ...r, hotel_name: h.name })));
  const [form, setForm] = useState({ room_id: rooms[0]?.id || '', check_in: t, check_out: addDays(t, 2), note: 'Booking.com' });
  const create = useAction();
  const remove = useAction();
  const [created, setCreated] = useState(null);
  const blocks = (bookings.data || [])
    .filter((b) => b.source === 'external' && b.status !== 'cancelled' && b.check_out >= t)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));

  const submit = async (e) => {
    e.preventDefault();
    const b = await create.run(() => api('/owner/blocks', { method: 'POST', body: { ...form, room_id: Number(form.room_id) } }));
    if (b) {
      setCreated(b);
      onChange();
    }
  };
  const unblock = async (b) => {
    if (!window.confirm(`მოვხსნა ბლოკი: ოთახი ${b.room_number}, ${fmtRange(b.check_in, b.check_out)}?`)) return;
    if (await remove.run(() => api(`/owner/blocks/${b.id}`, { method: 'DELETE' }))) onChange();
  };

  return (
    <div className="two-col">
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 4 }}>
          <h3 className="mb-0">დაბლოკილი თარიღები</h3>
          <p className="muted small mb-0">სხვაგან გაკეთებული ჯავშნები: ამ თარიღებზე Hospes-ში ოთახს ვეღარავინ დაჯავშნის.</p>
        </div>
        <ErrorBox error={remove.error} />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ოთახი</th>
                <th>თარიღები</th>
                <th>წყარო</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td>
                    {b.room_number}
                    <div className="muted small">{b.hotel_name}</div>
                  </td>
                  <td className="nowrap">{fmtRange(b.check_in, b.check_out)}</td>
                  <td>{b.note}</td>
                  <td className="num">
                    <button type="button" className="btn btn-danger btn-sm" disabled={remove.busy} onClick={() => unblock(b)}>
                      მოხსნა
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.data && blocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    გარე ჯავშნები არ არის.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <form className="card card-body sticky" onSubmit={submit}>
        <h3 className="card-title">ახალი ბლოკი</h3>
        <label className="field">
          <span>ოთახი</span>
          <select className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.hotel_name} · ოთახი {r.number}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            <span>შესვლა</span>
            <input
              className="input"
              type="date"
              min={t}
              value={form.check_in}
              onChange={(e) => {
                const ci = e.target.value;
                setForm((f) => ({ ...f, check_in: ci, check_out: f.check_out > ci ? f.check_out : addDays(ci, 1) }));
              }}
            />
          </label>
          <label className="field">
            <span>გასვლა</span>
            <input
              className="input"
              type="date"
              min={addDays(form.check_in, 1)}
              value={form.check_out}
              onChange={(e) => setForm({ ...form, check_out: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>წყარო / შენიშვნა</span>
          <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Booking.com #1234" />
        </label>
        <ErrorBox error={create.error} />
        {created && !create.error && (
          <Alert tone="success">
            დაიბლოკა: ოთახი {created.room_number}, {fmtDate(created.check_in)} – {fmtDate(created.check_out, true)}.
          </Alert>
        )}
        <button type="submit" className="btn btn-primary btn-block mt-2" disabled={create.busy || !form.room_id}>
          {create.busy ? <Spinner small /> : <Icon name="ban" size={16} />} თარიღების დაბლოკვა
        </button>
      </form>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const hotels = useApi('/owner/hotels');
  const [hotelId, setHotelId] = useState('all');
  const [tab, setTab] = useState('bookings');
  const query = hotelId === 'all' ? '' : `?hotel_id=${hotelId}`;
  const bookings = useApi(`/owner/bookings${query}`);
  const requests = useApi(`/owner/service-requests${query}`);

  const selected = useMemo(
    () => (hotels.data || []).filter((h) => hotelId === 'all' || h.id === Number(hotelId)),
    [hotels.data, hotelId],
  );

  const t = todayStr();
  const list = bookings.data || [];
  const live = list.filter((b) => b.status !== 'cancelled');
  const stats = [
    { l: 'დღეს ჩამოდის', v: live.filter((b) => b.check_in === t).length },
    { l: 'ახლა შესახლებულია', v: list.filter((b) => b.status === 'checked_in').length },
    { l: 'მომავალი ჯავშნები', v: live.filter((b) => b.check_in > t).length },
    {
      l: 'შემოსავალი Hospes-ით',
      v: money(list.filter((b) => b.source === 'internal' && b.paid).reduce((sum, b) => sum + b.total_price, 0)),
    },
  ];
  const pendingRequests = (requests.data || []).filter((r) => r.status === 'pending').length;

  if (hotels.loading && !hotels.data) return <Loading />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>მფლობელის დეშბორდი</h1>
        <p>
          {user.name} · {hotels.data?.length || 0} ობიექტი
        </p>
      </div>
      <ErrorBox error={hotels.error} onRetry={hotels.reload} />
      {hotels.data?.length === 0 && <Alert tone="info">თქვენზე ჯერ არცერთი ობიექტი არ არის მიბმული. მიმართეთ ადმინისტრატორს.</Alert>}

      {hotels.data?.length > 0 && (
        <>
          {hotels.data.length > 1 && (
            <div className="hotel-switch">
              <button type="button" className={`chip${hotelId === 'all' ? ' on' : ''}`} onClick={() => setHotelId('all')}>
                ყველა ობიექტი
              </button>
              {hotels.data.map((h) => (
                <button key={h.id} type="button" className={`chip${hotelId === String(h.id) ? ' on' : ''}`} onClick={() => setHotelId(String(h.id))}>
                  {h.name}
                </button>
              ))}
            </div>
          )}

          <div className="stats">
            {stats.map((s) => (
              <div key={s.l} className="card stat">
                <div className="v">{bookings.data ? s.v : '…'}</div>
                <div className="l">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="tabs" role="tablist">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                type="button"
                role="tab"
                aria-selected={tab === tb.id}
                className={`tab${tab === tb.id ? ' on' : ''}`}
                onClick={() => setTab(tb.id)}
              >
                <Icon name={tb.icon} size={16} /> {tb.label}
                {tb.id === 'requests' && pendingRequests > 0 && <span className="count">{pendingRequests}</span>}
              </button>
            ))}
          </div>

          {tab === 'bookings' && <BookingsTab bookings={bookings} showHotel={hotelId === 'all' && hotels.data.length > 1} />}
          {tab === 'rooms' && <RoomsTab hotels={selected} setHotels={hotels.setData} />}
          {tab === 'requests' && (
            <RequestsTab
              requests={requests}
              showHotel={hotelId === 'all' && hotels.data.length > 1}
              onChange={() => {
                requests.reload();
                bookings.reload();
              }}
            />
          )}
          {tab === 'services' && <ServicesTab hotels={selected} onChange={hotels.reload} />}
          {tab === 'blocks' && <BlocksTab key={hotelId} hotels={selected} bookings={bookings} onChange={bookings.reload} />}
        </>
      )}
    </div>
  );
}
