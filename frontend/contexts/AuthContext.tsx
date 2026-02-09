// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/auth.service';

export type AuthUser = {
  name: string;
  /** 회원 id (게시판 내 글 조회 등) */
  id?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  /** 토큰/이메일이 있으면 user 다시 채우기 (탭 전환 등에서 로그인 상태 동기화) */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const token = await authService.getAccessToken();
      const email = await authService.getStoredUserEmail();
      if (token && email) {
        const me = await authService.getMe();
        const name = me?.nickname || (await authService.getStoredNickname(email)) || email.split('@')[0] || email || '사용자';
        const id = me?.id ?? (await authService.getStoredUserId()) ?? undefined;
        if (me?.id != null) await authService.setStoredUserId(me.id);
        setUser({ name, id });
      } else {
        setUser(null);
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

  const refreshUser = useCallback(async () => {
    const token = await authService.getAccessToken();
    const email = await authService.getStoredUserEmail();
    if (token && email) {
      const me = await authService.getMe();
      const name = me?.nickname || (await authService.getStoredNickname(email)) || email.split('@')[0] || email || '사용자';
      const id = me?.id ?? (await authService.getStoredUserId()) ?? undefined;
      if (me?.id != null) await authService.setStoredUserId(me.id);
      setUser({ name, id });
    } else {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoggedIn: user != null,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
