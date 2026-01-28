// app/(tabs)/mypage/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function MyPageLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="settings"
        options={{
          title: "설정",
          headerShown: true,
          headerTitleAlign: "left",
        }}
      />
    </Stack>
  );
}
