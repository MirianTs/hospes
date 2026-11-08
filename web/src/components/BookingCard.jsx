import { Link } from 'react-router-dom';
import { fmtRange, money } from '../format.js';
import { BookingHotelImage } from './HotelCard.jsx';
import Icon from './Icon.jsx';
import { Badge, KeyBadge, StatusBadge } from './ui.jsx';

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
          ოთახი {b.room_number}
          {b.room_title ? ` · ${b.room_title}` : ''} · {fmtRange(b.check_in, b.check_out)} · {b.nights} ღამე
        </div>
        <div className="inline">
          <KeyBadge type={b.key_type} />
          <strong>{money(b.total_price)}</strong>
          {b.pending_requests > 0 && (
            <Badge tone="gold" icon="bell">
              {b.pending_requests} მოთხოვნა მოლოდინში
            </Badge>
          )}
        </div>
        {active && b.access_code && (
          <div className="small">
            წვდომის კოდი: <strong className="code" style={{ fontSize: '1.05rem', letterSpacing: '.12em' }}>{b.access_code}</strong>
          </div>
        )}
        <div className="inline mt-1">
          {b.status === 'pending' && (
            <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="card" size={15} /> გადახდა
            </Link>
          )}
          {b.can_check_in && b.status !== 'checked_in' && (
            <Link to={`/checkin/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="key" size={15} /> ჩექინი
            </Link>
          )}
          {b.status === 'checked_in' && (
            <Link to={`/bookings/${b.id}`} className="btn btn-primary btn-sm">
              <Icon name="logout" size={15} /> ჩექაუთი
            </Link>
          )}
          {active && (
            <Link to={`/bookings/${b.id}/services`} className="btn btn-outline btn-sm">
              <Icon name="bell" size={15} /> სერვისები
            </Link>
          )}
          <Link to={`/bookings/${b.id}`} className="btn btn-ghost btn-sm">
            დეტალები
          </Link>
        </div>
      </div>
    </div>
  );
}
