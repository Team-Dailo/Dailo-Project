// 관리자 - 동기화 로그 상세 (GET /api/admin/sync-logs/{logId})
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as adminService from "../../../services/admin.service";

function loadDetail(logId: string) {
  const id = logId ? Number(logId) : NaN;
  if (!Number.isInteger(id) || id < 1) return Promise.reject(new Error("잘못된 로그 ID입니다."));
  return adminService.getAdminSyncLogDetail(id);
}

export default function AdminSyncLogDetailScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();
  const [item, setItem] = useState<adminService.SyncLogResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeSuccess, setCompleteSuccess] = useState(true);
  const [completeTotal, setCompleteTotal] = useState("");
  const [completeSuccessCount, setCompleteSuccessCount] = useState("");
  const [completeFailCount, setCompleteFailCount] = useState("");
  const [completeErrorMessage, setCompleteErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!logId) return;
    try {
      const res = await loadDetail(logId);
      setItem(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [logId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const handleComplete = async () => {
    if (!logId || !item) return;
    const total = completeTotal.trim() ? parseInt(completeTotal, 10) : 0;
    const successCount = completeSuccessCount.trim() ? parseInt(completeSuccessCount, 10) : 0;
    const failCount = completeFailCount.trim() ? parseInt(completeFailCount, 10) : 0;
    if (Number.isNaN(total) || Number.isNaN(successCount) || Number.isNaN(failCount)) {
      Alert.alert("입력 오류", "숫자를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await adminService.completeSync(Number(logId), {
        success: completeSuccess,
        totalCount: total,
        successCount,
        failCount,
        errorMessage: completeErrorMessage.trim() || undefined,
      });
      setCompleteModalVisible(false);
      setCompleteSuccess(true);
      setCompleteTotal("");
      setCompleteSuccessCount("");
      setCompleteFailCount("");
      setCompleteErrorMessage("");
      await refresh();
    } catch (e) {
      Alert.alert("완료 처리 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

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

  const canComplete = String(item.status).toUpperCase() === "STARTED";

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>동기화 로그 #{item.id}</Text>
        <Row label="소스 타입" value={item.sourceType} />
        <Row label="상태" value={String(item.status)} />
        <Row label="총 개수" value={String(item.totalCount ?? "-")} />
        <Row label="성공" value={String(item.successCount ?? "-")} />
        <Row label="실패" value={String(item.failCount ?? "-")} />
        <Row label="시작 시각" value={String(item.startedAt)} />
        <Row label="완료 시각" value={item.completedAt ? String(item.completedAt) : "-"} />
        <Row label="에러 메시지" value={item.errorMessage ?? "-"} />
        {canComplete && (
          <Pressable
            style={styles.completeButton}
            onPress={() => setCompleteModalVisible(true)}
          >
            <Text style={styles.completeButtonText}>완료 처리</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={completeModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !submitting && setCompleteModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalCenter}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>동기화 완료 처리</Text>
              <View style={styles.modalRow}>
                <Pressable
                  style={[styles.toggleBtn, completeSuccess && styles.toggleBtnActive]}
                  onPress={() => setCompleteSuccess(true)}
                >
                  <Text style={[styles.toggleText, completeSuccess && styles.toggleTextActive]}>성공</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, !completeSuccess && styles.toggleBtnActive]}
                  onPress={() => setCompleteSuccess(false)}
                >
                  <Text style={[styles.toggleText, !completeSuccess && styles.toggleTextActive]}>실패</Text>
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>총 개수</Text>
              <TextInput
                style={styles.modalInput}
                value={completeTotal}
                onChangeText={setCompleteTotal}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                editable={!submitting}
              />
              <Text style={styles.modalLabel}>성공 개수</Text>
              <TextInput
                style={styles.modalInput}
                value={completeSuccessCount}
                onChangeText={setCompleteSuccessCount}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                editable={!submitting}
              />
              <Text style={styles.modalLabel}>실패 개수</Text>
              <TextInput
                style={styles.modalInput}
                value={completeFailCount}
                onChangeText={setCompleteFailCount}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                editable={!submitting}
              />
              <Text style={styles.modalLabel}>에러 메시지 (선택)</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                value={completeErrorMessage}
                onChangeText={setCompleteErrorMessage}
                placeholder="에러 시 메시지"
                placeholderTextColor="#9CA3AF"
                multiline
                editable={!submitting}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => !submitting && setCompleteModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.modalBtnCancelText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleComplete}
                  disabled={submitting}
                >
                  <Text style={styles.modalBtnConfirmText}>{submitting ? "처리 중…" : "완료"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
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
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#DC2626" },
  title: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 16 },
  row: { marginBottom: 12 },
  label: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  value: { fontSize: 15, color: "#111827" },
  completeButton: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCenter: { width: "100%", maxWidth: 360 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#F3F4F6", alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#2563EB" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  toggleTextActive: { color: "#FFFFFF" },
  modalLabel: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: "#F3F4F6" },
  modalBtnCancelText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalBtnConfirm: { backgroundColor: "#2563EB" },
  modalBtnConfirmText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
