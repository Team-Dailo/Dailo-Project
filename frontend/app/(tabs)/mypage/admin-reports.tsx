// 관리자 - 신고 처리 (GET /api/admin/reports)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminReportsScreen() {
  const [page, setPage] = useState({ content: [] as adminService.ReportResponseDto[], totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminReports({ page: 0, size: 20, sort: "createdAt,desc" });
      setPage({
        content: res.content ?? [],
        totalElements: res.totalElements ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "신고 목록 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && page.content.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {page.content.length === 0 ? (
        <Text style={styles.empty}>처리할 신고가 없습니다.</Text>
      ) : (
        page.content.map((r) => (
          <Pressable
            key={r.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/mypage/admin-report-detail",
                params: { reportId: String(r.id) },
              })
            }
          >
            <View style={styles.cardBody}>
              <Text style={styles.target}>
                #{r.targetType} {r.targetId}
              </Text>
              <Text style={styles.meta}>
                사유: {r.reason} · 상태: {r.status}
              </Text>
              <Text style={styles.meta}>신고일: {r.createdAt}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#DC2626", marginBottom: 12, fontSize: 14 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardBody: { flex: 1 },
  target: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
});
