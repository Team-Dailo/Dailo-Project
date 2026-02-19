// 관리자 - 회원 목록 (GET /api/admin/members)
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as adminService from "../../../services/admin.service";

function formatCreatedAt(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day} ${h}:${min}`;
  } catch {
    return "-";
  }
}

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
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const filteredContent = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return page.content;
    return page.content.filter(
      (m) =>
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.nickname ?? "").toLowerCase().includes(q) ||
        String(m.id).includes(q)
    );
  }, [page.content, appliedSearch]);

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

  const handleWithdraw = useCallback(
    (memberId: number, email: string) => {
      Alert.alert(
        "탈퇴 처리",
        `회원 "${email}"을(를) 탈퇴 처리하시겠습니까? 목록에서는 삭제되지 않고 '탈퇴자'로 표시됩니다.`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "탈퇴 처리",
            style: "destructive",
            onPress: async () => {
              setWithdrawingId(memberId);
              try {
                await adminService.withdrawMember(memberId);
                await load(true);
              } catch (e) {
                Alert.alert("오류", e instanceof Error ? e.message : "탈퇴 처리에 실패했습니다.");
              } finally {
                setWithdrawingId(null);
              }
            },
          },
        ]
      );
    },
    [load]
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
          <View style={styles.searchBarWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="이메일, 닉네임, 회원 ID 검색"
              placeholderTextColor="#9CA3AF"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              returnKeyType="search"
              onSubmitEditing={() => setAppliedSearch(searchKeyword.trim())}
            />
            {searchKeyword.length > 0 ? (
              <Pressable onPress={() => setSearchKeyword("")} style={styles.searchClear} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setAppliedSearch(searchKeyword.trim())}
              style={styles.searchButton}
              hitSlop={8}
            >
              <Ionicons name="search" size={22} color="#4C8BF5" />
            </Pressable>
          </View>
          <Text style={styles.summary}>
            총 {page.totalElements}명 (페이지 {page.number + 1}/{page.totalPages || 1})
          </Text>
          {filteredContent.map((m) => (
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
                    <View style={[styles.badge, m.status === "DELETED" && styles.badgeWithdrawn]}>
                      <Text style={styles.badgeText}>
                        {m.status === "DELETED" ? "탈퇴자" : m.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text style={styles.email}>{m.email}</Text>
              <Text style={styles.nickname}>
                닉네임: {m.nickname ?? "-"}
              </Text>
              <Text style={styles.createdAt}>
                가입: {formatCreatedAt(m.createdAt)}
              </Text>
              {m.status !== "DELETED" ? (
                <Pressable
                  style={[styles.withdrawBtn, withdrawingId === m.id && styles.withdrawBtnDisabled]}
                  onPress={() => handleWithdraw(m.id, m.email)}
                  disabled={withdrawingId !== null}
                >
                  <Text style={styles.withdrawBtnText}>
                    {withdrawingId === m.id ? "처리 중..." : "탈퇴하기"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {filteredContent.length === 0 && appliedSearch.trim() ? (
            <Text style={styles.searchEmpty}>조건에 맞는 회원이 없어요</Text>
          ) : null}
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
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 8, paddingRight: 8 },
  searchClear: { padding: 4 },
  searchButton: { padding: 4, marginLeft: 4 },
  searchEmpty: { paddingVertical: 24, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
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
  badgeWithdrawn: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  createdAt: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 8,
  },
  withdrawBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  withdrawBtnDisabled: { opacity: 0.6 },
  withdrawBtnText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
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
