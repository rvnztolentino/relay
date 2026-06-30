import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from '../api/client';
import type { User } from '../api/types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token is stored, fetch the current user to restore the session.
  useEffect(() => {
    let active = true;
    async function hydrate() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get<{ user: User }>('/auth/me');
        if (active) setUser(data.user);
      } catch {
        setToken(null); // bad/expired token
      } finally {
        if (active) setLoading(false);
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(email: string, password: string, name: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', {
      email,
      password,
      name,
    });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
