import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { initial } from '../format.js';
import Icon from './Icon.jsx';

const MAIN_LINKS = [
  { to: '/', label: 'მთავარი', end: true },
  { to: '/services', label: 'სერვისები' },
  { to: '/map', label: 'რუკა' },
];

function roleLinks(user) {
  if (!user) return [];
  const links = [{ to: '/cabinet', label: 'ჩემი ჯავშნები' }];
  if (user.role === 'owner' || user.role === 'admin') links.push({ to: '/owner', label: 'დეშბორდი' });
  if (user.role === 'admin') {
    links.push({ to: '/admin', label: 'ადმინი' });
    links.push({ to: '/lock', label: 'საკეტი' });
  }
  return links;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const signOut = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo" aria-label="Hospes: მთავარი">
            <img src="/favicon.svg" alt="" />
            Hospes
          </Link>
          <nav className={`nav${open ? ' open' : ''}`} aria-label="მთავარი მენიუ">
            {[...MAIN_LINKS, ...roleLinks(user)].map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <a href="/" className="nav-auth" onClick={(e) => (e.preventDefault(), signOut())}>
                გასვლა ({user.name})
              </a>
            ) : (
              <>
                <NavLink to="/login" className="nav-auth">
                  შესვლა
                </NavLink>
                <NavLink to="/register" className="nav-auth">
                  რეგისტრაცია
                </NavLink>
              </>
            )}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link to="/cabinet" className="user-chip hide-sm" title={user.email}>
                  <span className="avatar">{initial(user.name)}</span>
                  {user.name.split(' ')[0]}
                </Link>
                <button type="button" className="btn btn-ghost btn-icon hide-sm" onClick={signOut} title="გასვლა" aria-label="გასვლა">
                  <Icon name="logout" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost hide-sm">
                  შესვლა
                </Link>
                <Link to="/register" className="btn btn-primary hide-sm">
                  რეგისტრაცია
                </Link>
              </>
            )}
            <button
              type="button"
              className="btn btn-outline btn-icon menu-btn"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label="მენიუ"
            >
              <Icon name={open ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container inner">
          <span>© 2026 Hospes · Smartstay 2026 ჰაკათონის დემო</span>
          <span>
            რუკა: ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>{' '}
            ავტორები
          </span>
        </div>
      </footer>
    </>
  );
}
