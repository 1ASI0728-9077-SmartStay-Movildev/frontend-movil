import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ApiError, api, setToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser, Profile } from '../api/types';

type Session = {
  user: AuthUser | null;
  // Perfil del usuario: undefined = aún no consultado, null = no tiene perfil.
  profile: Profile | null | undefined;
  isAdmin: boolean;
  isChainAdmin: boolean;
  // Mensaje que se muestra una vez en la pantalla de acceso (p. ej. tras cambiar la contraseña).
  notice: string | null;
  login: (u: AuthUser) => void;
  logout: (notice?: string) => void;
  setProfile: (p: Profile | null) => void;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<Session>({
  user: null,
  profile: undefined,
  isAdmin: false,
  isChainAdmin: false,
  notice: null,
  login: () => {},
  logout: () => {},
  setProfile: () => {},
  refreshProfile: async () => {},
});

// Todo vive solo en memoria: al cerrar la app se pierde la sesión.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  const login = (u: AuthUser) => {
    setToken(u.token);
    setNotice(null);
    setProfile(undefined);
    setUser(u);
  };
  const logout = useCallback((msg?: string) => {
    setToken(null);
    setUser(null);
    setProfile(undefined);
    setNotice(typeof msg === 'string' ? msg : null);
  }, []);

  const userId = user?.id;
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setProfile(await api.profileByUser(userId));
    } catch (e) {
      // 404 = el usuario todavía no creó su perfil.
      if (e instanceof ApiError && e.status === 404) setProfile(null);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) refreshProfile();
  }, [userId, refreshProfile]);

  useEffect(() => {
    setUnauthorizedHandler(() => logout('Tu sesión venció. Vuelve a iniciar sesión.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const role = user?.role ?? '';
  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        isAdmin: role === 'admin' || role === 'chain_admin',
        isChainAdmin: role === 'chain_admin',
        notice,
        login,
        logout,
        setProfile,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
