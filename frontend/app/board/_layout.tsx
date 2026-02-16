// app/board/_layout.tsx
import React from "react";
import { Stack } from "expo-router";

export default function BoardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="write" />
      <Stack.Screen name="search" />
      {/* 채팅 화면 주석 처리 <Stack.Screen name="chat" /> */}
      <Stack.Screen name="notice" />
    </Stack>
  );
}
