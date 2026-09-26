import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFound() {
  return (
    <div className="container section center-text">
      <Icon name="compass" size={40} className="muted" />
      <h1 className="mt-2">გვერდი ვერ მოიძებნა</h1>
      <p className="muted">შეიძლება ბმული შეიცვალა ან წაიშალა.</p>
      <Link to="/" className="btn btn-primary">
        მთავარზე დაბრუნება
      </Link>
    </div>
  );
}
