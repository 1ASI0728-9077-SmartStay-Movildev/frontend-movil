import React, { createContext, useContext, useEffect, useState } from 'react';
import { setToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser } from '../api/types';

type Session = {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
};

const Ctx = createContext<Session>({ user: null, login: () => {}, logout: () => {} });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const login = (u: AuthUser) => {
    setToken(u.token);
    setUser(u);
  };
  const logout = () => {
    setToken(null);
    setUser(null);
  };
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
