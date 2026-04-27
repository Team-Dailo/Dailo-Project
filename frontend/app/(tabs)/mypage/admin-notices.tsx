// 관리자 - 공지사항 관리 (목록 + 작성/수정/삭제)
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";

function formatNoticeDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNoticesScreen() {
  const [list, setList] = useState<adminService.NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const filteredList = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.content ?? "").toLowerCase().includes(q)
    );
  }, [list, appliedSearch]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getNotices({ page: 0, size: 100 });
      setList(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 조회 실패");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const handleDelete = (item: adminService.NoticeItem) => {
    Alert.alert("공지 삭제", `"${item.title}"을(를) 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await adminService.deleteNotice(item.id);
            load(true);
          } catch (e) {
            Alert.alert("오류", e instanceof Error ? e.message : "삭제 실패");
          }
        },
      },
    ]);
  };

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      <Pressable
        style={styles.writeBtn}
        onPress={() => router.push("/(tabs)/mypage/admin-notice-write")}
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={styles.writeBtnText}>공지 작성</Text>
      </Pressable>

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error && !error.includes("<html") && !error.includes("<!DOCTYPE") ? error : null}</Text>
        </View>
      ) : null}

      {list.length > 0 ? (
        <View style={styles.searchBarWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="제목 또는 내용 검색"
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
      ) : null}

      {list.length === 0 && !error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>등록된 공지가 없습니다.</Text>
        </View>
      ) : (
        filteredList.length === 0 && appliedSearch.trim() ? (
          <Text style={styles.searchEmpty}>조건에 맞는 공지가 없어요</Text>
        ) : (
        filteredList.map((item) => (
          <View key={item.id} style={styles.card}>
            <Pressable
              style={styles.cardMain}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/admin-notice-write",
                  params: { id: String(item.id), title: item.title, content: item.content },
                })
              }
            >
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardDate}>{formatNoticeDate(item.createdAt)}</Text>
            </Pressable>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </Pressable>
          </View>
        ))
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4C8BF5",
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  writeBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorWrap: { paddingVertical: 12 },
  errorText: { color: "#DC2626", fontSize: 14 },
  empty: { paddingVertical: 32, alignItems: "center" },
  emptyText: { color: "#6B7280", fontSize: 15 },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", paddingVertical: 8, paddingRight: 8 },
  searchClear: { padding: 4 },
  searchButton: { padding: 4, marginLeft: 4 },
  searchEmpty: { paddingVertical: 24, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardMain: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  cardDate: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  deleteBtn: { padding: 8 },
});
