import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminIngestLogsScreen() {
  const [content, setContent] = useState<adminService.IngestLogResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminIngestLogs({ page: 0, size: 20, sort: "createdAt,desc" });
      setContent(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "수집 로그 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && content.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4C8BF5" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {content.length === 0 ? <Text style={styles.empty}>수집 로그가 없습니다.</Text> : content.map((log) => (
        <Pressable key={log.id} style={styles.card}
          onPress={() => router.push({ pathname: "/(tabs)/mypage/admin-ingest-log-detail", params: { id: String(log.id) } })}>
          <View style={styles.cardBody}>
            <Text style={styles.source}>{log.source ?? "-"} · {log.batchId ?? "-"}</Text>
            <Text style={styles.meta}>총 {log.totalCount ?? 0} / 성공 {log.successCount ?? 0} / 실패 {log.failCount ?? 0}</Text>
            <Text style={styles.meta}>{log.createdAt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
      ))}
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
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 8 },
  cardBody: { flex: 1 },
  source: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
});
