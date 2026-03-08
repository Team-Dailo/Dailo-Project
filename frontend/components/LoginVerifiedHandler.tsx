// 딥링크 app://login-verified?token=xxx 처리: 토큰 교환 후 로그인 완료
// Expo Router의 링킹과 충돌하지 않도록 expo-linking의 useURL 사용
import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '../hooks/useAuth';
import * as authService from '../services/auth.service';

const LOGIN_VERIFIED_PREFIX = 'app://login-verified';

function parseTokenFromUrl(url: string): string | null {
  const match = url.match(/login-verified\?token=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function LoginVerifiedHandler() {
  const { login } = useAuth();
  const url = Linking.useURL();
  const handling = useRef(false);

  useEffect(() => {
    const handleUrl = async (urlToHandle: string | null) => {
      if (!urlToHandle || !urlToHandle.startsWith(LOGIN_VERIFIED_PREFIX)) return;
      const token = parseTokenFromUrl(urlToHandle);
      if (!token || handling.current) return;
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
        const message = e instanceof Error ? e.message : '로그인 확인이 만료되었거나 이미 사용된 링크입니다.';
        Alert.alert('로그인 완료 실패', message, [{ text: '확인' }]);
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
