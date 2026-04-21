// app/(tabs)/mypage/festival-admin.tsx - 축제 관리자 전용 메뉴
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import * as authService from "../../../services/auth.service";

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }[] = [
  { icon: "calendar-outline", label: "내 축제 관리", route: "/(tabs)/mypage/festival-admin-events" },
  { icon: "analytics-outline", label: "사용자 활동 현황", route: "/(tabs)/mypage/festival-admin-activity" },
];

export default function FestivalAdminMenuScreen() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id != null && user.id > 0) {
      authService.setStoredUserId(user.id);
    }
  }, [user?.id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        내가 관리하는 축제의 정보를 수정하고 사용자 활동을 확인할 수 있습니다.
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
