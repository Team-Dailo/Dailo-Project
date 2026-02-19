// 관리자 - 행사별 조회수 (GET /api/admin/events/view-counts)
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminEventViewsScreen() {
  const router = useRouter();
  const [list, setList] = useState<adminService.AdminEventViewCountDto[]>([]);
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
        String(item.eventId).includes(q)
    );
  }, [list, appliedSearch]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminEventViewCounts();
      setList(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "조회 실패";
      const is403 = msg.includes("403") || msg.includes("관리자");
      setError(is403 ? "관리자 권한이 필요합니다." : msg);
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

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  const totalViews = list.reduce((sum, item) => sum + (item.totalViewCount ?? 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      {/* 상단 소개글: 좋아요 페이지와 동일한 형태 */}
      <View style={styles.introBox}>
        <Ionicons name="eye-outline" size={20} color="#4C8BF5" />
        <Text style={styles.introText}>
          행사별 조회수 (총 {list.length}건{list.length > 0 ? `, 누적 ${totalViews}회` : ""})
        </Text>
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : list.length === 0 ? (
        <Text style={styles.empty}>조회수가 기록된 행사가 없습니다.</Text>
      ) : (
        <>
          <View style={styles.searchBarWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="행사명 또는 행사 ID 검색"
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
          {filteredList.map((item) => (
            <Pressable
              key={item.eventId}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/admin-event-detail",
                  params: { eventId: String(item.eventId) },
                })
              }
            >
              <View style={styles.cardRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>👁 {item.totalViewCount}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                7일: {item.viewCount7d}회 · 30일: {item.viewCount30d}회
              </Text>
              <Text style={styles.eventId}>행사 ID: {item.eventId}</Text>
            </Pressable>
          ))}
          {filteredList.length === 0 && appliedSearch.trim() ? (
            <Text style={styles.searchEmpty}>조건에 맞는 행사가 없어요</Text>
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
  introBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  introText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  meta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
  },
  eventId: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});

