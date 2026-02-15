// 관리자 - 신고 상세 및 처리 (GET /api/admin/reports/{id}, POST .../action)
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [item, setItem] = useState<adminService.AdminReportDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const id = reportId ? Number(reportId) : NaN;
    if (!Number.isInteger(id) || id < 1) {
      setError("잘못된 신고 ID입니다.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminReportDetail(id);
      setItem(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reportId]);

  const handleProcess = (actionType: string) => {
    if (!reportId || !item) return;
    const id = Number(reportId);
    setSubmitting(true);
    adminService
      .processReport(id, { actionType, reason: actionReason || undefined })
      .then(() => {
        Alert.alert("처리 완료", "신고 처리가 반영되었습니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      })
      .catch((e) => {
        Alert.alert("오류", e instanceof Error ? e.message : "처리 실패");
      })
      .finally(() => setSubmitting(false));
  };

  if (loading && !item) {
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
      <Text style={styles.title}>신고 #{item.id}</Text>
      <Row label="대상 유형" value={item.targetType} />
      <Row label="대상 ID" value={String(item.targetId)} />
      <Row label="사유" value={item.reason} />
      <Row label="상태" value={item.status} />
      <Row label="설명" value={item.description ?? "-"} />
      <Row label="신고일" value={item.createdAt} />
      <Row label="처리일" value={item.resolvedAt ?? "-"} />
      {item.actions?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>처리 이력</Text>
          {item.actions.map((a) => (
            <Text key={a.id} style={styles.actionRow}>{a.actionType} - {a.createdAt}</Text>
          ))}
        </View>
      ) : null}

      {item.status === "PENDING" || item.status === "pending" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>처리 (DISMISS=기각, WARN=경고, HIDE=숨김, BLIND=블라인드, SUSPEND=정지)</Text>
          <TextInput
            style={styles.input}
            placeholder="처리 사유 (선택)"
            value={actionReason}
            onChangeText={setActionReason}
            editable={!submitting}
          />
          <Pressable
            style={[styles.btn, submitting && styles.btnDisabled]}
            onPress={() => handleProcess("DISMISS")}
            disabled={submitting}
          >
            <Text style={styles.btnText}>기각 (DISMISS)</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnWarn, submitting && styles.btnDisabled]}
            onPress={() => handleProcess("WARN")}
            disabled={submitting}
          >
            <Text style={styles.btnText}>경고 (WARN)</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnSecondary, submitting && styles.btnDisabled]}
            onPress={() => handleProcess("HIDE")}
            disabled={submitting}
          >
            <Text style={styles.btnText}>숨김 (HIDE)</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={{ height: 24 }} />
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
  section: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  actionRow: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: "#FFF",
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    marginBottom: 8,
  },
  btnWarn: { backgroundColor: "#D97706" },
  btnSecondary: { backgroundColor: "#6B7280" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFF", fontWeight: "600" },
});
