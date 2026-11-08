import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import BookingCard from '../components/BookingCard.jsx';
import Icon from '../components/Icon.jsx';
import { Alert, Badge, ErrorBox, Loading, useApi, VerificationBadge } from '../components/ui.jsx';
import { initial, ROLE } from '../format.js';

export default function Cabinet() {
  const { user } = useAuth();
  const bookings = useApi('/bookings/my');
  const list = bookings.data || [];
  const current = list.filter((b) => ['pending', 'confirmed', 'checked_in'].includes(b.status) && b.check_out >= b.today);
  const past = list.filter((b) => !current.includes(b));

  return (
    <div className="container">
      <div className="page-head">
        <h1>პირადი კაბინეტი</h1>
        <p>შენი ჯავშნები, წვდომის კოდები და ვერიფიკაციის სტატუსი.</p>
      </div>

      <div className="two-col">
        <div className="stack" style={{ gap: 16 }}>
          <ErrorBox error={bookings.error} onRetry={bookings.reload} />
          {bookings.loading && <Loading />}
          {bookings.data && (
            <>
              <h2 className="mb-0">მიმდინარე და მომავალი</h2>
              {current.length === 0 && (
                <div className="card empty">
                  <Icon name="calendar" size={30} />
                  <p>აქტიური ჯავშანი არ გაქვს.</p>
                  <Link to="/map" className="btn btn-primary">
                    სასტუმროს მოძებნა
                  </Link>
                </div>
              )}
              {current.map((b) => (
                <BookingCard key={b.id} b={b} />
              ))}
              {past.length > 0 && (
                <>
                  <h2 className="mb-0 mt-2">ისტორია</h2>
                  {past.map((b) => (
                    <BookingCard key={b.id} b={b} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        <aside className="stack sticky">
          <div className="card card-body">
            <div className="inline" style={{ gap: 12 }}>
              <span className="avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                {initial(user.name)}
              </span>
              <div>
                <strong>{user.name}</strong>
                <div className="muted small">{user.email}</div>
                {user.phone && <div className="muted small">{user.phone}</div>}
              </div>
            </div>
            <div className="inline mt-2">
              <VerificationBadge status={user.verification_status} />
              <Badge>{ROLE[user.role]}</Badge>
            </div>
            {user.verification_status !== 'verified' && (
              <div className="mt-2">
                <Alert tone="warn">
                  ჩექინისა და ლოქერ-ბოქსის გასახსნელად ვინაობა უნდა დაადასტურო.
                </Alert>
                <Link to="/verify" className="btn btn-primary btn-block mt-2">
                  <Icon name="camera" size={16} /> ვერიფიკაციის გავლა
                </Link>
              </div>
            )}
          </div>
          {(user.role === 'owner' || user.role === 'admin') && (
            <Link to="/owner" className="btn btn-outline">
              <Icon name="grid" size={16} /> მფლობელის დეშბორდი
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
