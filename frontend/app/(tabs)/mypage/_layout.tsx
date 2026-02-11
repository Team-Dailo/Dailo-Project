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
      <Stack.Screen name="saved-festivals" options={{ headerShown: false }} />
      <Stack.Screen name="my-reports" options={{ headerShown: false }} />
      <Stack.Screen name="block-list" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin"
        options={{ title: "관리자 메뉴", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-events"
        options={{ title: "행사 관리", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-event-detail"
        options={{ title: "행사 상세", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-event-edit"
        options={{ title: "행사 추가/수정", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-event-edit-detail"
        options={{ title: "행사 등록/수정 (상세형)", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-reports"
        options={{ title: "신고 처리", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-report-detail"
        options={{ title: "신고 상세", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-sync-logs"
        options={{ title: "동기화 로그", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-sync-log-detail"
        options={{ title: "동기화 로그 상세", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-ingest-logs"
        options={{ title: "수집 로그", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-ingest-log-detail"
        options={{ title: "수집 로그 상세", headerShown: true, headerTitleAlign: "left" }}
      />
      <Stack.Screen
        name="admin-posts"
        options={{ title: "게시글 관리", headerShown: true, headerTitleAlign: "left" }}
      />
    </Stack>
  );
}
