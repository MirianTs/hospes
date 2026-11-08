import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, Loading, Spinner, useAction, useApi } from '../components/ui.jsx';
import { fmtDateTime, money } from '../format.js';
import { L } from '../prefs.js';

export default function ExtraServices() {
  const { id } = useParams();
  const booking = useApi(`/bookings/${id}`);
  const [note, setNote] = useState('');
  const [sentId, setSentId] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const action = useAction();

  if (booking.loading && !booking.data) return <Loading />;
  if (!booking.data) {
    return (
      <div className="container section">
        <ErrorBox error={booking.error} onRetry={booking.reload} />
      </div>
    );
  }
  const b = booking.data;
  const canRequest = ['confirmed', 'checked_in'].includes(b.status);

  const request = async (service) => {
    setPendingId(service.id);
    const list = await action.run(() =>
      api(`/bookings/${b.id}/services`, { method: 'POST', body: { hotel_service_id: service.id, note } }),
    );
    setPendingId(null);
    if (list) {
      booking.setData((d) => ({ ...d, service_requests: list }));
      setSentId(service.id);
      setNote('');
    }
  };

  return (
    <div className="container">
      <div style={{ paddingTop: 20 }}>
        <Link to={`/bookings/${b.id}`} className="small inline" style={{ gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> {L('ჯავშანი', 'Booking')} #{b.id}
        </Link>
      </div>
      <div className="page-head" style={{ paddingTop: 12 }}>
        <h1>{L('დამატებითი სერვისები', 'Extra services')}</h1>
        <p>
          {b.hotel_name} · {L('ოთახი', 'Room')} {b.room_number}.{' '}
          {L('მოთხოვნა მასპინძელს დეშბორდზე მაშინვე გამოუჩნდება.', 'Your request shows up on the host’s dashboard right away.')}
        </p>
      </div>

      {!canRequest && (
        <Alert tone="warn">
          {L('სერვისის მოთხოვნა შეიძლება მხოლოდ გადახდილ, აქტიურ ჯავშანზე.', 'Services can only be requested for a paid, active booking.')}
        </Alert>
      )}

      <div className="two-col mt-2">
        <div className="stack">
          <label className="field mb-0">
            <span>{L('კომენტარი მასპინძლისთვის (არასავალდებულო)', 'Note for the host (optional)')}</span>
            <input
              className="input"
              placeholder={L('მაგ. ხვალ 9:00-ზე, 2 ადამიანი', 'e.g. tomorrow at 9:00, 2 people')}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              disabled={!canRequest}
            />
          </label>
          <ErrorBox error={action.error} />
          <div className="grid grid-2">
            {b.hotel_services.map((s) => (
              <div key={s.id} className="card card-body stack" style={{ gap: 8 }}>
                <div className="spread">
                  <h3 className="mb-0">{s.name}</h3>
                  <strong className="nowrap">{s.price ? money(s.price) : L('უფასო', 'Free')}</strong>
                </div>
                {s.description && <p className="muted small mb-0">{s.description}</p>}
                <button
                  type="button"
                  className={`btn ${sentId === s.id ? 'btn-success' : 'btn-outline'} btn-sm`}
                  disabled={!canRequest || action.busy}
                  onClick={() => request(s)}
                >
                  {pendingId === s.id ? <Spinner small /> : <Icon name={sentId === s.id ? 'check' : 'plus'} size={15} />}
                  {sentId === s.id ? L('მოთხოვნილია', 'Requested') : L('მოთხოვნა', 'Request')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <aside className="card card-body sticky">
          <h3 className="card-title">{L('ჩემი მოთხოვნები', 'My requests')}</h3>
          {b.service_requests.length === 0 ? (
            <p className="muted small mb-0">{L('ჯერ არაფერი მოგითხოვია.', "You haven't requested anything yet.")}</p>
          ) : (
            <ul className="service-list">
              {b.service_requests.map((r) => (
                <li key={r.id}>
                  <div>
                    <div>{r.service_name}</div>
                    <div className="muted small">
                      {fmtDateTime(r.created_at)}
                      {r.note ? ` · ${r.note}` : ''}
                    </div>
                  </div>
                  <Badge tone={r.status === 'done' ? 'green' : 'gold'}>{r.status === 'done' ? L('შესრულდა', 'Done') : L('მოლოდინში', 'Pending')}</Badge>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={booking.reload}>
            <Icon name="refresh" size={14} /> {L('განახლება', 'Refresh')}
          </button>
        </aside>
      </div>
    </div>
  );
}
