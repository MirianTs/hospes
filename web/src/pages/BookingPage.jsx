import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import HotelArt from '../components/HotelArt.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Spinner, StatusBadge, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, fmtDateTime, money } from '../format.js';

// Demo payment: the card fields stay in the browser; the server only records "paid".
function MockPayment({ booking, onPaid }) {
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', name: '', exp: '12/28', cvc: '123' });
  const action = useAction();
  const set = (k) => (e) => setCard((c) => ({ ...c, [k]: e.target.value }));
  const pay = async (e) => {
    e.preventDefault();
    const b = await action.run(async () => {
      await new Promise((r) => setTimeout(r, 700)); // feels like a real payment
      return api(`/bookings/${booking.id}/pay`, { method: 'POST' });
    });
    if (b) onPaid(b);
  };
  return (
    <form className="card card-body" onSubmit={pay}>
      <h3 className="card-title">გადახდა</h3>
      <Alert tone="info">დემო გადახდაა: ბარათის მონაცემები არსად იგზავნება და თანხა არ ჩამოიჭრება.</Alert>
      <div className="pay-card mt-2">
        <div className="spread">
          <span>Hospes Pay</span>
          <Icon name="card" />
        </div>
        <div className="num">{card.number || '•••• •••• •••• ••••'}</div>
        <div className="spread small">
          <span>{card.name || 'სახელი გვარი'}</span>
          <span>{card.exp}</span>
        </div>
      </div>
      <label className="field">
        <span>ბარათის ნომერი</span>
        <input className="input" inputMode="numeric" autoComplete="off" value={card.number} onChange={set('number')} />
      </label>
      <label className="field">
        <span>ბარათის მფლობელი</span>
        <input className="input" autoComplete="off" value={card.name} onChange={set('name')} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>ვადა</span>
          <input className="input" autoComplete="off" value={card.exp} onChange={set('exp')} />
        </label>
        <label className="field">
          <span>CVC</span>
          <input className="input" inputMode="numeric" autoComplete="off" value={card.cvc} onChange={set('cvc')} />
        </label>
      </div>
      <ErrorBox error={action.error} />
      <button type="submit" className="btn btn-primary btn-lg btn-block mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="lock" size={16} />} გადახდა · {money(booking.total_price)}
      </button>
    </form>
  );
}

export default function BookingPage() {
  const { id } = useParams();
  const booking = useApi(`/bookings/${id}`);
  const cancel = useAction();
  const checkout = useAction();
  const [justPaid, setJustPaid] = useState(false);

  if (booking.loading && !booking.data) return <Loading />;
  if (!booking.data) {
    return (
      <div className="container section">
        <ErrorBox error={booking.error} onRetry={booking.reload} />
      </div>
    );
  }
  const b = booking.data;
  const active = ['confirmed', 'checked_in'].includes(b.status);

  const doCancel = async () => {
    if (!window.confirm('ნამდვილად გსურს ჯავშნის გაუქმება?')) return;
    if (await cancel.run(() => api(`/bookings/${b.id}/cancel`, { method: 'POST' }))) booking.reload();
  };
  const doCheckout = async () => {
    if (await checkout.run(() => api(`/bookings/${b.id}/checkout`, { method: 'POST' }))) booking.reload();
  };

  return (
    <div className="container">
      <div style={{ paddingTop: 20 }}>
        <Link to="/cabinet" className="small inline" style={{ gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> ჩემი ჯავშნები
        </Link>
      </div>
      <div className="page-head" style={{ paddingTop: 12 }}>
        <div className="inline">
          <h1 className="mb-0">ჯავშანი #{b.id}</h1>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-1">
          {b.hotel_name} · ოთახი {b.room_number}
        </p>
      </div>

      <div className="two-col">
        <div className="stack" style={{ gap: 16 }}>
          {justPaid && <Alert tone="success">გადახდა შესრულდა. შენი წვდომის კოდი მზადაა.</Alert>}

          {b.status === 'pending' && (
            <MockPayment
              booking={b}
              onPaid={(paid) => {
                setJustPaid(true);
                booking.setData((d) => ({ ...d, ...paid }));
              }}
            />
          )}

          {active && (
            <div className="card card-body">
              <h3 className="card-title">წვდომის კოდი</h3>
              <div className="code-box">
                <div className="code">{b.access_code}</div>
                <div className="muted small mt-1">
                  მოქმედებს {fmtDate(b.check_in)}-დან {fmtDate(b.check_out, true)}-მდე
                </div>
              </div>
              <p className="small muted mt-2 mb-0">
                {b.key_type === 'box'
                  ? 'ჩამოსვლისას ჩექინის ეკრანზე შეიყვანე კოდი: სისტემა დაადასტურებს და გეტყვის, სად არის გასაღები.'
                  : 'ჩამოსვლისას ჩექინის ეკრანზე დააჭირე „კარის გაღებას“: საკეტი ტელეფონიდან გაიღება. საჭიროა ვერიფიცირებული ანგარიში.'}
              </p>
              <div className="inline mt-2">
                {!b.can_check_in ? (
                  <Badge tone="gold" icon="clock">
                    ჩექინი გაიხსნება {fmtDate(b.check_in)}-ს
                  </Badge>
                ) : b.key_type === 'smartlock' ? (
                  <Link to={`/checkin/${b.id}`} className="btn btn-primary">
                    <Icon name="unlock" size={16} /> {b.status === 'checked_in' ? 'კარის გაღება' : 'ჩექინი'}
                  </Link>
                ) : (
                  b.status !== 'checked_in' && (
                    <Link to={`/checkin/${b.id}`} className="btn btn-primary">
                      <Icon name="key" size={16} /> ჩექინი
                    </Link>
                  )
                )}
                <Link to={`/bookings/${b.id}/services`} className="btn btn-outline">
                  <Icon name="bell" size={16} /> დამატებითი სერვისები
                </Link>
              </div>
            </div>
          )}

          {b.status === 'checked_in' && (
            <div className="card card-body">
              <h3 className="card-title">შესახლებული ხარ</h3>
              {b.checkin_info && <Alert tone="info">{b.checkin_info}</Alert>}
              <ErrorBox error={checkout.error} />
              <button type="button" className="btn btn-outline mt-2" disabled={checkout.busy} onClick={doCheckout}>
                <Icon name="logout" size={16} /> ჩექაუთი
              </button>
            </div>
          )}

          {b.status === 'checked_out' && <Alert tone="success">ვიზიტი დასრულდა. გმადლობთ, რომ Hospes აირჩიე!</Alert>}
          {b.status === 'cancelled' && <Alert tone="warn">ეს ჯავშანი გაუქმებულია.</Alert>}
        </div>

        <aside className="stack sticky">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ aspectRatio: '16 / 8' }}>
              <HotelArt seed={b.hotel_id} label={b.hotel_name} />
            </div>
            <div className="card-body">
              <h3 className="card-title">{b.hotel_name}</h3>
              <dl className="kv">
                <dt>ოთახი</dt>
                <dd>
                  {b.room_number}
                  {b.room_title ? ` · ${b.room_title}` : ''}
                </dd>
                <dt>შესვლა</dt>
                <dd>{fmtDate(b.check_in, true)}</dd>
                <dt>გასვლა</dt>
                <dd>{fmtDate(b.check_out, true)}</dd>
                <dt>ღამეები</dt>
                <dd>{b.nights}</dd>
                <dt>შესვლის ტიპი</dt>
                <dd>
                  <KeyBadge type={b.key_type} />
                </dd>
                <dt>სულ</dt>
                <dd>
                  <strong>{money(b.total_price)}</strong>
                </dd>
                {b.paid_at && (
                  <>
                    <dt>გადახდილია</dt>
                    <dd>{fmtDateTime(b.paid_at)}</dd>
                  </>
                )}
              </dl>
              {['pending', 'confirmed'].includes(b.status) && (
                <>
                  <ErrorBox error={cancel.error} />
                  <button type="button" className="btn btn-danger btn-sm mt-2" disabled={cancel.busy} onClick={doCancel}>
                    ჯავშნის გაუქმება
                  </button>
                </>
              )}
            </div>
          </div>
          {b.service_requests?.length > 0 && (
            <div className="card card-body">
              <h3 className="card-title">მოთხოვნილი სერვისები</h3>
              <ul className="service-list">
                {b.service_requests.map((r) => (
                  <li key={r.id}>
                    <span>{r.service_name}</span>
                    <Badge tone={r.status === 'done' ? 'green' : 'gold'}>{r.status === 'done' ? 'შესრულდა' : 'მოლოდინში'}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
