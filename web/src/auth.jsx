import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return null;
    }
    try {
      const { user } = await api('/auth/me');
      setUser(user);
      return user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onLogout = () => setUser(null);
    window.addEventListener('hospes:logout', onLogout);
    return () => window.removeEventListener('hospes:logout', onLogout);
  }, [refresh]);

  const value = useMemo(() => {
    const start = ({ token, user }) => {
      setToken(token);
      setUser(user);
      return user;
    };
    return {
      user,
      loading,
      setUser,
      refresh,
      login: async (email, password) => start(await api('/auth/login', { method: 'POST', body: { email, password } })),
      register: async (data) => start(await api('/auth/register', { method: 'POST', body: data })),
      logout: () => {
        setToken(null);
        setUser(null);
      },
    };
  }, [user, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Where to land after login, by role.
export function homeFor(user) {
  if (user?.role === 'owner') return '/owner';
  if (user?.role === 'admin') return '/admin';
  return '/cabinet';
}

// ?next= after login, sign-up or verification: only same-site paths, so it can't send people to
// another site. Browsers read "/\evil.com" like "//evil.com", so a backslash anywhere is refused too.
export function safeNext(next) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null;
}
