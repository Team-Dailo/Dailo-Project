// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authService from '../services/auth.service';
import { registerPushToken } from '../services/notification.service';

export type AuthUser = {
  name: string;
  /** 회원 id (게시판 내 글 조회 등) */
  id?: number;
  /** USER | ADMIN - 관리자일 때 마이페이지에 관리자 메뉴 표시 */
  role?: string;
  /** 로그인한 이메일 (관리자 메뉴 노출 판별용, getMe 실패 시에도 사용) */
  email?: string;
  /** 프로필 사진 URL (getMe에서 채움) */
  profileImageUrl?: string | null;
  /** 프로필 사진 캐시 버전 (로컬에서 이미지 새로고침용) */
  profileImageVersion?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  /** 토큰/이메일이 있으면 user 다시 채우기 (탭 전환 등에서 로그인 상태 동기화) */
  refreshUser: () => Promise<void>;
  /** 프로필 사진 변경 직후 컨텍스트에 즉시 반영 (마이페이지 등에서 바로 표시) */
  updateUserProfileImage: (url: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const token = await authService.getAccessToken();
      const email = await authService.getStoredUserEmail();
      if (!token || !email) {
        setUser(null);
        return;
      }
      const me = await authService.getMe();
      if (!me) {
        await authService.clearAuthStorage();
        setUser(null);
        return;
      }
      const name = me.nickname?.trim() || (await authService.getStoredNickname(email)) || email.split('@')[0] || email || '사용자';
      const id = (me.id != null && me.id > 0 ? me.id : await authService.getStoredUserId()) ?? undefined;
      const role = me.role ?? undefined;
      const meAny = me as Record<string, unknown>;
      const profileImageUrl = (me.profileImageUrl ?? meAny.profile_image_url ?? '')?.toString?.()?.trim() || undefined;
      if (id != null) await authService.setStoredUserId(id);
      setUser({ name, id, role, email, profileImageUrl: profileImageUrl || undefined, profileImageVersion: Date.now() });
      // 앱 시작 시 로그인 상태면 푸시 토큰 등록 (토큰 갱신 대비)
      registerPushToken().catch(() => {});
    })();
  }, []);

  const login = useCallback((u: AuthUser) => {
    setUser({
      ...u,
      profileImageVersion: u.profileImageVersion ?? Date.now(),
    });
    // 로그인 후 푸시 토큰 등록 (비동기, 실패해도 로그인은 진행)
    registerPushToken().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await authService.clearAuthStorage();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await authService.getAccessToken();
    const email = await authService.getStoredUserEmail();
    if (!token || !email) {
      setUser(null);
      return;
    }
    const me = await authService.getMe();
    if (!me) {
      // getMe 실패 시 저장은 지우지 않고, user만 유지 (로그인 직후 마이페이지 포커스에서 상태가 지워지는 것 방지)
      return;
    }
    const name = me.nickname?.trim() || (await authService.getStoredNickname(email)) || email.split('@')[0] || email || '사용자';
    const id = (me.id != null && me.id > 0 ? me.id : await authService.getStoredUserId()) ?? undefined;
    const role = me.role ?? undefined;
    const meAny = me as Record<string, unknown>;
    const profileImageUrl = (me.profileImageUrl ?? meAny.profile_image_url ?? '')?.toString?.()?.trim() || undefined;
    if (id != null) await authService.setStoredUserId(id);
    setUser({ name, id, role, email, profileImageUrl: profileImageUrl || undefined, profileImageVersion: Date.now() });
  }, []);

  const updateUserProfileImage = useCallback((url: string | null) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            profileImageUrl: url ?? undefined,
            profileImageVersion: (prev.profileImageVersion ?? 0) + 1,
          }
        : null
    );
  }, []);

  const value: AuthContextValue = {
    user,
    isLoggedIn: user != null,
    login,
    logout,
    refreshUser,
    updateUserProfileImage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
