import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { qs } from '../api.js';
import { HotelImage, PriceFrom } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { ErrorBox, Rating, Spinner, useApi } from '../components/ui.jsx';
import { addDays, cityOf, distanceKm, nightsBetween, POI_BY_ID, POI_TYPES, REGIONS, todayStr } from '../format.js';

const NEAR_KM = 45; // with a town chosen, places within this distance of its guesthouses are shown

// Chips: nothing selected = everything is shown ("ყველა"). Tapping a chip narrows the map to it;
// more chips can be added, and "ყველა" clears the choice.
const CATEGORIES = [{ id: 'hotels', label: 'სასტუმროები', icon: 'home', color: 'var(--wine)' }, ...POI_TYPES];

export default function MapSearch() {
  const [params] = useSearchParams();
  const initialType = params.get('type');
  const [city, setCity] = useState(params.get('city') || '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [cats, setCats] = useState(() => new Set(POI_BY_ID[initialType] ? [initialType] : []));
  const [selected, setSelected] = useState(params.get('focus'));

  const datesValid = checkIn && checkOut && nightsBetween(checkIn, checkOut) > 0;
  const stay = datesValid ? { check_in: checkIn, check_out: checkOut } : {};
  const hotels = useApi(`/hotels${qs({ max_price: maxPrice, ...stay })}`);
  const allHotels = useApi('/hotels');
  const pois = useApi('/pois');

  // Town list from the guesthouses we have, grouped by region (unknown towns go to "სხვა").
  const cityGroups = useMemo(() => {
    const count = {};
    for (const h of allHotels.data || []) count[cityOf(h.address)] = (count[cityOf(h.address)] || 0) + 1;
    const known = new Set(REGIONS.flatMap(([, cs]) => cs));
    const groups = REGIONS.map(([region, cs]) => [region, cs.filter((c) => count[c])]).filter(([, cs]) => cs.length);
    const other = Object.keys(count).filter((c) => !known.has(c));
    if (other.length) groups.push(['სხვა', other.sort()]);
    return { groups, count };
  }, [allHotels.data]);

  const cityCenters = useMemo(
    () => (city ? (allHotels.data || []).filter((h) => cityOf(h.address) === city) : []),
    [city, allHotels.data],
  );
  const hotelsInArea = useMemo(
    () => (hotels.data || []).filter((h) => !city || cityOf(h.address) === city),
    [hotels.data, city],
  );
  const poisInArea = useMemo(
    () =>
      (pois.data || []).filter((p) => !city || cityCenters.some((c) => distanceKm(c, p) <= NEAR_KM)),
    [pois.data, city, cityCenters],
  );

  const all = cats.size === 0;
  const visibleHotels = all || cats.has('hotels') ? hotelsInArea : [];
  const visiblePois = poisInArea.filter((p) => all || cats.has(p.type));
  const counts = useMemo(() => {
    const c = { hotels: hotelsInArea.length };
    for (const p of poisInArea) c[p.type] = (c[p.type] || 0) + 1;
    return c;
  }, [hotelsInArea, poisInArea]);
  const linkSearch = datesValid ? qs(stay) : '';

  const toggleCat = (id) =>
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onCheckIn = (v) => {
    setCheckIn(v);
    if (v && (!checkOut || checkOut <= v)) setCheckOut(addDays(v, 1));
  };
  const filtersOn = city || checkIn || maxPrice || cats.size > 0;
  const reset = () => {
    setCity('');
    setCheckIn('');
    setCheckOut('');
    setMaxPrice('');
    setCats(new Set());
    setSelected(null);
  };

  return (
    <div className="container">
      <div className="page-head" style={{ paddingBottom: 12 }}>
        <h1>ძებნა რუკაზე</h1>
        <p>აირჩიე ადგილი და თარიღები: ნახავ თავისუფალ სასტუმროებს და რა არის მათ გარშემო სანახავი.</p>
      </div>

      <div className="card search-bar">
        <label className="field grow">
          <span>სად მიდიხარ?</span>
          <select
            className="input"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setSelected(null);
            }}
          >
            <option value="">მთელი საქართველო</option>
            {cityGroups.groups.map(([region, cs]) => (
              <optgroup key={region} label={region}>
                {cs.map((c) => (
                  <option key={c} value={c}>
                    {c} ({cityGroups.count[c]})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
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
          <span>ბიუჯეტი ღამეში</span>
          <select className="input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">ნებისმიერი</option>
            <option value="100">100 ₾-მდე</option>
            <option value="150">150 ₾-მდე</option>
            <option value="200">200 ₾-მდე</option>
          </select>
        </label>
        {filtersOn && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            <Icon name="x" size={16} /> გასუფთავება
          </button>
        )}
      </div>

      <div className="chips mt-2" role="group" aria-label="რა გაჩვენო რუკაზე">
        <button type="button" className={`chip${all ? ' on' : ''}`} onClick={() => setCats(new Set())} aria-pressed={all}>
          ყველა
        </button>
        {CATEGORIES.map((t) => {
          const on = cats.has(t.id);
          const n = counts[t.id] || 0;
          return (
            <button
              key={t.id}
              type="button"
              className={`chip${on ? ' on' : ''}`}
              onClick={() => toggleCat(t.id)}
              aria-pressed={on}
              disabled={!n && !on}
            >
              <span className="dot" style={{ background: t.color }} /> {t.label}
              <span className="chip-count">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="search-layout">
        <div className="results">
          <ErrorBox error={hotels.error} onRetry={hotels.reload} />
          {(all || cats.has('hotels')) && (
            <>
              <h3 className="inline">
                სასტუმროები · {hotels.data ? visibleHotels.length : '…'} {hotels.loading && <Spinner small />}
              </h3>
              {hotels.data && visibleHotels.length === 0 && (
                <div className="card card-body muted small">
                  {datesValid ? 'ამ თარიღებში თავისუფალი ოთახი ვერ მოიძებნა. სცადე სხვა თარიღები ან ბიუჯეტი.' : 'აქ სასტუმრო ჯერ არ გვაქვს.'}
                </div>
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
          {visiblePois.length > 0 && <h3>{city ? 'სანახავი ახლომახლო' : 'სანახავი ადგილები'} · {visiblePois.length}</h3>}
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
