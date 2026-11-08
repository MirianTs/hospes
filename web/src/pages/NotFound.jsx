import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { L } from '../prefs.js';

export default function NotFound() {
  return (
    <div className="container section center-text">
      <Icon name="compass" size={40} className="muted" />
      <h1 className="mt-2">{L('გვერდი ვერ მოიძებნა', 'Page not found')}</h1>
      <p className="muted">{L('შეიძლება ბმული შეიცვალა ან წაიშალა.', 'The link may have changed or been removed.')}</p>
      <Link to="/" className="btn btn-primary">
        {L('მთავარზე დაბრუნება', 'Back to home')}
      </Link>
    </div>
  );
}
