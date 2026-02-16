// app/board/notice/[id].tsx - 공지사항 상세
import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const MOCK_NOTICES: { id: string; title: string; content: string; date: string }[] = [
  {
    id: "1",
    title: "이번 주 서버 점검 안내드립니다",
    content:
      "[공지사항] 이번 주 서버 점검 안내드립니다. 2월 15일(토) 새벽 02:00 ~ 06:00 동안 서버 점검이 진행됩니다. 해당 시간에는 서비스 이용이 일시 중단될 수 있사오니 양해 부탁드립니다.",
    date: "2025.02.10",
  },
  {
    id: "2",
    title: "개인정보 처리방침 개정 안내",
    content:
      "개인정보 처리방침이 일부 개정되었습니다. 변경된 내용을 확인해 주시기 바랍니다. 시행일은 2025년 3월 1일입니다.",
    date: "2025.02.08",
  },
  {
    id: "3",
    title: "축제 이용 약관 업데이트",
    content: "축제 이용 약관이 업데이트되었습니다. 자세한 내용은 앱 내 고객센터를 참고해 주세요.",
    date: "2025.02.05",
  },
];

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const notice = MOCK_NOTICES.find((n) => n.id === id);

  if (!notice) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>공지를 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.detailDate}>{notice.date}</Text>
        <Text style={styles.detailTitle}>{notice.title}</Text>
        <Text style={styles.detailContent}>{notice.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginLeft: 20 },
  headerRight: { width: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40 },
  detailDate: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    lineHeight: 26,
  },
  detailContent: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
