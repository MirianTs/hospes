import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Spinner, StatusBadge, useAction, useApi, VerificationBadge } from '../components/ui.jsx';
import { addDays, fmtDate, fmtDateTime, fmtRange, money, todayStr } from '../format.js';
import { L } from '../prefs.js';

const TABS = () => [
  { id: 'bookings', label: L('ჯავშნები', 'Bookings'), icon: 'calendar' },
  { id: 'rooms', label: L('ოთახები და ფასები', 'Rooms and prices'), icon: 'home' },
  { id: 'requests', label: L('მოთხოვნები', 'Requests'), icon: 'bell' },
  { id: 'services', label: L('სერვისები', 'Services'), icon: 'coffee' },
  { id: 'blocks', label: L('გარე ჯავშნები', 'External bookings'), icon: 'ban' },
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
            {L('მიმდინარე და მომავალი', 'Current and upcoming')}
          </button>
          <button type="button" className={`chip${all ? ' on' : ''}`} onClick={() => setAll(true)}>
            {L('ყველა', 'All')}
          </button>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={bookings.reload}>
          <Icon name="refresh" size={14} /> {L('განახლება', 'Refresh')}
        </button>
      </div>
      <ErrorBox error={bookings.error} />
      {bookings.loading && !bookings.data && <Loading />}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              {showHotel && <th>{L('ობიექტი', 'Property')}</th>}
              <th>{L('ოთახი', 'Room')}</th>
              <th>{L('სტუმარი / წყარო', 'Guest / source')}</th>
              <th>{L('თარიღები', 'Dates')}</th>
              <th>{L('სტატუსი', 'Status')}</th>
              <th className="num">{L('თანხა', 'Amount')}</th>
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
                        {L('გარე', 'External')}
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
                      <Badge tone="green">{L('დღეს ჩამოდის', 'Arriving today')}</Badge>
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
                  {L('ჯავშნები არ არის.', 'No bookings.')}
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
  // An emptied field would be sent as Number('') = 0 and make the room free.
  const priceOk = price.trim() !== '' && Number(price) >= 0 && Number(price) <= 10000;
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
        {room.lock_id && <div className="muted small mt-1">{L('ლოქერის განყოფილება', 'Locker compartment')} #{room.lock_id}</div>}
      </td>
      <td>
        <div className="inline" style={{ flexWrap: 'nowrap' }}>
          <input
            className="input input-sm"
            type="number"
            min="0"
            max="10000"
            step="5"
            style={{ width: 96 }}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label={L(`ოთახი ${room.number}: ფასი`, `Room ${room.number}: price`)}
          />
          <span className="muted">₾</span>
        </div>
      </td>
      <td>
        <select className="input input-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={L('სტატუსი', 'Status')}>
          <option value="available">{L('ღიაა ჯავშნისთვის', 'Open for booking')}</option>
          <option value="maintenance">{L('დროებით დახურული', 'Temporarily closed')}</option>
        </select>
      </td>
      <td className="num">
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || !priceOk || action.busy} onClick={save}>
          {action.busy ? <Spinner small /> : <Icon name="check" size={14} />} {L('შენახვა', 'Save')}
        </button>
        {action.error && <div className="small" role="alert" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
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
                  <th>{L('ოთახი', 'Room')}</th>
                  <th>{L('შესვლა', 'Access')}</th>
                  <th>{L('ფასი ღამეში', 'Price per night')}</th>
                  <th>{L('სტატუსი', 'Status')}</th>
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
      <p className="muted small">{L('ახალ ოთახს ან ობიექტს ადმინისტრატორი ამატებს.', 'New rooms and properties are added by an administrator.')}</p>
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
              <th>{L('სერვისი', 'Service')}</th>
              {showHotel && <th>{L('ობიექტი', 'Property')}</th>}
              <th>{L('სტუმარი', 'Guest')}</th>
              <th>{L('კომენტარი', 'Comment')}</th>
              <th>{L('დრო', 'Time')}</th>
              <th>{L('სტატუსი', 'Status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.status === 'done' ? 'dim' : ''}>
                <td>
                  <strong>{r.service_name}</strong>
                  <div className="muted small">{r.service_price ? money(r.service_price) : L('უფასო', 'Free')}</div>
                </td>
                {showHotel && <td>{r.hotel_name}</td>}
                <td>
                  {r.guest_name}
                  <div className="muted small">{L('ოთახი', 'Room')} {r.room_number}</div>
                </td>
                <td className="small">{r.note || <span className="muted">—</span>}</td>
                <td className="small nowrap">{fmtDateTime(r.created_at)}</td>
                <td>
                  <Badge tone={r.status === 'done' ? 'green' : 'gold'}>{r.status === 'done' ? L('შესრულდა', 'Done') : L('მოლოდინში', 'Pending')}</Badge>
                </td>
                <td className="num">
                  {r.status === 'pending' ? (
                    <button type="button" className="btn btn-success btn-sm" disabled={action.busy} onClick={() => setStatus(r, 'done')}>
                      <Icon name="check" size={14} /> {L('შესრულდა', 'Mark done')}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={action.busy} onClick={() => setStatus(r, 'pending')}>
                      {L('დაბრუნება', 'Reopen')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {requests.data && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {L('მოთხოვნები ჯერ არ არის.', 'No requests yet.')}
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
    if (!window.confirm(L(`წავშალო სერვისი „${service.name}“?`, `Delete the service "${service.name}"?`))) return;
    if (await action.run(() => api(`/owner/services/${service.id}`, { method: 'DELETE' }))) onChange();
  };
  if (edit) {
    return (
      <li className="stack" style={{ gap: 8 }}>
        <div className="form-row">
          <input className="input input-sm" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label={L('სახელი', 'Name')} />
          <input
            className="input input-sm"
            type="number"
            min="0"
            max="10000"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            aria-label={L('ფასი', 'Price')}
            style={{ maxWidth: 110 }}
          />
        </div>
        <input
          className="input input-sm"
          placeholder={L('აღწერა', 'Description')}
          aria-label={L('აღწერა', 'Description')}
          maxLength={300}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {action.error && <div className="small" role="alert" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
        <div className="inline">
          <button type="button" className="btn btn-primary btn-sm" disabled={action.busy} onClick={save}>
            {L('შენახვა', 'Save')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(false)}>
            {L('გაუქმება', 'Cancel')}
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
        <strong className="nowrap">{service.price ? money(service.price) : L('უფასო', 'Free')}</strong>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setEdit(true)}
          aria-label={L(`შეცვლა: ${service.name}`, `Edit: ${service.name}`)}
        >
          {L('შეცვლა', 'Edit')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={remove} title={L('წაშლა', 'Delete')} aria-label={L(`წაშლა: ${service.name}`, `Delete: ${service.name}`)}>
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
        <input
          className="input input-sm"
          required
          placeholder={L('ახალი სერვისი, მაგ. გვიანი ჩექაუთი', 'New service, e.g. late check-out')}
          aria-label={L('ახალი სერვისის სახელი', 'New service name')}
          maxLength={80}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input input-sm"
          type="number"
          min="0"
          max="10000"
          placeholder={L('ფასი ₾', 'Price ₾')}
          aria-label={L('ფასი ₾', 'Price ₾')}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          style={{ maxWidth: 110 }}
        />
        <button type="submit" className="btn btn-outline btn-sm" style={{ flex: '0 0 auto' }} disabled={action.busy}>
          <Icon name="plus" size={14} /> {L('დამატება', 'Add')}
        </button>
      </div>
      {action.error && <div className="small mt-1" role="alert" style={{ color: 'var(--danger)' }}>{action.error.message}</div>}
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
    if (
      !window.confirm(
        L(
          `მოვხსნა ბლოკი: ოთახი ${b.room_number}, ${fmtRange(b.check_in, b.check_out)}?`,
          `Remove the block: room ${b.room_number}, ${fmtRange(b.check_in, b.check_out)}?`,
        ),
      )
    )
      return;
    if (await remove.run(() => api(`/owner/blocks/${b.id}`, { method: 'DELETE' }))) onChange();
  };

  return (
    <div className="two-col">
      <div className="card">
        <div className="card-body" style={{ paddingBottom: 4 }}>
          <h3 className="mb-0">{L('დაბლოკილი თარიღები', 'Blocked dates')}</h3>
          <p className="muted small mb-0">
            {L(
              'სხვაგან გაკეთებული ჯავშნები: ამ თარიღებზე Hospes-ში ოთახს ვეღარავინ დაჯავშნის.',
              'Bookings made elsewhere: nobody can book the room on Hospes for these dates.',
            )}
          </p>
        </div>
        <ErrorBox error={remove.error} />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{L('ოთახი', 'Room')}</th>
                <th>{L('თარიღები', 'Dates')}</th>
                <th>{L('წყარო', 'Source')}</th>
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
                      {L('მოხსნა', 'Remove')}
                    </button>
                  </td>
                </tr>
              ))}
              {bookings.data && blocks.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    {L('გარე ჯავშნები არ არის.', 'No external bookings.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <form className="card card-body sticky" onSubmit={submit}>
        <h3 className="card-title">{L('ახალი ბლოკი', 'New block')}</h3>
        <label className="field">
          <span>{L('ოთახი', 'Room')}</span>
          <select className="input" value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.hotel_name} · {L('ოთახი', 'room')} {r.number}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            <span>{L('შესვლა', 'Check-in')}</span>
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
            <span>{L('გასვლა', 'Check-out')}</span>
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
          <span>{L('წყარო / შენიშვნა', 'Source / note')}</span>
          <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Booking.com #1234" />
        </label>
        <ErrorBox error={create.error} />
        {created && !create.error && (
          <Alert tone="success">
            {L('დაიბლოკა: ოთახი', 'Blocked: room')} {created.room_number}, {fmtDate(created.check_in)} – {fmtDate(created.check_out, true)}.
          </Alert>
        )}
        <button type="submit" className="btn btn-primary btn-block mt-2" disabled={create.busy || !form.room_id}>
          {create.busy ? <Spinner small /> : <Icon name="ban" size={16} />} {L('თარიღების დაბლოკვა', 'Block dates')}
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
    { l: L('დღეს ჩამოდის', 'Arriving today'), v: live.filter((b) => b.check_in === t).length },
    { l: L('ახლა შესახლებულია', 'Checked in now'), v: list.filter((b) => b.status === 'checked_in').length },
    { l: L('მომავალი ჯავშნები', 'Upcoming bookings'), v: live.filter((b) => b.check_in > t).length },
    {
      l: L('შემოსავალი Hospes-ით', 'Revenue via Hospes'),
      v: money(list.filter((b) => b.source === 'internal' && b.paid).reduce((sum, b) => sum + b.total_price, 0)),
    },
  ];
  const pendingRequests = (requests.data || []).filter((r) => r.status === 'pending').length;

  if (hotels.loading && !hotels.data) return <Loading />;

  return (
    <div className="container">
      <div className="page-head">
        <h1>{L('მფლობელის დეშბორდი', 'Owner dashboard')}</h1>
        <p>
          {user.name} · {hotels.data?.length || 0} {L('ობიექტი', hotels.data?.length === 1 ? 'property' : 'properties')}
        </p>
      </div>
      <ErrorBox error={hotels.error} onRetry={hotels.reload} />
      {hotels.data?.length === 0 && (
        <Alert tone="info">
          {L(
            'თქვენზე ჯერ არცერთი ობიექტი არ არის მიბმული. მიმართეთ ადმინისტრატორს.',
            'No properties are linked to your account yet. Please contact an administrator.',
          )}
        </Alert>
      )}

      {hotels.data?.length > 0 && (
        <>
          {hotels.data.length > 1 && (
            <div className="hotel-switch">
              <button type="button" className={`chip${hotelId === 'all' ? ' on' : ''}`} onClick={() => setHotelId('all')}>
                {L('ყველა ობიექტი', 'All properties')}
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

          <div className="tabs" role="tablist" aria-label={L('დეშბორდის განყოფილებები', 'Dashboard sections')}>
            {TABS().map((tb) => (
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
