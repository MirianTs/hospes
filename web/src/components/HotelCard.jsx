import { Link } from 'react-router-dom';
import { money } from '../format.js';
import HotelArt from './HotelArt.jsx';
import Icon from './Icon.jsx';
import { KeyBadge, Rating } from './ui.jsx';

export function HotelImage({ hotel }) {
  const photo = hotel.photos?.[0];
  return photo ? <img src={photo} alt={hotel.name} loading="lazy" /> : <HotelArt seed={hotel.id} label={hotel.name} />;
}

export function PriceFrom({ value }) {
  if (value == null) return null;
  return (
    <span className="price">
      {money(value)}
      <small>-დან / ღამე</small>
    </span>
  );
}

export default function HotelCard({ hotel, search = '' }) {
  return (
    <Link to={`/hotels/${hotel.id}${search}`} className="card hotel-card">
      <div className="art">
        <HotelImage hotel={hotel} />
      </div>
      <div className="body">
        <div className="spread">
          <h3>{hotel.name}</h3>
          <Rating value={hotel.google_rating} />
        </div>
        <div className="muted small inline">
          <Icon name="pin" size={14} /> {hotel.address}
        </div>
        <div className="inline">
          {(hotel.key_types || []).map((t) => (
            <KeyBadge key={t} type={t} />
          ))}
        </div>
        <div className="foot">
          <span className="muted small">{(hotel.services || []).slice(0, 2).join(' · ')}</span>
          <PriceFrom value={hotel.min_price} />
        </div>
      </div>
    </Link>
  );
}
