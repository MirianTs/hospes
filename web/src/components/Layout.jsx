import { LogoMark } from './Logo.jsx';
import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { resetDemo, STATIC_DEMO } from '../api.js';
import { useAuth } from '../auth.jsx';
import { initial } from '../format.js';
import { L, setLang, setTheme, usePrefs } from '../prefs.js';
import Icon from './Icon.jsx';
import { Loading } from './ui.jsx';

const mainLinks = () => [
  { to: '/', label: L('მთავარი', 'Home'), end: true },
  { to: '/services', label: L('სერვისები', 'Services') },
  { to: '/map', label: L('რუკა', 'Map') },
];

function roleLinks(user) {
  if (!user) return [];
  const links = [{ to: '/cabinet', label: L('ჩემი ჯავშნები', 'My bookings') }];
  if (user.role === 'owner' || user.role === 'admin') links.push({ to: '/owner', label: L('დეშბორდი', 'Dashboard') });
  if (user.role === 'admin') {
    links.push({ to: '/admin', label: L('ადმინი', 'Admin') });
    links.push({ to: '/lock', label: L('საკეტი', 'Lock') });
  }
  return links;
}

// Light / dark and ქართული / English, next to the menu button.
function Switches() {
  const { lang, theme } = usePrefs();
  const dark = theme === 'dark';
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        title={dark ? L('ნათელი რეჟიმი', 'Light mode') : L('მუქი რეჟიმი', 'Dark mode')}
        aria-label={dark ? L('ნათელი რეჟიმი', 'Light mode') : L('მუქი რეჟიმი', 'Dark mode')}
      >
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>
      <button
        type="button"
        className="btn btn-ghost lang-btn"
        onClick={() => setLang(lang === 'en' ? 'ka' : 'en')}
        title={lang === 'en' ? 'ქართულად' : 'In English'}
        aria-label={lang === 'en' ? 'ქართულად' : 'In English'}
        lang={lang === 'en' ? 'ka' : 'en'}
      >
        {lang === 'en' ? 'ქარ' : 'EN'}
      </button>
    </>
  );
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
        <div className="container container-wide header-inner">
          <Link to="/" className="logo" aria-label={L('Hospes: მთავარი', 'Hospes: home')}>
            <LogoMark size={36} />
            <span className="logo-word">Hospes</span>
          </Link>
          <nav className={`nav${open ? ' open' : ''}`} aria-label={L('მთავარი მენიუ', 'Main menu')}>
            {[...mainLinks(), ...roleLinks(user)].map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <a href="/" className="nav-auth" onClick={(e) => (e.preventDefault(), signOut())}>
                {L('გასვლა', 'Sign out')} ({user.name})
              </a>
            ) : (
              <>
                <NavLink to="/login" className="nav-auth">
                  {L('შესვლა', 'Sign in')}
                </NavLink>
                <NavLink to="/register" className="nav-auth">
                  {L('რეგისტრაცია', 'Sign up')}
                </NavLink>
              </>
            )}
          </nav>
          <div className="header-actions">
            <Switches />
            {user ? (
              <>
                <Link to="/cabinet" className="user-chip hide-sm" title={user.email}>
                  <span className="avatar">{initial(user.name)}</span>
                  {user.name.split(' ')[0]}
                </Link>
                <button type="button" className="btn btn-ghost btn-icon hide-sm" onClick={signOut} title={L('გასვლა', 'Sign out')} aria-label={L('გასვლა', 'Sign out')}>
                  <Icon name="logout" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost hide-sm">
                  {L('შესვლა', 'Sign in')}
                </Link>
                <Link to="/register" className="btn btn-primary hide-sm">
                  {L('რეგისტრაცია', 'Sign up')}
                </Link>
              </>
            )}
            <button
              type="button"
              className="btn btn-outline btn-icon menu-btn"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={L('მენიუ', 'Menu')}
            >
              <Icon name={open ? 'x' : 'menu'} />
            </button>
          </div>
        </div>
      </header>
      <main>
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="footer">
        <div className="container container-wide inner">
          <span>© 2026 Hospes · {L('Smartstay 2026 ჰაკათონის დემო', 'Smartstay 2026 hackathon demo')}</span>
          {STATIC_DEMO && (
            <span>
              {L(
                'ონლაინ დემო: სერვერისა და Arduino-ს გარეშე, მონაცემები მხოლოდ ამ ბრაუზერში ინახება',
                'Online demo: no server or Arduino, data is kept only in this browser',
              )}{' '}
              ·{' '}
              <button type="button" className="link-button" onClick={resetDemo}>
                {L('თავიდან დაწყება', 'Start over')}
              </button>
            </span>
          )}
          <span>
            {L('რუკა', 'Map')}: ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap
            </a>{' '}
            {L('ავტორები · ფოტოები', 'contributors · Photos')}: <Link to="/credits">Wikimedia Commons</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
