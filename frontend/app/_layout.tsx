// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
    <Stack screenOptions={{ headerShown: false }}>
      {/* 하단 탭 그룹 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* 탭 밖에서 열리는 화면들 (필요 시 확장) */}
      <Stack.Screen name="board" options={{ headerShown: false }} />
      <Stack.Screen name="event" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
    </AuthProvider>
  );
}
