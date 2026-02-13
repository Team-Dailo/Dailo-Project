// 관리자 - 행사 관리 (GET/POST/PUT/DELETE /api/admin/events)
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminEventsScreen() {
  const [page, setPage] = useState({ content: [] as adminService.AdminEventResponse[], totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminEventList({
        page: refresh ? 0 : page.number,
        size: 20,
        sort: "id,desc",
      });
      setPage({
        content: res.content ?? [],
        totalPages: res.totalPages ?? 0,
        number: res.number ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 행사 추가/수정 후 돌아올 때마다 목록 새로고침
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  const handleDelete = (id: number, title: string) => {
    Alert.alert("행사 삭제", `"${title}"을(를) 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deleteAdminEvent(id);
            load(true);
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제 실패");
          }
        },
      },
    ]);
  };

  if (loading && page.content.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
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
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
      {page.content.length === 0 ? (
        <Text style={styles.empty}>등록된 행사가 없습니다.</Text>
      ) : (
        page.content.map((ev) => (
          <View key={ev.id} style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: "/(tabs)/mypage/admin-event-detail", params: { eventId: String(ev.id) } })}
            >
              <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={1}>{ev.title}</Text>
                <Text style={styles.meta}>
                  {ev.placeName ?? "-"} · {ev.status ?? "-"}
                </Text>
                <Text style={styles.meta}>
                  {ev.startAt} ~ {ev.endAt}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: "/(tabs)/mypage/admin-event-edit-detail", params: { eventId: String(ev.id) } })}
              >
                <Text style={styles.actionText}>수정</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(ev.id, ev.title)}
              >
                <Text style={[styles.actionText, styles.deleteText]}>삭제</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <Pressable
        style={styles.addBtn}
        onPress={() => router.push("/(tabs)/mypage/admin-event-edit-detail")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
        <Text style={styles.addBtnText}>행사 추가</Text>
      </Pressable>
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
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", padding: 12 },
  cardBody: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  actionBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  actionText: { fontSize: 14, color: "#2563EB", fontWeight: "500" },
  deleteBtn: {},
  deleteText: { color: "#DC2626" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  addBtnText: { fontSize: 16, color: "#FFF", fontWeight: "600" },
});
