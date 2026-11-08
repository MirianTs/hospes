import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, STATIC_DEMO } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, ErrorBox, KeyBadge, Loading, Spinner, useAction, useApi } from '../components/ui.jsx';
import { fmtDate } from '../format.js';

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
    if (res) onDone(res);
  };
  const needsVerification = action.error?.data?.need === 'verification';
  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>შეიყვანე 6-ციფრიანი კოდი</span>
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
          ჯერ ვინაობა დაადასტურე.{' '}
          <Link to={`/verify?next=${encodeURIComponent(`/checkin/${booking.id}`)}`}>ვერიფიკაციის გავლა →</Link>
        </Alert>
      ) : (
        <ErrorBox error={action.error} />
      )}
      <button type="submit" className="btn btn-primary btn-lg btn-block mt-1" disabled={code.length !== 6 || action.busy}>
        {action.busy ? <Spinner small /> : <Icon name="key" size={16} />} ლოქერ-ბოქსის გახსნა
      </button>
      <p className="muted small center-text mt-2 mb-0">კოდი ჯავშნის გვერდზეა და მხოლოდ შენს თარიღებში მოქმედებს.</p>
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
        <h1>ჩექინი</h1>
        <p style={{ margin: '0 auto' }}>
          {b.hotel_name} · ოთახი {b.room_number}
        </p>
      </div>
      <div className="card card-body checkin-card" style={{ padding: 28 }}>
        {done ? (
          <div className="center-text">
            <div className="success-mark">
              <Icon name="check" strokeWidth={3} />
            </div>
            <h2>ლოქერ-ბოქსი გაიღო</h2>
            <p className="muted">
              აიღე ოთახის გასაღები. კეთილი იყოს შენი მობრძანება! ოთახი {b.room_number} შენია {fmtDate(b.check_out, true)}-მდე.
            </p>
            {done.checkin_info && (
              <Alert tone="info" icon="key">
                {done.checkin_info}
              </Alert>
            )}
            {done.hardware === 'mock' && (
              <Alert tone="info">
                {STATIC_DEMO
                  ? 'ონლაინ დემოში Hospes Lock სიმულაციაა: ნამდვილ ლოქერს ლეპტოპზე გაშვებული ვერსია და Arduino აღებს.'
                  : `დემო რეჟიმი: Arduino არ არის მიერთებული, ბრძანება OPEN${done.lock_id} სერვერის ლოგში ჩაიწერა.`}
              </Alert>
            )}
            <div className="inline mt-2" style={{ justifyContent: 'center' }}>
              <Link to={`/bookings/${b.id}/services`} className="btn btn-primary">
                <Icon name="bell" size={16} /> სერვისის მოთხოვნა
              </Link>
              <Link to="/cabinet" className="btn btn-outline">
                ჩემი ჯავშნები
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
              <Check ok={paid}>{paid ? 'ჯავშანი გადახდილია' : 'ჯავშანი ჯერ არ არის გადახდილი'}</Check>
              <Check ok={verified}>{verified ? 'ვინაობა დადასტურებულია' : 'ვინაობა დასადასტურებელია'}</Check>
              <Check ok={b.within_stay}>
                {b.within_stay ? 'დღეს შენი ჯავშნის თარიღია' : `კოდი მოქმედებს ${fmtDate(b.check_in)}-დან ${fmtDate(b.check_out)}-მდე`}
              </Check>
            </ul>
            <hr className="divider" />
            {b.status === 'checked_out' || b.status === 'cancelled' ? (
              <Alert tone="warn">ეს ჯავშანი აღარ არის აქტიური.</Alert>
            ) : b.status === 'checked_in' ? (
              <Alert tone="success">ჩექინი უკვე გავლილია. გასაღები შენთანაა.</Alert>
            ) : !paid ? (
              <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-block">
                გადახდაზე გადასვლა
              </Link>
            ) : !verified ? (
              <Alert tone="warn">
                ლოქერ-ბოქსი მხოლოდ ვერიფიცირებულ სტუმარს იღება.{' '}
                <Link to={`/verify?next=${encodeURIComponent(`/checkin/${b.id}`)}`}>ვერიფიკაციის გავლა →</Link>
              </Alert>
            ) : (
              <CodeCheckIn booking={b} onDone={setDone} />
            )}
            {paid && !b.within_stay && b.status === 'confirmed' && (
              <p className="muted small center-text mt-2 mb-0">თარიღამდე კოდი არ იმუშავებს.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
