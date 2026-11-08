import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, STATIC_DEMO } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import LockConnect, { LockRetry } from '../components/LockConnect.jsx';
import { openCompartment } from '../lockSerial.js';
import { Alert, ErrorBox, KeyBadge, Loading, Spinner, useAction, useApi } from '../components/ui.jsx';
import { fmtDate } from '../format.js';
import { L } from '../prefs.js';

// One entry method for every room: the key waits in a key locker box. The guest (verified, paid,
// within the booking dates) enters the 6-digit code; if the key is in a Hospes Lock compartment,
// the same code opens it through the Arduino.

function Check({ ok, children }) {
  return (
    <li>
      <Icon name={ok ? 'checkCircle' : 'alert'} className={ok ? 'ok' : 'no'} />
      <span>{children}</span>
    </li>
  );
}

function CodeCheckIn({ booking, onDone }) {
  const [code, setCode] = useState('');
  const action = useAction();
  const submit = async (e) => {
    e.preventDefault();
    const res = await action.run(() => api('/checkin/code', { method: 'POST', body: { booking_id: booking.id, code } }));
    if (!res) return;
    // The Arduino is on this computer's USB: open the room's compartment from the browser.
    const sent = res.lock_id ? await openCompartment(res.lock_id) : false;
    onDone({ ...res, sent });
  };
  const needsVerification = action.error?.data?.need === 'verification';
  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>{L('შეიყვანე 6-ციფრიანი კოდი', 'Enter the 6-digit code')}</span>
        <input
          className="input otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
      </label>
      {needsVerification ? (
        <Alert tone="warn">
          {L('ჯერ ვინაობა დაადასტურე.', 'Verify your identity first.')}{' '}
          <Link to={`/verify?next=${encodeURIComponent(`/checkin/${booking.id}`)}`}>{L('ვერიფიკაციის გავლა →', 'Get verified →')}</Link>
        </Alert>
      ) : (
        <ErrorBox error={action.error} />
      )}
      <button type="submit" className="btn btn-primary btn-lg btn-block mt-1" disabled={code.length !== 6 || action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="key" size={16} />} {L('ლოქერ-ბოქსის გახსნა', 'Open locker box')}
      </button>
      <p className="muted small center-text mt-2 mb-0">
        {L('კოდი ჯავშნის გვერდზეა და მხოლოდ შენს თარიღებში მოქმედებს.', 'The code is on your booking page and only works during your stay dates.')}
      </p>
      {booking.lock_id && (
        <>
          <hr className="divider" />
          <p className="small center-text mb-1">
            {L(
              <>
                ოთახი {booking.room_number}-ის გასაღები ლოქერის <b>განყოფილება #{booking.lock_id}</b>-შია.
              </>,
              <>
                The key for room {booking.room_number} is in locker <b>compartment #{booking.lock_id}</b>.
              </>
            )}
          </p>
          <LockConnect />
        </>
      )}
    </form>
  );
}

export default function CheckIn() {
  const { id } = useParams();
  const { user } = useAuth();
  const booking = useApi(`/bookings/${id}`);
  const [done, setDone] = useState(null);

  if (booking.loading && !booking.data) return <Loading />;
  if (!booking.data) {
    return (
      <div className="container section">
        <ErrorBox error={booking.error} onRetry={booking.reload} />
      </div>
    );
  }
  const b = booking.data;
  const paid = ['confirmed', 'checked_in'].includes(b.status);
  const verified = user.verification_status === 'verified';

  return (
    <div className="container">
      <div className="page-head center-text">
        <h1>{L('ჩექინი', 'Check-in')}</h1>
        <p style={{ margin: '0 auto' }}>
          {b.hotel_name} · {L('ოთახი', 'Room')} {b.room_number}
        </p>
      </div>
      <div className="card card-body checkin-card" style={{ padding: 28 }}>
        {done ? (
          <div className="center-text">
            <div className="success-mark">
              <Icon name="check" strokeWidth={3} />
            </div>
            <h2>{L('ლოქერ-ბოქსი გაიღო', 'The locker box is open')}</h2>
            <p className="muted">
              {L(
                `აიღე ოთახის გასაღები. კეთილი იყოს შენი მობრძანება! ოთახი ${b.room_number} შენია ${fmtDate(b.check_out, true)}-მდე.`,
                `Take your room key. Welcome! Room ${b.room_number} is yours until ${fmtDate(b.check_out, true)}.`
              )}
            </p>
            {done.checkin_info && (
              <Alert tone="info" icon="key">
                {done.checkin_info}
              </Alert>
            )}
            {done.sent === 'noreply' ? (
              <LockRetry lock={done.lock_id} />
            ) : done.sent ? (
              <Alert tone="success" icon="key">
                {L(
                  `Hospes Lock: განყოფილება #${done.lock_id} გაიღო. 5 წამში თავისით ჩაიკეტება.`,
                  `Hospes Lock: compartment #${done.lock_id} is open. It locks by itself in 5 seconds.`
                )}
              </Alert>
            ) : done.hardware === 'mock' && (
              <Alert tone="info">
                {STATIC_DEMO
                  ? L(
                      'ონლაინ დემოში Hospes Lock სიმულაციაა: ნამდვილ ლოქერს ლეპტოპზე გაშვებული ვერსია და Arduino აღებს.',
                      'In the online demo Hospes Lock is simulated: the real locker is opened by the version running on the laptop with the Arduino.'
                    )
                  : L(
                      `დემო რეჟიმი: Arduino არ არის მიერთებული, ბრძანება OPEN${done.lock_id} სერვერის ლოგში ჩაიწერა.`,
                      `Demo mode: no Arduino is connected, so the OPEN${done.lock_id} command was written to the server log.`
                    )}
              </Alert>
            )}
            <div className="inline mt-2" style={{ justifyContent: 'center' }}>
              <Link to={`/bookings/${b.id}/services`} className="btn btn-primary">
                <Icon name="bell" size={16} /> {L('სერვისის მოთხოვნა', 'Request a service')}
              </Link>
              <Link to="/cabinet" className="btn btn-outline">
                {L('ჩემი ჯავშნები', 'My bookings')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="spread">
              <KeyBadge type={b.key_type} />
              <span className="muted small">
                {fmtDate(b.check_in)} – {fmtDate(b.check_out, true)}
              </span>
            </div>
            <ul className="checklist mt-2">
              <Check ok={paid}>{paid ? L('ჯავშანი გადახდილია', 'Booking is paid') : L('ჯავშანი ჯერ არ არის გადახდილი', 'Booking is not paid yet')}</Check>
              <Check ok={verified}>
                {verified ? L('ვინაობა დადასტურებულია', 'Identity verified') : L('ვინაობა დასადასტურებელია', 'Identity not verified yet')}
              </Check>
              <Check ok={b.within_stay}>
                {b.within_stay
                  ? L('დღეს შენი ჯავშნის თარიღია', 'Today is within your booking dates')
                  : L(
                      `კოდი მოქმედებს ${fmtDate(b.check_in)}-დან ${fmtDate(b.check_out)}-მდე`,
                      `The code is valid from ${fmtDate(b.check_in)} to ${fmtDate(b.check_out)}`
                    )}
              </Check>
            </ul>
            <hr className="divider" />
            {b.status === 'checked_out' || b.status === 'cancelled' ? (
              <Alert tone="warn">{L('ეს ჯავშანი აღარ არის აქტიური.', 'This booking is no longer active.')}</Alert>
            ) : b.status === 'checked_in' ? (
              <Alert tone="success">{L('ჩექინი უკვე გავლილია. გასაღები შენთანაა.', "You're already checked in. The key is with you.")}</Alert>
            ) : !paid ? (
              <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-block">
                {L('გადახდაზე გადასვლა', 'Go to payment')}
              </Link>
            ) : !verified ? (
              <Alert tone="warn">
                {L('ლოქერ-ბოქსი მხოლოდ ვერიფიცირებულ სტუმარს იღება.', 'The locker box only opens for verified guests.')}{' '}
                <Link to={`/verify?next=${encodeURIComponent(`/checkin/${b.id}`)}`}>{L('ვერიფიკაციის გავლა →', 'Get verified →')}</Link>
              </Alert>
            ) : (
              <CodeCheckIn booking={b} onDone={setDone} />
            )}
            {paid && !b.within_stay && b.status === 'confirmed' && (
              <p className="muted small center-text mt-2 mb-0">{L('თარიღამდე კოდი არ იმუშავებს.', "The code won't work before your dates.")}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
