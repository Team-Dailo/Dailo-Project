// 관리자 - 수집 로그 상세 (GET /api/admin/ingest-logs/{id})
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminIngestLogDetailScreen() {
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<adminService.IngestLogResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = paramId ? Number(paramId) : NaN;
    if (!Number.isInteger(id) || id < 1) {
      setError("잘못된 로그 ID입니다.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await adminService.getAdminIngestLogDetail(id);
        setItem(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [paramId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }
  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ?? "데이터 없음"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>수집 로그 #{item.id}</Text>
      <Row label="배치 ID" value={item.batchId ?? "-"} />
      <Row label="소스" value={item.source ?? "-"} />
      <Row label="총 개수" value={String(item.totalCount ?? "-")} />
      <Row label="성공" value={String(item.successCount ?? "-")} />
      <Row label="실패" value={String(item.failCount ?? "-")} />
      <Row label="생성 시각" value={item.createdAt} />
      <Row label="에러 요약" value={item.errorSummary ?? "-"} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#DC2626" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  value: { fontSize: 15, color: "#111827" },
});
