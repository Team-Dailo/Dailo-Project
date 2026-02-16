// 관리자 - 회원 목록 (GET /api/admin/members)
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as adminService from "../../../services/admin.service";

export default function AdminMembersScreen() {
  const [page, setPage] = useState({
    content: [] as adminService.AdminMemberListItemDto[],
    totalElements: 0,
    totalPages: 0,
    number: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminMemberList({
        page: refresh ? 0 : page.number,
        size: 50,
      });
      setPage({
        content: res.content ?? [],
        totalElements: res.totalElements ?? 0,
        totalPages: res.totalPages ?? 0,
        number: res.number ?? 0,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "회원 목록 조회 실패";
      const is403 = typeof msg === "string" && (msg.includes("403") || msg.includes("관리자 권한"));
      setError(is403
        ? "관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해 주세요."
        : msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page.number]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

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
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : page.content.length === 0 ? (
        <Text style={styles.empty}>등록된 회원이 없습니다.</Text>
      ) : (
        <>
          <Text style={styles.summary}>
            총 {page.totalElements}명 (페이지 {page.number + 1}/{page.totalPages || 1})
          </Text>
          {page.content.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.id}>#{m.id}</Text>
                <View style={styles.badges}>
                  {m.role ? (
                    <View style={[styles.badge, m.role === "ADMIN" && styles.badgeAdmin]}>
                      <Text style={styles.badgeText}>{m.role}</Text>
                    </View>
                  ) : null}
                  {m.status ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{m.status}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.email}>{m.email}</Text>
              <Text style={styles.nickname}>
                닉네임: {m.nickname ?? "-"}
              </Text>
            </View>
          ))}
        </>
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
  summary: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  id: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  badges: { flexDirection: "row", gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  badgeAdmin: { backgroundColor: "#DBEAFE" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  email: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  nickname: {
    fontSize: 13,
    color: "#6B7280",
  },
});
