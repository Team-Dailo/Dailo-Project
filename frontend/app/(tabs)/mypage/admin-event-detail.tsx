// 관리자 - 행사 상세 (GET /api/admin/events/{eventId})
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as adminService from "../../../services/admin.service";
import { formatDateTimeAdmin } from "../../../utils/formatDate";

export default function AdminEventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [item, setItem] = useState<adminService.AdminEventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = eventId ? Number(eventId) : NaN;
    if (!Number.isInteger(id) || id < 1) {
      setError("잘못된 행사 ID입니다.");
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await adminService.getAdminEventDetail(id);
        setItem(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "조회 실패");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#4C8BF5" /></View>;
  if (error || !item) return <View style={styles.centered}><Text style={styles.error}>{error ?? "데이터 없음"}</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{item.title}</Text>
      <Row label="장소" value={item.placeName ?? "-"} />
      <Row label="위도/경도" value={`${item.latitude ?? "-"} / ${item.longitude ?? "-"}`} />
      <Row label="시작" value={formatDateTimeAdmin(item.startAt)} />
      <Row label="종료" value={formatDateTimeAdmin(item.endAt)} />
      <Row label="상태" value={item.status ?? "-"} />
      <Row label="카테고리" value={item.categories?.join(", ") ?? "-"} />
      <Row label="썸네일" value={item.thumbnailUrl ? "있음" : "-"} />
      <Row label="설명" value={item.description ?? "-"} />
      <Row label="주최 연락처" value={item.hostContact ?? "-"} />
      <Pressable
        style={styles.editBtn}
        onPress={() => router.push({ pathname: "/(tabs)/mypage/admin-event-edit-detail", params: { eventId: String(item.id) } })}
      >
        <Text style={styles.editBtnText}>수정 (상세형 편집)</Text>
      </Pressable>
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
  editBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4C8BF5",
    alignItems: "center",
  },
  editBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
