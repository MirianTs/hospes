import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { HotelImage } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { Alert, Badge, ErrorBox, KeyBadge, Loading, Rating, Spinner, useAction, useApi } from '../components/ui.jsx';
import { addDays, distanceKm, KEY_TYPE, money, nightsBetween, todayStr } from '../format.js';

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
          <Link to="/map">← რუკაზე დაბრუნება</Link>
        </p>
      </div>
    );
  }
  const h = hotel.data;

  return (
    <div className="container">
      <div style={{ paddingTop: 20 }}>
        <Link to="/map" className="small inline" style={{ gap: 4 }}>
          <Icon name="arrowLeft" size={14} /> ყველა სასტუმრო
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
            <h2>აღწერა</h2>
            <p>{h.description}</p>
            {h.host && (
              <p className="muted small inline">
                <Icon name="user" size={15} /> მასპინძელი: {h.host.name}
              </p>
            )}
          </div>

          <div className="card" id="rooms">
            <div className="card-body" style={{ paddingBottom: 8 }}>
              <h2 className="mb-0">ოთახები</h2>
              <div className="form-row mt-2">
                <label className="field">
                  <span>შესვლა</span>
                  <input className="input" type="date" min={today} value={checkIn} onChange={(e) => setDates(e.target.value, checkOut)} />
                </label>
                <label className="field">
                  <span>გასვლა</span>
                  <input
                    className="input"
                    type="date"
                    min={addDays(checkIn, 1)}
                    value={checkOut}
                    onChange={(e) => setDates(checkIn, e.target.value)}
                  />
                </label>
              </div>
              {!datesValid && <Alert tone="warn">აირჩიე სწორი თარიღები: გასვლა შესვლის შემდეგ, შესვლა დღეიდან.</Alert>}
              <ErrorBox error={booking.error} />
              {hotel.loading && (
                <div className="inline muted small">
                  <Spinner small /> ვამოწმებ თავისუფალ ოთახებს…
                </div>
              )}
            </div>
            {h.rooms.map((r) => {
              const free = r.available && datesValid;
              return (
                <div key={r.id} className="room">
                  <div>
                    <h3>
                      ოთახი {r.number}
                      {r.title ? ` · ${r.title}` : ''}
                    </h3>
                    <div className="inline">
                      <KeyBadge type={r.key_type} />
                      <Badge icon="users">{r.capacity} სტუმარი</Badge>
                      {r.status === 'maintenance' && <Badge tone="red">დროებით დახურულია</Badge>}
                    </div>
                    <p className="muted small mt-1 mb-0">{KEY_TYPE[r.key_type].label}</p>
                  </div>
                  <div className="actions">
                    <div>
                      <div className="price">
                        {money(r.price)} <small>/ ღამე</small>
                      </div>
                      {free && r.total_price != null && (
                        <div className="muted small">
                          სულ {money(r.total_price)} · {nights} ღამე
                        </div>
                      )}
                    </div>
                    {free ? (
                      <button type="button" className="btn btn-primary" disabled={booking.busy} onClick={() => book(r)}>
                        {bookingRoom === r.id ? <Spinner small /> : <Icon name="calendar" size={16} />} დაჯავშნა
                      </button>
                    ) : (
                      <Badge tone="red">ამ თარიღებზე დაკავებულია</Badge>
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
              <h3 className="card-title">დამატებითი სერვისები</h3>
              <ul className="service-list">
                {h.services.map((s) => (
                  <li key={s.id}>
                    <span>{s.name}</span>
                    <strong className="nowrap">{s.price ? money(s.price) : 'უფასო'}</strong>
                  </li>
                ))}
              </ul>
              <p className="muted small mb-0 mt-1">სერვისს ჯავშნის გადახდის შემდეგ აპიდან მოითხოვ.</p>
            </div>
          )}
          <div className="card card-body">
            <h3 className="card-title">ადგილმდებარეობა და ახლომახლო</h3>
            <MapView hotels={[{ ...h, min_price: null }]} pois={nearby} height="260px" />
            <ul className="service-list mt-1">
              {nearby.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="muted nowrap">{p.km.toFixed(1)} კმ</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
