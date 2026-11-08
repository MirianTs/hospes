import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ROLE } from '../format.js';
import { Alert, Loading } from './ui.jsx';
import { L } from '../prefs.js';

export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container section">
        <Alert tone="warn">
          {L('ეს გვერდი მხოლოდ ამ როლებისთვისაა:', 'This page is only for these roles:')} {roles.map((r) => ROLE[r]).join(', ')}.{' '}
          <Link to="/">{L('მთავარზე დაბრუნება', 'Back to home')}</Link>
        </Alert>
      </div>
    );
  }
  return children;
}
