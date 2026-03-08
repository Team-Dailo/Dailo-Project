// 관리자 - 차단관리 (5회 이상 차단당한 회원 목록 + 정지 적용)
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

const SUSPEND_OPTIONS: { type: adminService.SuspendType; label: string }[] = [
  { type: "2W", label: "2주 정지" },
  { type: "1M", label: "1달 정지" },
  { type: "1Y", label: "1년 정지" },
  { type: "PERMANENT", label: "영구 정지" },
  { type: "NONE", label: "정지 해제" },
];

function formatSuspended(suspendedUntil: string | null): string {
  if (!suspendedUntil) return "미정지";
  const d = new Date(suspendedUntil);
  if (isNaN(d.getTime())) return "미정지";
  const y = d.getFullYear();
  if (y >= 9999) return "영구 정지";
  return `~ ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminBlockManagementScreen() {
  const [list, setList] = useState<adminService.HeavyBlockedMemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const filteredList = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) =>
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.nickname ?? "").toLowerCase().includes(q) ||
        String(m.memberId).includes(q)
    );
  }, [list, appliedSearch]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminService.getHeavyBlockedList();
      setList(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "차단관리 목록 조회 실패";
      const is403 = typeof msg === "string" && (msg.includes("403") || msg.includes("관리자 권한"));
      setError(
        is403 ? "관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해 주세요." : msg
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  const applySuspend = useCallback(
    async (memberId: number, type: adminService.SuspendType) => {
      const opt = SUSPEND_OPTIONS.find((o) => o.type === type);
      Alert.alert(
        "정지 적용",
        `이 회원을 "${opt?.label ?? type}"(으)로 적용하시겠습니까?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "적용",
            onPress: async () => {
              setActingId(memberId);
              try {
                await adminService.suspendMember(memberId, type);
                await load(true);
              } catch (e) {
                Alert.alert("오류", e instanceof Error ? e.message : "정지 적용에 실패했습니다.");
              } finally {
                setActingId(null);
              }
            },
          },
        ]
      );
    },
    [load]
  );

  if (loading && list.length === 0) {
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : list.length === 0 ? (
        <Text style={styles.empty}>5회 이상 차단당한 회원이 없습니다.</Text>
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
          <Text style={styles.summary}>5회 이상 차단당한 회원 {list.length}명</Text>
          {filteredList.map((m) => (
            <View key={m.memberId} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.id}>#{m.memberId}</Text>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>차단 {m.blockCount}회</Text>
                  </View>
                  <View style={[styles.badge, m.suspendedUntil ? styles.badgeSuspended : null]}>
                    <Text style={styles.badgeText}>{formatSuspended(m.suspendedUntil)}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.email}>{m.email}</Text>
              {m.nickname ? <Text style={styles.nickname}>{m.nickname}</Text> : null}
              <View style={styles.actions}>
                {SUSPEND_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.type}
                    style={[
                      styles.actionBtn,
                      opt.type === "NONE" && styles.actionBtnRelease,
                      actingId === m.memberId && styles.actionBtnDisabled,
                    ]}
                    onPress={() => applySuspend(m.memberId, opt.type)}
                    disabled={actingId === m.memberId}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        opt.type === "NONE" && styles.actionBtnTextRelease,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          {filteredList.length === 0 && appliedSearch.trim() ? (
            <Text style={styles.searchEmpty}>조건에 맞는 회원이 없어요</Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  summary: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  error: { fontSize: 14, color: "#DC2626", marginBottom: 8 },
  empty: { fontSize: 15, color: "#6B7280", textAlign: "center", marginTop: 24 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  id: { fontSize: 13, color: "#6B7280", marginRight: 8 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuspended: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  email: { fontSize: 15, color: "#111827", fontWeight: "500", marginBottom: 2 },
  nickname: { fontSize: 14, color: "#6B7280", marginBottom: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  actionBtn: {
    backgroundColor: "#4C8BF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnRelease: { backgroundColor: "#10B981" },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  actionBtnTextRelease: { color: "#FFFFFF" },
});
