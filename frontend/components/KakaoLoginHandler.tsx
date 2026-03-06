import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import * as authService from '../services/auth.service';

const KAKAO_LOGIN_PREFIX = 'app://kakao-login';

function parseSocialTokenFromUrl(url: string): { accessToken: string; refreshToken: string; accessTokenExpiresIn: number } | null {
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

export function KakaoLoginHandler() {
  const { login } = useAuth();
  const url = Linking.useURL();
  const handling = useRef(false);

  useEffect(() => {
    const handleUrl = async (urlToHandle: string | null) => {
      const tokenDto = urlToHandle ? parseSocialTokenFromUrl(urlToHandle) : null;
      if (!tokenDto || handling.current) return;
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
    };

    if (url) {
      handleUrl(url);
    }
  }, [url, login]);

  return null;
}

