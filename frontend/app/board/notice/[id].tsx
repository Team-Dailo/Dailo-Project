// app/board/notice/[id].tsx - 공지사항 상세 (GET /api/notices/:id 연동)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as noticeService from "../../../services/notice.service";

function formatNoticeDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NoticeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [notice, setNotice] = useState<noticeService.NoticeItem | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const idNum = id != null ? Number(id) : NaN;

  useEffect(() => {
    if (!Number.isFinite(idNum)) {
      setNotice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    noticeService
      .getNoticeById(idNum)
      .then(setNotice)
      .catch(() => setNotice(null))
      .finally(() => setLoading(false));
  }, [idNum]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>공지사항</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4C8BF5" />
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.detailDate}>{formatNoticeDate(notice.createdAt)}</Text>
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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
