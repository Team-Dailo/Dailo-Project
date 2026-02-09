// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/auth.service';

export type AuthUser = {
  name: string;
  /** 나중에 id, email 등 확장 */
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const token = await authService.getAccessToken();
      const email = await authService.getStoredUserEmail();
      if (token && email) {
        const nickname = await authService.getStoredNickname(email);
        const name = nickname || email.split('@')[0] || email || '사용자';
        setUser({ name });
      }
    })();
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.clearAuthStorage();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoggedIn: user != null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
