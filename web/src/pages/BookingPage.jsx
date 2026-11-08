import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { BookingHotelImage } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import LockConnect, { LockRetry } from '../components/LockConnect.jsx';
import { openCompartment } from '../lockSerial.js';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Spinner, StatusBadge, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, fmtDateTime, money } from '../format.js';
import { L } from '../prefs.js';

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
      <h3 className="card-title">{L('გადახდა', 'Payment')}</h3>
      <Alert tone="info">{L('დემო გადახდაა: ბარათის მონაცემები არსად იგზავნება და თანხა არ ჩამოიჭრება.', 'This is a demo payment: card details are not sent anywhere and nothing is charged.')}</Alert>
      <div className="pay-card mt-2">
        <div className="spread">
          <span>Hospes Pay</span>
          <Icon name="card" />
        </div>
        <div className="num">{card.number || '•••• •••• •••• ••••'}</div>
        <div className="spread small">
          <span>{card.name || L('სახელი გვარი', 'Full name')}</span>
          <span>{card.exp}</span>
        </div>
      </div>
      <label className="field">
        <span>{L('ბარათის ნომერი', 'Card number')}</span>
        <input className="input" inputMode="numeric" autoComplete="off" value={card.number} onChange={set('number')} />
      </label>
      <label className="field">
        <span>{L('ბარათის მფლობელი', 'Cardholder name')}</span>
        <input className="input" autoComplete="off" value={card.name} onChange={set('name')} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>{L('ვადა', 'Expiry')}</span>
          <input className="input" autoComplete="off" value={card.exp} onChange={set('exp')} />
        </label>
        <label className="field">
          <span>CVC</span>
          <input className="input" inputMode="numeric" autoComplete="off" value={card.cvc} onChange={set('cvc')} />
        </label>
      </div>
      <ErrorBox error={action.error} />
      <button type="submit" className="btn btn-primary btn-lg btn-block mt-1" disabled={action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="lock" size={16} />} {L('გადახდა', 'Pay')} · {money(booking.total_price)}
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
  const [returned, setReturned] = useState(null);

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
    if (!window.confirm(L('ნამდვილად გსურს ჯავშნის გაუქმება?', 'Are you sure you want to cancel this booking?'))) return;
    if (await cancel.run(() => api(`/bookings/${b.id}/cancel`, { method: 'POST' }))) booking.reload();
  };
  const doCheckout = async () => {
    if (!window.confirm(L('ჩექაუთი: დაბრუნების განყოფილება გაიღება და გასაღები შიგნით უნდა ჩადო. გავაგრძელო?', 'Check-out: the return compartment will open and you need to put the key inside. Continue?'))) return;
    const res = await checkout.run(() => api(`/bookings/${b.id}/checkout`, { method: 'POST' }));
    if (!res) return;
    // The Arduino is on this computer's USB: open the key return compartment from the browser.
    const sent = await openCompartment(res.return_lock);
    setReturned({ lock: res.return_lock, sent, mock: res.hardware === 'mock' });
    booking.reload();
  };

  return (
    <div className="container">
      <div style={{ paddingTop: 20 }}>
        <Link to="/cabinet" className="small inline" style={{ gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> {L('ჩემი ჯავშნები', 'My bookings')}
        </Link>
      </div>
      <div className="page-head" style={{ paddingTop: 12 }}>
        <div className="inline">
          <h1 className="mb-0">{L('ჯავშანი', 'Booking')} #{b.id}</h1>
          <StatusBadge status={b.status} />
        </div>
        <p className="mt-1">
          {b.hotel_name} · {L('ოთახი', 'Room')} {b.room_number}
        </p>
      </div>

      <div className="two-col">
        <div className="stack" style={{ gap: 16 }}>
          {justPaid && <Alert tone="success">{L('გადახდა შესრულდა. შენი წვდომის კოდი მზადაა.', 'Payment complete. Your access code is ready.')}</Alert>}

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
              <h3 className="card-title">{L('წვდომის კოდი', 'Access code')}</h3>
              <div className="code-box">
                <div className="code">{b.access_code}</div>
                <div className="muted small mt-1">
                  {L(
                    `მოქმედებს ${fmtDate(b.check_in)}-დან ${fmtDate(b.check_out, true)}-მდე`,
                    `Valid from ${fmtDate(b.check_in)} to ${fmtDate(b.check_out, true)}`
                  )}
                </div>
              </div>
              <p className="small muted mt-2 mb-0">
                {L(
                  'ჩამოსვლისას ჩექინის ეკრანზე შეიყვანე ეს კოდი: გასაღების ლოქერ-ბოქსი გაიღება და აიღებ ოთახის გასაღებს. საჭიროა ვერიფიცირებული ანგარიში.',
                  'When you arrive, enter this code on the check-in screen: the key locker box opens and you take your room key. A verified account is required.'
                )}
              </p>
              <div className="inline mt-2">
                {!b.can_check_in ? (
                  <Badge tone="gold" icon="clock">
                    {L(`ჩექინი გაიხსნება ${fmtDate(b.check_in)}-ს`, `Check-in opens on ${fmtDate(b.check_in)}`)}
                  </Badge>
                ) : (
                  b.status !== 'checked_in' && (
                    <Link to={`/checkin/${b.id}`} className="btn btn-primary">
                      <Icon name="key" size={16} /> {L('ჩექინი', 'Check-in')}
                    </Link>
                  )
                )}
                <Link to={`/bookings/${b.id}/services`} className="btn btn-outline">
                  <Icon name="bell" size={16} /> {L('დამატებითი სერვისები', 'Extra services')}
                </Link>
              </div>
            </div>
          )}

          {b.status === 'checked_in' && (
            <div className="card card-body">
              <h3 className="card-title">{L('შესახლებული ხარ', "You're checked in")}</h3>
              {b.checkin_info && <Alert tone="info">{b.checkin_info}</Alert>}
              <p className="small muted mb-0">
                {L(
                  <>
                    წასვლისას დააჭირე „ჩექაუთს“: ლოქერის <b>განყოფილება #4</b> გაიღება და ოთახის გასაღებს შიგნით ჩადებ. 5 წამში თავისით ჩაიკეტება.
                  </>,
                  <>
                    When you leave, press “Check-out”: locker <b>compartment #4</b> opens and you put the room key inside. It locks by itself after 5 seconds.
                  </>
                )}
              </p>
              <LockConnect />
              <ErrorBox error={checkout.error} />
              <button type="button" className="btn btn-primary mt-2" disabled={checkout.busy} onClick={doCheckout}>
                <Icon name="logout" size={16} /> {L('ჩექაუთი', 'Check-out')}
              </button>
            </div>
          )}

          {returned?.sent === 'noreply' && <LockRetry lock={returned.lock} />}
          {returned && returned.sent !== 'noreply' && (
            <Alert tone="success" icon="key">
              {returned.sent
                ? L(
                    `Hospes Lock: განყოფილება #${returned.lock} გაიღო. ჩადე ოთახის გასაღები, 5 წამში ჩაიკეტება.`,
                    `Hospes Lock: compartment #${returned.lock} is open. Put the room key inside; it locks in 5 seconds.`
                  )
                : L(
                    `განყოფილება #${returned.lock} გაიღო: ჩადე ოთახის გასაღები.${returned.mock ? ' (დემო: Arduino ამ კომპიუტერზე მიერთებული არ არის.)' : ''}`,
                    `Compartment #${returned.lock} is open: put the room key inside.${returned.mock ? ' (Demo: no Arduino is connected to this computer.)' : ''}`
                  )}
            </Alert>
          )}
          {b.status === 'checked_out' && <Alert tone="success">{L('ვიზიტი დასრულდა. გმადლობთ, რომ Hospes აირჩიე!', 'Your stay is over. Thank you for choosing Hospes!')}</Alert>}
          {b.status === 'cancelled' && <Alert tone="warn">{L('ეს ჯავშანი გაუქმებულია.', 'This booking has been cancelled.')}</Alert>}
        </div>

        <aside className="stack sticky">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="booking-cover">
              <BookingHotelImage b={b} />
            </div>
            <div className="card-body">
              <h3 className="card-title">{b.hotel_name}</h3>
              <dl className="kv">
                <dt>{L('ოთახი', 'Room')}</dt>
                <dd>
                  {b.room_number}
                  {b.room_title ? ` · ${b.room_title}` : ''}
                </dd>
                <dt>{L('შესვლა', 'Check-in')}</dt>
                <dd>{fmtDate(b.check_in, true)}</dd>
                <dt>{L('გასვლა', 'Check-out')}</dt>
                <dd>{fmtDate(b.check_out, true)}</dd>
                <dt>{L('ღამეები', 'Nights')}</dt>
                <dd>{b.nights}</dd>
                <dt>{L('შესვლის ტიპი', 'Entry type')}</dt>
                <dd>
                  <KeyBadge type={b.key_type} />
                </dd>
                <dt>{L('სულ', 'Total')}</dt>
                <dd>
                  <strong>{money(b.total_price)}</strong>
                </dd>
                {b.paid_at && (
                  <>
                    <dt>{L('გადახდილია', 'Paid')}</dt>
                    <dd>{fmtDateTime(b.paid_at)}</dd>
                  </>
                )}
              </dl>
              {['pending', 'confirmed'].includes(b.status) && (
                <>
                  <ErrorBox error={cancel.error} />
                  <button type="button" className="btn btn-danger btn-sm mt-2" disabled={cancel.busy} onClick={doCancel}>
                    {L('ჯავშნის გაუქმება', 'Cancel booking')}
                  </button>
                </>
              )}
            </div>
          </div>
          {b.service_requests?.length > 0 && (
            <div className="card card-body">
              <h3 className="card-title">{L('მოთხოვნილი სერვისები', 'Requested services')}</h3>
              <ul className="service-list">
                {b.service_requests.map((r) => (
                  <li key={r.id}>
                    <span>{r.service_name}</span>
                    <Badge tone={r.status === 'done' ? 'green' : 'gold'}>{r.status === 'done' ? L('შესრულდა', 'Done') : L('მოლოდინში', 'Pending')}</Badge>
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
