// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { LoginVerifiedHandler } from '../components/LoginVerifiedHandler';

// 스플래시를 첫 프레임 그린 뒤 숨기기 (넘어가지 않는 현상 방지)
SplashScreen.preventAutoHideAsync();

function hideSplash() {
  SplashScreen.hideAsync().catch(() => {});
}

export default function RootLayout() {
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
