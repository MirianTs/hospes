import { Link, useSearchParams } from 'react-router-dom';
import HotelCard from '../components/HotelCard.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorBox, Loading, useApi } from '../components/ui.jsx';
import { POI_BY_ID, POI_TYPES } from '../format.js';

const TABS = [{ id: 'hotels', label: 'სასტუმროები', icon: 'home' }, ...POI_TYPES];

export function PoiCard({ poi }) {
  const t = POI_BY_ID[poi.type];
  return (
    <div className="card poi-card">
      <div className="poi-icon" style={{ background: t.color }}>
        <Icon name={t.icon} size={20} />
      </div>
      <div>
        <div className="muted small">{t.one}</div>
        <h3>{poi.name}</h3>
        {poi.description && <p>{poi.description}</p>}
        <div className="inline small">
          <Link to={`/map?focus=p:${poi.id}`}>
            <Icon name="map" size={14} /> რუკაზე
          </Link>
          <a href={poi.google_maps_url} target="_blank" rel="noreferrer" className="inline" style={{ gap: 4 }}>
            Google Maps <Icon name="external" size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'hotels';
  const hotels = useApi('/hotels');
  const pois = useApi('/pois');

  const count = (id) => (id === 'hotels' ? hotels.data?.length : pois.data?.filter((p) => p.type === id).length);
  const items = tab === 'hotels' ? hotels : pois;

  return (
    <div className="container container-wide">
      <div className="page-head">
        <h1>სერვისები</h1>
        <p>დასაჯავშნი გესთჰაუსები და ყველაფერი, რაც მათ გარშემოა: სად ვჭამოთ, რა ვნახოთ და ვინ გვიმასპინძლოს.</p>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setParams(t.id === 'hotels' ? {} : { tab: t.id }, { replace: true })}
          >
            <Icon name={t.icon} size={16} /> {t.label}
            {count(t.id) != null && <span className="count">{count(t.id)}</span>}
          </button>
        ))}
      </div>

      <ErrorBox error={items.error} onRetry={items.reload} />
      {items.loading && <Loading />}
      {tab === 'hotels' && hotels.data && (
        <div className="grid grid-3">
          {hotels.data.map((h) => (
            <HotelCard key={h.id} hotel={h} />
          ))}
        </div>
      )}
      {tab !== 'hotels' && pois.data && (
        <div className="grid grid-2">
          {pois.data
            .filter((p) => p.type === tab)
            .map((p) => (
              <PoiCard key={p.id} poi={p} />
            ))}
        </div>
      )}
      {tab !== 'hotels' && (
        <div className="mt-3">
          <Link to={`/map?type=${tab}`} className="btn btn-outline">
            <Icon name="map" size={16} /> ყველა {POI_BY_ID[tab].label.toLowerCase()} რუკაზე
          </Link>
        </div>
      )}
    </div>
  );
}
