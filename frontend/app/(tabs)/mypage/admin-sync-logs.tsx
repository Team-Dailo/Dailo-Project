import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminSyncLogsScreen() {
  const [content, setContent] = useState<adminService.SyncLogResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [startSourceType, setStartSourceType] = useState("KNUT");
  const [starting, setStarting] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminSyncLogs({ page: 0, size: 20, sort: "startedAt,desc" });
      setContent(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "동기화 로그 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStartSync = async () => {
    const sourceType = startSourceType.trim();
    if (!sourceType) {
      Alert.alert("입력", "소스 타입을 입력하세요.");
      return;
    }
    setStarting(true);
    try {
      const created = await adminService.startSync({ sourceType });
      setStartModalVisible(false);
      setStartSourceType("KNUT");
      await load(true);
      if (created?.id) {
        router.push({
          pathname: "/(tabs)/mypage/admin-sync-log-detail",
          params: { logId: String(created.id) },
        });
      }
    } catch (e) {
      Alert.alert("동기화 시작 실패", e instanceof Error ? e.message : "다시 시도해 주세요.");
    } finally {
      setStarting(false);
    }
  };

  if (loading && content.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>동기화 로그</Text>
          <Pressable
            style={styles.startButton}
            onPress={() => setStartModalVisible(true)}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={styles.startButtonText}>동기화 시작</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {content.length === 0 ? (
          <Text style={styles.empty}>동기화 로그가 없습니다.</Text>
        ) : (
          content.map((log) => (
            <Pressable
              key={log.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/admin-sync-log-detail",
                  params: { logId: String(log.id) },
                })
              }
            >
              <View style={styles.cardBody}>
                <Text style={styles.source}>
                  {log.sourceType} · {log.status}
                </Text>
                <Text style={styles.meta}>
                  총 {log.totalCount ?? 0} / 성공 {log.successCount ?? 0} / 실패 {log.failCount ?? 0}
                </Text>
                <Text style={styles.meta}>시작: {log.startedAt}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={startModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => !starting && setStartModalVisible(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalCenter}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>동기화 시작</Text>
              <Text style={styles.modalLabel}>소스 타입</Text>
              <TextInput
                style={styles.modalInput}
                value={startSourceType}
                onChangeText={setStartSourceType}
                placeholder="예: KNUT"
                placeholderTextColor="#9CA3AF"
                editable={!starting}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => !starting && setStartModalVisible(false)}
                  disabled={starting}
                >
                  <Text style={styles.modalBtnCancelText}>취소</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnConfirm]}
                  onPress={handleStartSync}
                  disabled={starting}
                >
                  <Text style={styles.modalBtnConfirmText}>{starting ? "시작 중…" : "시작"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  screenTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4C8BF5",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  startButtonText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
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
  source: { fontSize: 15, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCenter: { width: "100%", maxWidth: 340 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  modalLabel: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  modalBtnCancel: { backgroundColor: "#F3F4F6" },
  modalBtnCancelText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  modalBtnConfirm: { backgroundColor: "#4C8BF5" },
  modalBtnConfirmText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
