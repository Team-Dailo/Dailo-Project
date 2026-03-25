// app/_layout.tsx
import React, { useEffect } from 'react';
import { AppState, BackHandler } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginVerifiedHandler } from '../components/LoginVerifiedHandler';
import { KakaoLoginHandler } from '../components/KakaoLoginHandler';
import { reconcileFestivalParticipationIfOutsideZone } from '../services/festivalParticipationReconcile';
import { flushPendingStaySyncQueue } from '../services/staySessionSync';

function getKakaoNativeAppKey(): string {
  const plugins = Constants.expoConfig?.plugins as [string, { nativeAppKey?: string }][] | undefined;
  const plugin = plugins?.find((p) => Array.isArray(p) && p[0] === '@react-native-kakao/core');
  const key = plugin?.[1]?.nativeAppKey ?? process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? '';
  return typeof key === 'string' ? key : '';
}

// Expo Go 여부 확인 (appOwnership이 'expo'이면 Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';

// 스플래시를 첫 프레임 그린 뒤 숨기기 (넘어가지 않는 현상 방지)
SplashScreen.preventAutoHideAsync();

function hideSplash() {
  SplashScreen.hideAsync().catch(() => {});
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  // 안드로이드 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const onBackPress = () => {
      // segments 예시: ['(tabs)', 'home'] or ['(tabs)', 'mypage', 'settings'] or ['board', '123']
      const firstSegment = segments[0] as string | undefined;

      // 탭 외부 화면(board, event, login 등)에서는 뒤로가기
      if (firstSegment && firstSegment !== '(tabs)') {
        router.back();
        return true; // 기본 동작 방지
      }

      // 탭 내부에서는 (tabs)/_layout.tsx의 BackHandler가 처리하도록 위임
      // return false로 다음 핸들러에게 전달
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [segments, router]);

  // 체류 종료 대기 큐 → 구역 밖 재검증(지도 미오픈 시에도 서버·로컬 일치)
  useEffect(() => {
    const run = async () => {
      await flushPendingStaySyncQueue();
      await reconcileFestivalParticipationIfOutsideZone();
    };
    void run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void run();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Expo Go에서는 Kakao SDK 초기화 스킵
    if (isExpoGo) {
      console.log('Expo Go mode - Kakao SDK skipped');
      return;
    }

    (async () => {
      try {
        const { initializeKakaoSDK } = await import('@react-native-kakao/core');
        const kakaoKey = getKakaoNativeAppKey();
        if (kakaoKey && kakaoKey !== 'REPLACE_WITH_KAKAO_NATIVE_APP_KEY') {
          initializeKakaoSDK(kakaoKey);
        }
      } catch (e) {
        console.log('Kakao SDK not available');
      }
    })();
  }, []);

  useEffect(() => {
    // 첫 프레임 그린 뒤 + 짧은 지연 후 (안드로이드에서 hideAsync가 적용되도록)
    const raf = requestAnimationFrame(() => {
      hideSplash();
      setTimeout(hideSplash, 100);
    });
    const fallback = setTimeout(hideSplash, 2500); // 2.5초 후 무조건 숨김
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <AuthProvider>
      <LoginVerifiedHandler />
      <KakaoLoginHandler />
      <Stack screenOptions={{ headerShown: false }}>
        {/* 하단 탭 그룹 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 탭 밖에서 열리는 화면들 (필요 시 확장) */}
        <Stack.Screen name="board" options={{ headerShown: false }} />
        <Stack.Screen name="event" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
