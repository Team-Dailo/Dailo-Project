// app/_layout.tsx
import React, { useEffect } from 'react';
import { Alert, AppState, BackHandler } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../contexts/AuthContext';
import { AuthDeepLinkHandler } from '../components/AuthDeepLinkHandler';
import AppStartupPopupModal from '../components/AppStartupPopupModal';

const NOTIF_PROMPT_KEY = '@app/notification_prompt_shown';
const PUSH_ENABLED_KEY = '@mypage/notification_push_enabled';
import { reconcileFestivalParticipationIfOutsideZone } from '../services/festivalParticipationReconcile';
import { flushPendingStaySyncQueue } from '../services/staySessionSync';
import { saveNotificationRecord } from '../services/notificationHistory.service';

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

  // 첫 실행 시 알림 허용 여부 묻기
  useEffect(() => {
    (async () => {
      try {
        const shown = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
        if (shown) return;
        await AsyncStorage.setItem(NOTIF_PROMPT_KEY, 'true');
        // 아직 설정값이 없는 경우에만 묻기
        const existing = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
        if (existing !== null) return;
        Alert.alert(
          '알림 설정',
          '새로운 행사와 소식을 알림으로 받아보시겠어요?',
          [
            {
              text: '나중에',
              style: 'cancel',
              onPress: async () => {
                await AsyncStorage.setItem(PUSH_ENABLED_KEY, 'false');
              },
            },
            {
              text: '알림 허용',
              onPress: async () => {
                const { status } = await Notifications.requestPermissionsAsync();
                await AsyncStorage.setItem(PUSH_ENABLED_KEY, status === 'granted' ? 'true' : 'false');
              },
            },
          ],
        );
      } catch {}
    })();
  }, []);

  useEffect(() => {
    // 포그라운드 수신
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const eventId = data?.eventId != null ? String(data.eventId) : undefined;
      void saveNotificationRecord({
        title: title ?? '',
        body: body ?? '',
        receivedAt: new Date().toISOString(),
        eventId,
      });
    });

    // 백그라운드·종료 상태에서 알림 탭해서 진입한 경우
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;
      const eventId = data?.eventId != null ? String(data.eventId) : undefined;
      void saveNotificationRecord({
        title: title ?? '',
        body: body ?? '',
        receivedAt: new Date().toISOString(),
        eventId,
      });
      if (eventId) {
        router.push(`/event/${eventId}` as import('expo-router').Href);
      }
    });

    // 앱이 완전히 꺼진 상태에서 알림 탭으로 실행된 경우
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const { title, body, data } = response.notification.request.content;
      const eventId = data?.eventId != null ? String(data.eventId) : undefined;
      void saveNotificationRecord({
        title: title ?? '',
        body: body ?? '',
        receivedAt: new Date().toISOString(),
        eventId,
      });
      if (eventId) {
        // 콜드 스타트 시 라우터가 준비될 때까지 짧게 대기
        setTimeout(() => {
          router.push(`/event/${eventId}` as import('expo-router').Href);
        }, 500);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

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
      <AuthDeepLinkHandler />
      <AppStartupPopupModal />
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
        <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
        <Stack.Screen name="notification-history" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
