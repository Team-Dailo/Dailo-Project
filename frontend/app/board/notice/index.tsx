// app/board/notice/index.tsx - 공지사항 목록 (GET /api/notices 연동)
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
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
  });
}

export default function NoticeListScreen() {
  const router = useRouter();
  const [list, setList] = useState<noticeService.NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await noticeService.getNotices({ page: 0, size: 100 });
      setList(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>공지사항</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && list.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4C8BF5" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
        >
          {error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : list.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
            </View>
          ) : (
            list.map((notice) => (
              <Pressable
                key={notice.id}
                style={styles.noticeRow}
                onPress={() => router.push(`/board/notice/${notice.id}`)}
              >
                <View style={styles.noticeRowTop}>
                  <Text style={styles.noticeTitle} numberOfLines={1}>
                    {notice.title}
                  </Text>
                  <Text style={styles.noticeDate}>{formatNoticeDate(notice.createdAt)}</Text>
                </View>
                <Text style={styles.noticeContent} numberOfLines={2} ellipsizeMode="tail">
                  {notice.content}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
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
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },
  errorWrap: { paddingVertical: 24, alignItems: "center" },
  errorText: { fontSize: 14, color: "#DC2626" },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 15 },
  noticeRow: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  noticeRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  noticeDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  noticeContent: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});
