// 로그인 관련 딥링크는 Linking.useURL()을 한 번만 쓰도록 통합
// (여러 컴포넌트에서 useURL을 쓰면 "linking in multiple places" 경고 발생)
import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import * as authService from '../services/auth.service';

const LOGIN_VERIFIED_PREFIX = 'app://login-verified';
const KAKAO_LOGIN_PREFIX = 'app://kakao-login';

function parseTokenFromLoginVerifiedUrl(url: string): string | null {
  const match = url.match(/login-verified\?token=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseSocialTokenFromKakaoUrl(url: string): {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
} | null {
  if (!url.startsWith(KAKAO_LOGIN_PREFIX)) return null;

  const matchAccess = url.match(/[?&]accessToken=([^&]+)/);
  const matchRefresh = url.match(/[?&]refreshToken=([^&]+)/);
  const matchExpires = url.match(/[?&]accessTokenExpiresIn=([^&]+)/);

  if (!matchAccess || !matchRefresh || !matchExpires) return null;

  const accessToken = decodeURIComponent(matchAccess[1]);
  const refreshToken = decodeURIComponent(matchRefresh[1]);
  const expiresInRaw = decodeURIComponent(matchExpires[1]);
  const accessTokenExpiresIn = Number(expiresInRaw) || 0;

  if (!accessToken) return null;

  return { accessToken, refreshToken, accessTokenExpiresIn };
}

export function AuthDeepLinkHandler() {
  const { login } = useAuth();
  const url = Linking.useURL();
  const handling = useRef(false);

  useEffect(() => {
    const run = async () => {
      const urlToHandle = url;
      if (!urlToHandle || handling.current) return;

      if (urlToHandle.startsWith(LOGIN_VERIFIED_PREFIX)) {
        const token = parseTokenFromLoginVerifiedUrl(urlToHandle);
        if (!token) return;
        handling.current = true;
        try {
          const user = await authService.exchangeLoginToken(token);
          login({
            name: user.name,
            id: user.id,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
          });
          router.replace('/(tabs)/home');
        } catch (e) {
          const message =
            e instanceof Error ? e.message : '로그인 확인이 만료되었거나 이미 사용된 링크입니다.';
          Alert.alert('로그인 완료 실패', message, [{ text: '확인' }]);
        } finally {
          handling.current = false;
        }
        return;
      }

      if (urlToHandle.startsWith(KAKAO_LOGIN_PREFIX)) {
        const tokenDto = parseSocialTokenFromKakaoUrl(urlToHandle);
        if (!tokenDto) return;
        handling.current = true;
        try {
          const user = await authService.loginWithSocialToken({
            grantType: 'Bearer',
            accessToken: tokenDto.accessToken,
            refreshToken: tokenDto.refreshToken,
            accessTokenExpiresIn: tokenDto.accessTokenExpiresIn,
          });

          login({
            name: user.name,
            id: user.id,
            email: user.email,
            role: user.role,
            profileImageUrl: user.profileImageUrl,
          });

          router.replace('/(tabs)/home');
        } catch (e) {
          const message =
            e instanceof Error ? e.message : '카카오 로그인 처리 중 오류가 발생했습니다.';
          Alert.alert('카카오 로그인 실패', message, [{ text: '확인' }]);
        } finally {
          handling.current = false;
        }
      }
    };

    void run();
  }, [url, login]);

  return null;
}
