import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { qs } from '../api.js';
import { HotelImage, PriceFrom } from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import MapView from '../components/MapView.jsx';
import { ErrorBox, Rating, Spinner, useApi } from '../components/ui.jsx';
import { addDays, cityOf, distanceKm, HOTEL_COLOR, nightsBetween, placeName, POI_BY_ID, POI_TYPES, REGIONS, todayStr } from '../format.js';
import { L } from '../prefs.js';

const NEAR_KM = 45; // with a town chosen, places within this distance of its guesthouses are shown

// Chips: nothing selected = everything is shown ("ყველა"). Tapping a chip narrows the map to it;
// more chips can be added, and "ყველა" clears the choice.
const CATEGORIES = () => [{ id: 'hotels', label: L('სასტუმროები', 'Guesthouses'), icon: 'home', color: HOTEL_COLOR }, ...POI_TYPES];

// Place picker: '' = all Georgia, 'r:<region>' = a whole region (all its towns ticked), 'c:<town>' = one town.
function PlacePicker({ value, onChange, groups, count }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };
  const [kind, name] = value ? [value[0], value.slice(2)] : [null, null];
  const label = !value
    ? L('მთელი საქართველო', 'All of Georgia')
    : kind === 'r'
      ? L(`${name} · ყველა`, `${placeName(name)} · all`)
      : placeName(name);
  const regionTotal = (cs) => cs.reduce((n, c) => n + count[c], 0);

  return (
    <div className="place-picker" ref={box}>
      <button type="button" className="input place-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <Icon name="pin" size={16} />
        <span>{label}</span>
        <Icon name="arrowRight" size={14} className="place-caret" />
      </button>
      {open && (
        <div className="place-menu" role="listbox">
          {/* Each choice is an option of the listbox, so screen readers say which one is selected. */}
          <button type="button" role="option" aria-selected={!value} className={`place-opt place-all${!value ? ' on' : ''}`} onClick={() => pick('')}>
            <span className="place-check" /> {L('მთელი საქართველო', 'All of Georgia')}
          </button>
          {groups.map(([region, cs]) => {
            const regionOn = kind === 'r' && name === region;
            return (
              <div key={region} className="place-group">
                <button
                  type="button"
                  role="option"
                  aria-selected={regionOn}
                  className={`place-opt place-region${regionOn ? ' on' : ''}`}
                  onClick={() => pick(`r:${region}`)}
                >
                  <span className="place-check" /> {placeName(region)}
                  <span className="place-n">{regionTotal(cs)}</span>
                </button>
                {cs.map((c) => {
                  const on = regionOn || (kind === 'c' && name === c);
                  return (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={`place-opt place-city${on ? ' on' : ''}`}
                      onClick={() => pick(`c:${c}`)}
                    >
                      <span className="place-check" /> {placeName(c)}
                      <span className="place-n">{count[c]}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MapSearch() {
  const [params] = useSearchParams();
  const initialType = params.get('type');
  const [place, setPlace] = useState(
    () => params.get('place') || (params.get('city') ? `c:${params.get('city')}` : ''),
  );
  const [checkIn, setCheckIn] = useState(() => (params.get('in') >= todayStr() ? params.get('in') : ''));
  const [checkOut, setCheckOut] = useState(() => (params.get('in') >= todayStr() ? params.get('out') || '' : ''));
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

  // Towns covered by the current choice (null = all Georgia).
  const towns = useMemo(() => {
    if (!place) return null;
    if (place.startsWith('c:')) return new Set([place.slice(2)]);
    const group = cityGroups.groups.find(([r]) => r === place.slice(2));
    return new Set(group ? group[1] : []);
  }, [place, cityGroups]);
  const inTowns = (h) => !towns || towns.has(cityOf(h.address));
  const centers = useMemo(() => (towns ? (allHotels.data || []).filter(inTowns) : []), [towns, allHotels.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const hotelsInArea = useMemo(() => (hotels.data || []).filter(inTowns), [hotels.data, towns]); // eslint-disable-line react-hooks/exhaustive-deps
  const poisInArea = useMemo(
    () => (pois.data || []).filter((p) => !towns || centers.some((c) => distanceKm(c, p) <= NEAR_KM)),
    [pois.data, towns, centers],
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
  const filtersOn = place || checkIn || maxPrice || cats.size > 0;
  const reset = () => {
    setPlace('');
    setCheckIn('');
    setCheckOut('');
    setMaxPrice('');
    setCats(new Set());
    setSelected(null);
  };

  return (
    <div className="container container-wide">
      <div className="page-head" style={{ paddingBottom: 12 }}>
        <h1>{L('ძებნა რუკაზე', 'Map search')}</h1>
        <p>
          {L(
            'აირჩიე კუთხე ან ქალაქი და თარიღები: ნახავ თავისუფალ სასტუმროებს და რა არის მათ გარშემო სანახავი.',
            'Pick a region or town and your dates to see available guesthouses and what there is to see around them.',
          )}
        </p>
      </div>

      <div className="card search-bar">
        <div className="field grow">
          <span>{L('სად მიდიხარ?', 'Where are you going?')}</span>
          <PlacePicker
            value={place}
            groups={cityGroups.groups}
            count={cityGroups.count}
            onChange={(v) => {
              setPlace(v);
              setSelected(null);
            }}
          />
        </div>
        <label className="field">
          <span>{L('შესვლა', 'Check-in')}</span>
          <input className="input" type="date" min={todayStr()} value={checkIn} onChange={(e) => onCheckIn(e.target.value)} />
        </label>
        <label className="field">
          <span>{L('გასვლა', 'Check-out')}</span>
          <input
            className="input"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : todayStr()}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{L('ბიუჯეტი ღამეში', 'Budget per night')}</span>
          <select className="input" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
            <option value="">{L('ნებისმიერი', 'Any')}</option>
            <option value="100">{L('100 ₾-მდე', 'Up to 100 ₾')}</option>
            <option value="150">{L('150 ₾-მდე', 'Up to 150 ₾')}</option>
            <option value="200">{L('200 ₾-მდე', 'Up to 200 ₾')}</option>
          </select>
        </label>
        {filtersOn && (
          <button type="button" className="btn btn-ghost" onClick={reset}>
            <Icon name="x" size={16} /> {L('გასუფთავება', 'Clear')}
          </button>
        )}
      </div>

      <div className="chips mt-2" role="group" aria-label={L('რა გაჩვენო რუკაზე', 'What to show on the map')}>
        <button type="button" className={`chip${all ? ' on' : ''}`} onClick={() => setCats(new Set())} aria-pressed={all}>
          {L('ყველა', 'All')}
        </button>
        {CATEGORIES().map((t) => {
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
                {L('სასტუმროები', 'Guesthouses')} · {hotels.data ? visibleHotels.length : '…'} {hotels.loading && <Spinner small />}
              </h3>
              {hotels.data && visibleHotels.length === 0 && (
                <div className="card card-body muted small">
                  {datesValid
                    ? L(
                        'ამ თარიღებში თავისუფალი ოთახი ვერ მოიძებნა. სცადე სხვა თარიღები ან ბიუჯეტი.',
                        'No rooms are available on these dates. Try other dates or a different budget.',
                      )
                    : L('აქ სასტუმრო ჯერ არ გვაქვს.', "We don't have any guesthouses here yet.")}
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
                        {L('ნახვა', 'View')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          {visiblePois.length > 0 && <h3>{place ? L('სანახავი ახლომახლო', 'Things to see nearby') : L('სანახავი ადგილები', 'Places to see')} · {visiblePois.length}</h3>}
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
