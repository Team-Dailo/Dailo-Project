// app/(tabs)/mypage/_layout.tsx
import { Stack, router } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";

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
  const navigation = useNavigation();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.canGoBack()) {
        router.replace("/(tabs)/home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

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

      {/* 헤더를 컴포넌트 내부에서 <Stack.Screen>으로 설정하는 화면들은
          여기에서 중복 정의하지 않는다 (중복 헤더로 인한 크래시 방지). */}
      <Stack.Screen name="saved-festivals" options={{ headerShown: false }} />
      <Stack.Screen name="participation-history" options={{ headerShown: false }} />
      <Stack.Screen name="my-reports" options={{ headerShown: false }} />
      <Stack.Screen name="block-list" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
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
        name="admin-event-views"
        options={{ title: "행사별 조회수", headerShown: true, headerTitleAlign: "center" }}
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
      {/* guide, admin-guide 역시 각 파일 내에서 <Stack.Screen>으로 헤더를 정의함 */}
      <Stack.Screen
        name="admin-notices"
        options={{ title: "공지사항 관리", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-notice-write"
        options={{ title: "공지 작성/수정", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-inquiries"
        options={{ title: "문의 목록", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-inquiry-detail"
        options={{ title: "문의 상세", headerShown: true, headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="admin-privacy-policy"
        options={{ title: "개인정보처리방침 수정", headerShown: true, headerTitleAlign: "center" }}
      />
    </Stack>
  );
}
