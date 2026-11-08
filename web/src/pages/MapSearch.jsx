import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { qs } from '../api.js';
import { HotelImage, PriceFrom } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { ErrorBox, KeyBadge, Rating, Spinner, useApi } from '../components/ui.jsx';
import { addDays, nightsBetween, POI_BY_ID, POI_TYPES, todayStr } from '../format.js';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function MapSearch() {
  const [params] = useSearchParams();
  const initialType = params.get('type');
  const [q, setQ] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [keyType, setKeyType] = useState('');
  const [showHotels, setShowHotels] = useState(!initialType);
  const [types, setTypes] = useState(() =>
    POI_BY_ID[initialType] ? new Set([initialType]) : new Set(POI_TYPES.map((t) => t.id)),
  );
  const [selected, setSelected] = useState(params.get('focus'));

  const search = useDebounced(q, 300);
  const datesValid = checkIn && checkOut && nightsBetween(checkIn, checkOut) > 0;
  const stay = datesValid ? { check_in: checkIn, check_out: checkOut } : {};
  const hotels = useApi(`/hotels${qs({ q: search, max_price: maxPrice, key_type: keyType, ...stay })}`);
  const pois = useApi('/pois');

  const visibleHotels = showHotels ? hotels.data || [] : [];
  const visiblePois = useMemo(() => (pois.data || []).filter((p) => types.has(p.type)), [pois.data, types]);
  const linkSearch = datesValid ? qs(stay) : '';

  const toggleType = (id) =>
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onCheckIn = (v) => {
    setCheckIn(v);
    if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1));
  };

  return (
    <div className="container">
      <div className="page-head" style={{ paddingBottom: 12 }}>
        <h1>ძებნა რუკაზე</h1>
        <p>მიუთითე თარიღები და ნახავ მხოლოდ იმ სასტუმროებს, სადაც ოთახი თავისუფალია.</p>
      </div>

      <div className="card search-bar">
        <label className="field grow">
          <span>ძებნა</span>
          <input className="input" placeholder="სახელი ან ქალაქი: თელავი, სიღნაღი…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="field">
          <span>შესვლა</span>
          <input className="input" type="date" min={todayStr()} value={checkIn} onChange={(e) => onCheckIn(e.target.value)} />
        </label>
        <label className="field">
          <span>გასვლა</span>
          <input
            className="input"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : todayStr()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <label className="field">
          <span>მაქს. ფასი ღამეში</span>
          <select className="input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">ნებისმიერი</option>
            <option value="100">100 ₾-მდე</option>
            <option value="150">150 ₾-მდე</option>
            <option value="200">200 ₾-მდე</option>
          </select>
        </label>
        <label className="field">
          <span>შესვლის ტიპი</span>
          <select className="input" value={keyType} onChange={(e) => setKeyType(e.target.value)}>
            <option value="">ორივე</option>
            <option value="smartlock">ჭკვიანი საკეტი</option>
            <option value="box">კოდი და ყუთი</option>
          </select>
        </label>
        {(q || checkIn || maxPrice || keyType) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQ('');
              setCheckIn('');
              setCheckOut('');
              setMaxPrice('');
              setKeyType('');
            }}
          >
            <Icon name="x" size={16} /> გასუფთავება
          </button>
        )}
      </div>

      <div className="chips mt-2">
        <button type="button" className={`chip${showHotels ? ' on' : ''}`} onClick={() => setShowHotels((s) => !s)}>
          <span className="dot" style={{ background: 'var(--wine)' }} /> სასტუმროები
        </button>
        {POI_TYPES.map((t) => (
          <button key={t.id} type="button" className={`chip${types.has(t.id) ? ' on' : ''}`} onClick={() => toggleType(t.id)}>
            <span className="dot" style={{ background: t.color }} /> {t.label}
          </button>
        ))}
      </div>

      <div className="search-layout">
        <div className="results">
          <ErrorBox error={hotels.error} onRetry={hotels.reload} />
          {showHotels && (
            <>
              <h3 className="inline">
                სასტუმროები · {hotels.data ? visibleHotels.length : '…'} {hotels.loading && <Spinner small />}
              </h3>
              {hotels.data && visibleHotels.length === 0 && (
                <div className="card card-body muted small">ამ ფილტრებით თავისუფალი ოთახი ვერ მოიძებნა.</div>
              )}
              {visibleHotels.map((h) => (
                <div
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  className={`card hotel-row${selected === `h:${h.id}` ? ' on' : ''}`}
                  onClick={() => setSelected(`h:${h.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(`h:${h.id}`)}
                >
                  <div className="thumb">
                    <HotelImage hotel={h} />
                  </div>
                  <div>
                    <div className="spread">
                      <h3>{h.name}</h3>
                      <Rating value={h.google_rating} />
                    </div>
                    <div className="muted small">{h.address}</div>
                    <div className="inline mt-1">
                      {h.key_types.map((t) => (
                        <KeyBadge key={t} type={t} />
                      ))}
                    </div>
                    <div className="spread mt-1">
                      <PriceFrom value={h.min_price} />
                      <Link to={`/hotels/${h.id}${linkSearch}`} className="btn btn-sm btn-primary" onClick={(e) => e.stopPropagation()}>
                        ნახვა
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          {visiblePois.length > 0 && <h3>ადგილები · {visiblePois.length}</h3>}
          {visiblePois.map((p) => {
            const t = POI_BY_ID[p.type];
            return (
              <button
                key={p.id}
                type="button"
                className={`card poi-card poi-row${selected === `p:${p.id}` ? ' on' : ''}`}
                onClick={() => setSelected(`p:${p.id}`)}
              >
                {p.photo ? (
                  <img className="poi-thumb" src={p.photo} alt="" loading="lazy" />
                ) : (
                  <div className="poi-icon" style={{ background: t.color, width: 36, height: 36 }}>
                    <Icon name={t.icon} size={17} />
                  </div>
                )}
                <div>
                  <div className="muted small">{t.one}</div>
                  <h3>{p.name}</h3>
                  <p className="mb-0">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="map-panel">
          <MapView
            hotels={visibleHotels}
            pois={visiblePois}
            selected={selected}
            onSelect={setSelected}
            hotelLinkSearch={linkSearch}
          />
        </div>
      </div>
    </div>
  );
}
