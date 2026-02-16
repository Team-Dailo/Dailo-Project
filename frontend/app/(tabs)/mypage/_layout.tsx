// app/(tabs)/mypage/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

/** 게시판 기록 등과 동일한 상단 헤더·제목 스타일 */
const headerTitleStyle = { fontSize: 16, fontWeight: "600" as const, color: "#111827" };
const headerStyle = {
  backgroundColor: "#FFFFFF",
  borderBottomWidth: 1,
  borderBottomColor: "#E5E7EB",
};
const headerScreenOptions = {
  headerTitleAlign: "center" as const,
  headerTitleStyle,
  headerStyle,
  headerShadowVisible: false,
};

export default function MyPageLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...headerScreenOptions,
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
          headerTitleAlign: "center",
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{ title: "알림설정", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="location-permission"
        options={{ title: "위치 권한", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="contact"
        options={{ title: "문의하기", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen name="saved-festivals" options={{ headerShown: false }} />
      <Stack.Screen name="participation-history" options={{ headerShown: false }} />
      <Stack.Screen name="my-reports" options={{ headerShown: false }} />
      <Stack.Screen name="block-list" options={{ headerShown: false }} />
      <Stack.Screen
        name="admin"
        options={{ title: "관리자 메뉴", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-events"
        options={{ title: "행사 관리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-event-likes"
        options={{ title: "행사별 좋아요 수", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-members"
        options={{ title: "회원 목록", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-block-management"
        options={{ title: "차단관리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-event-detail"
        options={{ title: "행사 상세", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-event-edit"
        options={{ title: "행사 추가/수정", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-event-edit-detail"
        options={{ title: "행사 등록/수정 (상세형)", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="event-location-picker"
        options={{ title: "위치 선택", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="demo-settings"
        options={{ title: "시범 설정", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-report-record"
        options={{ title: "신고 기록", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-reports"
        options={{ title: "신고 처리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-report-detail"
        options={{ title: "신고 상세", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-sync-logs"
        options={{ title: "동기화 로그", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-sync-log-detail"
        options={{ title: "동기화 로그 상세", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-ingest-logs"
        options={{ title: "수집 로그", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-ingest-log-detail"
        options={{ title: "수집 로그 상세", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-posts"
        options={{ title: "게시글 관리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="guide"
        options={{ title: "이용 안내", headerShown: false }}
      />
      <Stack.Screen
        name="admin-guide"
        options={{ title: "이용 안내 수정", headerShown: false }}
      />
      <Stack.Screen
        name="admin-notices"
        options={{ title: "공지사항 관리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-notice-write"
        options={{ title: "공지 작성/수정", headerShown: true, headerTitleAlign: "center" }}
      />
    </Stack>
  );
}
