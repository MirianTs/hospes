import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { money, POI_BY_ID } from '../format.js';
import { iconHtml } from './Icon.jsx';
import { Rating } from './ui.jsx';

const KAKHETI = [41.85, 45.75];

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function hotelIcon(hotel, on) {
  const label = hotel.min_price != null ? money(hotel.min_price) : hotel.name;
  return L.divIcon({ className: '', iconSize: null, html: `<div class="pin-price${on ? ' on' : ''}">${escapeHtml(label)}</div>` });
}

function poiIcon(poi, on) {
  const t = POI_BY_ID[poi.type];
  return L.divIcon({
    className: '',
    iconSize: null,
    html: `<div class="pin-poi${on ? ' on' : ''}" style="background:${t.color}" title="${escapeHtml(poi.name)}">${iconHtml(t.icon, 15)}</div>`,
  });
}

// Leaflet measures its container only once, so re-measure whenever the layout resizes it,
// and fit the view to the markers once per set of markers. A container that is still
// collapsed (hidden tab, layout not done) would give a wrong zoom, so the fit waits for a real size.
function AutoFit({ points, enabled }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join('|');
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const fittedKey = useRef(null);

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const pts = pointsRef.current;
      const size = map.getSize();
      if (!enabled || !pts.length || fittedKey.current === key || size.x < 120 || size.y < 120) return;
      fittedKey.current = key;
      if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 14);
      else map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 13 });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [key, enabled, map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [target, map]);
  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick?.({ lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) }) });
  return null;
}

export default function MapView({
  hotels = [],
  pois = [],
  selected,
  onSelect,
  onPick,
  picked,
  height = '100%',
  fit = true,
  hotelLinkSearch = '',
}) {
  const points = useMemo(() => [...hotels, ...pois, ...(picked ? [picked] : [])], [hotels, pois, picked]);
  const target = useMemo(() => {
    if (!selected) return null;
    const [kind, id] = selected.split(':');
    const list = kind === 'h' ? hotels : pois;
    return list.find((x) => String(x.id) === id) || null;
  }, [selected, hotels, pois]);

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={KAKHETI} zoom={9} scrollWheelZoom style={{ height: '100%' }}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <AutoFit points={points} enabled={fit} />
        <FlyTo target={target} />
        {onPick && <ClickToPick onPick={onPick} />}
        {picked && <Marker position={[picked.lat, picked.lng]} icon={poiIcon({ type: 'landmark', name: 'არჩეული წერტილი' }, true)} />}

        {pois.map((p) => {
          const on = selected === `p:${p.id}`;
          const t = POI_BY_ID[p.type];
          return (
            <Marker
              key={`p${p.id}`}
              position={[p.lat, p.lng]}
              icon={poiIcon(p, on)}
              zIndexOffset={on ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(`p:${p.id}`) }}
            >
              <Popup>
                <h4>{p.name}</h4>
                <p className="muted small">{t.one}</p>
                {p.description && <p>{p.description}</p>}
                <a href={p.google_maps_url} target="_blank" rel="noreferrer">
                  Google Maps-ში გახსნა ↗
                </a>
              </Popup>
            </Marker>
          );
        })}

        {hotels.map((h) => {
          const on = selected === `h:${h.id}`;
          return (
            <Marker
              key={`h${h.id}`}
              position={[h.lat, h.lng]}
              icon={hotelIcon(h, on)}
              zIndexOffset={on ? 2000 : 500}
              eventHandlers={{ click: () => onSelect?.(`h:${h.id}`) }}
            >
              <Popup>
                <h4>{h.name}</h4>
                <p className="inline">
                  <Rating value={h.google_rating} />
                  <span className="muted small">{h.address}</span>
                </p>
                {h.min_price != null && <p>{money(h.min_price)}-დან / ღამე</p>}
                <Link to={`/hotels/${h.id}${hotelLinkSearch}`}>ნახვა და დაჯავშნა →</Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
