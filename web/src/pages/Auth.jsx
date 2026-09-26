import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';
import { ErrorBox, Spinner, useAction } from '../components/ui.jsx';

// Only same-site paths, so ?next= can't send people to another site.
function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

// Seeded demo accounts (backend/src/seed.js), for switching roles during the pitch.
// Remove before a real pilot.
const DEMO_ACCOUNTS = [
  { label: 'სტუმარი', email: 'guest@hospes.test', password: 'guest123' },
  { label: 'მფლობელი', email: 'owner@hospes.test', password: 'owner123' },
  { label: 'ადმინი', email: 'admin@hospes.test', password: 'admin123' },
];

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container" style={{ maxWidth: 480, paddingTop: 40 }}>
      <div className="card card-body" style={{ padding: 28 }}>
        <h1 style={{ fontSize: '1.7rem' }}>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();

  const signIn = async (e, creds = { email, password }) => {
    e?.preventDefault();
    const u = await action.run(() => login(creds.email.trim(), creds.password));
    if (u) navigate(next || homeFor(u), { replace: true });
  };

  if (user) {
    return (
      <AuthShell title="უკვე შესული ხართ" subtitle={`${user.name} · ${user.email}`}>
        <Link to={next || homeFor(user)} className="btn btn-primary btn-block">
          გაგრძელება <Icon name="arrowRight" size={16} />
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="შესვლა" subtitle="შედი, რომ დაჯავშნო, გაიარო ჩექინი ან მართო შენი ობიექტი.">
      <form onSubmit={signIn}>
        <label className="field">
          <span>ელფოსტა</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>პაროლი</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <ErrorBox error={action.error} />
        <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={action.busy}>
          {action.busy && <Spinner small />} შესვლა
        </button>
      </form>
      <p className="muted small mt-2 mb-0">
        ანგარიში არ გაქვს? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>რეგისტრაცია</Link>
      </p>
      <hr className="divider" />
      <div className="small muted">სადემონსტრაციო ანგარიშები:</div>
      <div className="inline mt-1">
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.email} type="button" className="btn btn-sm btn-outline" disabled={action.busy} onClick={() => signIn(null, a)}>
            {a.label}
          </button>
        ))}
      </div>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const action = useAction();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const u = await action.run(() => register(form));
    if (u) navigate(`/verify${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
  };

  return (
    <AuthShell title="რეგისტრაცია" subtitle="რეგისტრაციის შემდეგ ვინაობას დაადასტურებ: პირადობის ფოტო და სელფი.">
      <form onSubmit={submit}>
        <label className="field">
          <span>სახელი და გვარი</span>
          <input className="input" autoComplete="name" required value={form.name} onChange={set('name')} />
        </label>
        <label className="field">
          <span>ტელეფონი</span>
          <input className="input" type="tel" autoComplete="tel" placeholder="+995 5XX XX XX XX" value={form.phone} onChange={set('phone')} />
        </label>
        <label className="field">
          <span>ელფოსტა</span>
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span>პაროლი (მინ. 6 სიმბოლო)</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={form.password}
            onChange={set('password')}
          />
        </label>
        <ErrorBox error={action.error} />
        <button type="submit" className="btn btn-primary btn-block btn-lg mt-2" disabled={action.busy}>
          {action.busy && <Spinner small />} ანგარიშის შექმნა
        </button>
      </form>
      <p className="muted small mt-2 mb-0">
        უკვე გაქვს ანგარიში? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>შესვლა</Link>
      </p>
    </AuthShell>
  );
}
