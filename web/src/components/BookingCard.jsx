import { Link } from 'react-router-dom';
import { fmtRange, money, nightsLabel } from '../format.js';
import { BookingHotelImage } from './HotelCard.jsx';
import Icon from './Icon.jsx';
import { Badge, KeyBadge, StatusBadge } from './ui.jsx';
import { L } from '../prefs.js';

export default function BookingCard({ b }) {
  const active = ['confirmed', 'checked_in'].includes(b.status);
  return (
    <div className="card booking-card">
      <div className="thumb">
        <BookingHotelImage b={b} />
      </div>
      <div className="body">
        <div className="spread">
          <h3>{b.hotel_name}</h3>
          <StatusBadge status={b.status} />
        </div>
        <div className="muted small">
          {L('ოთახი', 'Room')} {b.room_number}
          {b.room_title ? ` · ${b.room_title}` : ''} · {fmtRange(b.check_in, b.check_out)} · {nightsLabel(b.nights)}
        </div>
        <div className="inline">
          <KeyBadge type={b.key_type} />
          <strong>{money(b.total_price)}</strong>
          {b.pending_requests > 0 && (
            <Badge tone="gold" icon="bell">
              {L(`${b.pending_requests} მოთხოვნა მოლოდინში`, `${b.pending_requests} pending ${b.pending_requests === 1 ? 'request' : 'requests'}`)}
            </Badge>
          )}
        </div>
        {active && b.access_code && (
          <div className="small">
            {L('წვდომის კოდი:', 'Access code:')} <strong className="code" style={{ fontSize: '1.05rem', letterSpacing: '.12em' }}>{b.access_code}</strong>
          </div>
        )}
        <div className="inline mt-1">
          {b.status === 'pending' && (
            <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="card" size={15} /> {L('გადახდა', 'Pay')}
            </Link>
          )}
          {b.can_check_in && b.status !== 'checked_in' && (
            <Link to={`/checkin/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="key" size={15} /> {L('ჩექინი', 'Check-in')}
            </Link>
          )}
          {b.status === 'checked_in' && (
            <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="logout" size={15} /> {L('ჩექაუთი', 'Check-out')}
            </Link>
          )}
          {active && (
            <Link to={`/bookings/${b.id}/services`} className="btn btn-outline btn-sm">
              <Icon name="bell" size={15} /> {L('სერვისები', 'Services')}
            </Link>
          )}
          <Link
            to={`/bookings/${b.id}`}
            className="btn btn-ghost btn-sm"
            aria-label={L(`დეტალები: ${b.hotel_name}, ოთახი ${b.room_number}`, `Details: ${b.hotel_name}, room ${b.room_number}`)}
          >
            {L('დეტალები', 'Details')}
          </Link>
        </div>
      </div>
    </div>
  );
}
