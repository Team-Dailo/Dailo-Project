// app/(tabs)/mypage/admin.tsx - 관리자 전용 메뉴 (백엔드 /api/admin/* 연동)
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import * as authService from "../../../services/auth.service";

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { icon: "calendar-outline", label: "행사 관리", route: "/(tabs)/mypage/admin-events" },
  { icon: "heart-outline", label: "행사별 좋아요 수", route: "/(tabs)/mypage/admin-event-likes" },
  { icon: "eye-outline", label: "행사별 조회수", route: "/(tabs)/mypage/admin-event-views" },
  { icon: "newspaper-outline", label: "게시글 관리", route: "/(tabs)/mypage/admin-posts" },
  { icon: "megaphone-outline", label: "공지사항 관리", route: "/(tabs)/mypage/admin-notices" },
  { icon: "flag-outline", label: "신고 기록", route: "/(tabs)/mypage/admin-report-record" },
  { icon: "ban-outline", label: "차단 관리", route: "/(tabs)/mypage/admin-block-management" },
  { icon: "people-outline", label: "회원 목록", route: "/(tabs)/mypage/admin-members" },
  { icon: "mail-outline", label: "문의 목록", route: "/(tabs)/mypage/admin-inquiries" },
  { icon: "information-circle-outline", label: "이용안내 수정", route: "/(tabs)/mypage/admin-guide" },
  { icon: "shield-checkmark-outline", label: "개인정보처리방침 수정", route: "/(tabs)/mypage/admin-privacy-policy" },
  { icon: "locate-outline", label: "시범 설정", route: "/(tabs)/mypage/demo-settings" },
];

export default function AdminMenuScreen() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id != null && user.id > 0) {
      authService.setStoredUserId(user.id);
    }
  }, [user?.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        백엔드 /api/admin/* API와 연동된 관리 기능입니다.
      </Text>
      <View style={styles.card}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={styles.row}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons name={item.icon} size={20} color="#6B7280" />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "500" },
});
