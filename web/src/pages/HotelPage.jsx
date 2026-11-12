import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { HotelImage } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Rating, Spinner, useAction, useApi } from '../components/ui.jsx';
import { addDays, distanceKm, KEY_TYPE, money, nightsBetween, nightsLabel, todayStr } from '../format.js';
import { L } from '../prefs.js';

export default function HotelPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = todayStr();
  const checkIn = params.get('check_in') || today;
  const checkOut = params.get('check_out') || addDays(checkIn, 1);
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = nights > 0 && checkIn >= today;

  const hotel = useApi(`/hotels/${id}${datesValid ? qs({ check_in: checkIn, check_out: checkOut }) : ''}`);
  const pois = useApi('/pois');
  const booking = useAction();
  const [bookingRoom, setBookingRoom] = useState(null);

  const nearby = useMemo(() => {
    if (!hotel.data || !pois.data) return [];
    return pois.data
      .map((p) => ({ ...p, km: distanceKm(hotel.data, p) }))
      .filter((p) => p.km <= 20)
      .sort((a, b) => a.km - b.km);
  }, [hotel.data, pois.data]);

  const setDates = (ci, co) => {
    const next = { check_in: ci, check_out: co && co > ci ? co : addDays(ci, 1) };
    setParams(next, { replace: true });
  };

  const book = async (room) => {
    const stay = { check_in: checkIn, check_out: checkOut };
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/hotels/${id}${qs(stay)}`)}`);
      return;
    }
    setBookingRoom(room.id);
    const created = await booking.run(() => api('/bookings', { method: 'POST', body: { room_id: room.id, ...stay } }));
    setBookingRoom(null);
    if (created) navigate(`/bookings/${created.id}`);
    else hotel.reload();
  };

  if (hotel.loading && !hotel.data) return <Loading />;
  if (hotel.error && !hotel.data) {
    return (
      <div className="container section">
        <ErrorBox error={hotel.error} onRetry={hotel.reload} />
        <p className="mt-2">
          <Link to="/map">← {L('რუკაზე დაბრუნება', 'Back to the map')}</Link>
        </p>
      </div>
    );
  }
  const h = hotel.data;

  return (
    <div className="container">
      <div style={{ paddingTop: 20 }}>
        <Link to="/map" className="small inline" style={{ gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> {L('ყველა სასტუმრო', 'All guesthouses')}
        </Link>
      </div>
      <div className="hotel-head">
        <div className="spread">
          <h1>{h.name}</h1>
          <Rating value={h.google_rating} />
        </div>
        <div className="inline muted">
          <Icon name="pin" size={16} /> {h.address}
          <a href={h.google_maps_url} target="_blank" rel="noreferrer" className="inline small" style={{ gap: 4 }}>
            Google Maps <Icon name="external" size={13} />
          </a>
        </div>
      </div>
      <div className="gallery">
        <HotelImage hotel={h} />
      </div>

      <div className="two-col mt-3">
        <div className="stack" style={{ gap: 24 }}>
          <div>
            <h2>{L('აღწერა', 'Description')}</h2>
            <p>{h.description}</p>
            {h.host && (
              <p className="muted small inline">
                <Icon name="user" size={15} /> {L('მასპინძელი', 'Host')}: {h.host.name}
              </p>
            )}
          </div>

          <div className="card" id="rooms">
            <div className="card-body" style={{ paddingBottom: 8 }}>
              <h2 className="mb-0">{L('ოთახები', 'Rooms')}</h2>
              <div className="form-row mt-2">
                <label className="field">
                  <span>{L('შესვლა', 'Check-in')}</span>
                  <input className="input" type="date" min={today} value={checkIn} onChange={(e) => setDates(e.target.value, checkOut)} />
                </label>
                <label className="field">
                  <span>{L('გასვლა', 'Check-out')}</span>
                  <input
                    className="input"
                    type="date"
                    min={addDays(checkIn, 1)}
                    value={checkOut}
                    onChange={(e) => setDates(checkIn, e.target.value)}
                  />
                </label>
              </div>
              {!datesValid && <Alert tone="warn">
                  {L(
                    'აირჩიე სწორი თარიღები: გასვლა შესვლის შემდეგ, შესვლა დღეიდან.',
                    'Choose valid dates: check-out after check-in, and check-in from today on.',
                  )}
                </Alert>}
              <ErrorBox error={booking.error} />
              {hotel.loading && (
                <div className="inline muted small">
                  <Spinner small /> {L('ვამოწმებ თავისუფალ ოთახებს…', 'Checking available rooms…')}
                </div>
              )}
            </div>
            {h.rooms.map((r) => {
              const free = r.available && datesValid;
              return (
                <div key={r.id} className="room">
                  <div>
                    <h3>
                      {L('ოთახი', 'Room')} {r.number}
                      {r.title ? ` · ${r.title}` : ''}
                    </h3>
                    <div className="inline">
                      <KeyBadge type={r.key_type} />
                      <Badge icon="users">{L(`${r.capacity} სტუმარი`, `${r.capacity} ${r.capacity === 1 ? 'guest' : 'guests'}`)}</Badge>
                      {r.status === 'maintenance' && <Badge tone="red">{L('დროებით დახურულია', 'Temporarily closed')}</Badge>}
                    </div>
                    {/* The schema still allows 'smartlock', which has no label any more; skip the line instead of crashing. */}
                    {KEY_TYPE[r.key_type] && <p className="muted small mt-1 mb-0">{KEY_TYPE[r.key_type].label}</p>}
                  </div>
                  <div className="actions">
                    <div>
                      <div className="price">
                        {money(r.price)} <small>{L('/ ღამე', '/ night')}</small>
                      </div>
                      {free && r.total_price != null && (
                        <div className="muted small">
                          {L('სულ', 'Total')} {money(r.total_price)} · {nightsLabel(nights)}
                        </div>
                      )}
                    </div>
                    {free ? (
                      <button type="button" className="btn btn-primary" disabled={booking.busy} onClick={() => book(r)}>
                        {bookingRoom === r.id ? <Spinner small /> : <Icon name="calendar" size={16} />} {L('დაჯავშნა', 'Book')}
                      </button>
                    ) : (
                      // Closed rooms already carry their own badge, and invalid dates get the warning above.
                      r.status === 'available' &&
                      datesValid && <Badge tone="red">{L('ამ თარიღებზე დაკავებულია', 'Booked on these dates')}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="stack sticky" style={{ gap: 16 }}>
          {h.services.length > 0 && (
            <div className="card card-body">
              <h3 className="card-title">{L('დამატებითი სერვისები', 'Extra services')}</h3>
              <ul className="service-list">
                {h.services.map((s) => (
                  <li key={s.id}>
                    <span>{s.name}</span>
                    <strong className="nowrap">{s.price ? money(s.price) : L('უფასო', 'Free')}</strong>
                  </li>
                ))}
              </ul>
              <p className="muted small mb-0 mt-1">
                {L('სერვისს ჯავშნის გადახდის შემდეგ აპიდან მოითხოვ.', 'You can request services in the app once your booking is paid.')}
              </p>
            </div>
          )}
          <div className="card card-body">
            <h3 className="card-title">{L('ადგილმდებარეობა და ახლომახლო', 'Location and nearby')}</h3>
            <MapView hotels={[{ ...h, min_price: null }]} pois={nearby} height="260px" />
            <ul className="service-list mt-1">
              {nearby.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="muted nowrap">{p.km.toFixed(1)} {L('კმ', 'km')}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
