// 딥링크 app://login-verified?token=xxx 처리: 토큰 교환 후 로그인 완료
import React, { useEffect, useRef } from 'react';
import { Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import * as authService from '../services/auth.service';

const LOGIN_VERIFIED_PREFIX = 'app://login-verified';

function parseTokenFromUrl(url: string): string | null {
  const match = url.match(/login-verified\?token=([^&\s]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function LoginVerifiedHandler() {
  const { login } = useAuth();
  const handling = useRef(false);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.startsWith(LOGIN_VERIFIED_PREFIX)) return;
      const token = parseTokenFromUrl(url);
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
        router.replace('/(tabs)');
      } catch (e) {
        const message = e instanceof Error ? e.message : '로그인 확인이 만료되었거나 이미 사용된 링크입니다.';
        Alert.alert('로그인 완료 실패', message, [{ text: '확인' }]);
      } finally {
        handling.current = false;
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (ev) => handleUrl(ev.url));
    return () => sub.remove();
  }, [login]);

  return null;
}
