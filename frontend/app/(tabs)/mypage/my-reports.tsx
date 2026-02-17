// app/(tabs)/mypage/my-reports.tsx – GET /api/reports/my 연동
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as reportService from "../../../services/report.service";
import { formatRelativeTime } from "../../../utils/formatDate";

const REASON_LABEL: Record<string, string> = {
  SPAM: "스팸",
  ABUSE: "욕설/혐오",
  INAPPROPRIATE: "부적절한 내용",
  OTHER: "기타",
};

const TARGET_LABEL: Record<string, string> = {
  POST: "게시물",
  COMMENT: "댓글",
  USER: "사용자",
  CHAT: "채팅",
};

export default function MyReportsScreen() {
  const [reports, setReports] = useState<reportService.ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getMyReports({ page: 0, size: 50 });
      setReports(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchList();
    }, [fetchList])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>내 신고 목록</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>목록을 불러올 수 없습니다.</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchList()}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>신고한 내역이 없습니다.</Text>
            </View>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.targetType}>
                    {TARGET_LABEL[r.targetType] ?? r.targetType} #{r.targetId}
                  </Text>
                  <View style={[styles.statusBadge, r.status === "RESOLVED" && styles.statusResolved]}>
                    <Text style={styles.statusText}>
                      {r.status === "RESOLVED" ? "처리됨" : "접수"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reason}>
                  사유: {REASON_LABEL[r.reason] ?? r.reason}
                  {r.description ? ` - ${r.description}` : ""}
                </Text>
                <Text style={styles.date}>{formatRelativeTime(r.createdAt)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  targetType: { fontSize: 15, fontWeight: "600", color: "#111827" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  statusResolved: { backgroundColor: "#D1FAE5" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  reason: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  date: { fontSize: 12, color: "#9CA3AF" },
});
