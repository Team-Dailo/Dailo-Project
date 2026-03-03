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
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as adminService from "../../../services/admin.service";
import { formatDateTimeAdmin } from "../../../utils/formatDate";

/** 종료된 행사 여부 (종료일이 오늘 이전이면 true, 로컬 시간 기준) */
function isEndedByDate(endAt?: string | null): boolean {
  if (!endAt) return false;
  try {
    const end = new Date(endAt);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return end.getTime() < today.getTime();
  } catch {
    return false;
  }
}

function getStatusStyle(
  status?: string,
  endAt?: string | null
): { label: string; bg: string; text: string } {
  // 백엔드 status 가 ACTIVE 라도, 종료일이 지나면 화면에서는 "종료"로 보여주기
  if (status === "ACTIVE" && isEndedByDate(endAt)) {
    return { label: "종료", bg: "#E5E7EB", text: "#374151" };
  }

  switch (status) {
    case "ACTIVE":
      return { label: "진행중", bg: "#DCFCE7", text: "#166534" };
    case "ENDED":
      return { label: "종료", bg: "#E5E7EB", text: "#374151" };
    case "INACTIVE":
      return { label: "숨김", bg: "#FEE2E2", text: "#B91C1C" };
    case "DRAFT":
      return { label: "초안", bg: "#DBEAFE", text: "#1D4ED8" };
    default:
      return { label: status ?? "-", bg: "#E5E7EB", text: "#4B5563" };
  }
}

export default function AdminEventsScreen() {
  const [page, setPage] = useState({ content: [] as adminService.AdminEventResponse[], totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async (refresh = false, searchKeyword?: string) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const q = searchKeyword !== undefined ? searchKeyword : searchQuery;
    try {
      const res = await adminService.getAdminEventList({
        page: refresh ? 0 : page.number,
        size: 20,
        sort: "id,desc",
        keyword: q.trim() || undefined,
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
  }, [page.number, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(keyword.trim());
    load(true, keyword.trim());
  };

  const handleClearSearch = () => {
    setKeyword("");
    setSearchQuery("");
    load(true, "");
  };

  useFocusEffect(
    useCallback(() => {
      load(true, searchQuery);
    }, [load, searchQuery])
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
            load(true, searchQuery);
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
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true, searchQuery)} />
      }
    >
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="행사명, 장소, 설명으로 검색"
          placeholderTextColor="#9CA3AF"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {keyword.length > 0 ? (
          <Pressable onPress={handleClearSearch} style={styles.searchClear} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
        <Pressable onPress={handleSearch} style={styles.searchIconBtn} hitSlop={8}>
          <Ionicons name="search" size={22} color="#111827" />
        </Pressable>
      </View>
      <Pressable
        style={styles.addBtn}
        onPress={() => router.push("/(tabs)/mypage/admin-event-edit-detail")}
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFF" />
        <Text style={styles.addBtnText}>행사 추가</Text>
      </Pressable>
      {searchQuery ? (
        <View style={styles.searchTagRow}>
          <Text style={styles.searchTag}>"{searchQuery}"</Text>
          <Pressable onPress={handleClearSearch} hitSlop={8}>
            <Text style={styles.clearSearchText}>검색 초기화</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
      {page.content.length === 0 ? (
        <Text style={styles.empty}>등록된 행사가 없습니다.</Text>
      ) : (
        // 최신순(시작일 내림차순)으로 정렬해서 표시
        [...page.content]
          .sort((a, b) => {
            const aTime = new Date(a.startAt).getTime();
            const bTime = new Date(b.startAt).getTime();
            if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0;
            if (!Number.isFinite(aTime)) return 1;
            if (!Number.isFinite(bTime)) return -1;
            return bTime - aTime;
          })
          .map((ev) => (
          <View key={ev.id} style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/admin-event-edit-detail",
                  params: { eventId: String(ev.id) },
                })
              }
            >
              <View style={styles.cardBody}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusStyle(ev.status, ev.endAt).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusStyle(ev.status, ev.endAt).text },
                    ]}
                  >
                    {getStatusStyle(ev.status, ev.endAt).label}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {ev.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />{" "}
                  {ev.placeName ?? ev.placeAddress ?? "-"}
                  {ev.regionName ? ` · ${ev.regionName}` : ""}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {formatDateTimeAdmin(ev.startAt)} ~ {formatDateTimeAdmin(ev.endAt)}
                </Text>
              </View>
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
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 8,
  },
  searchClear: { padding: 4 },
  searchIconBtn: { padding: 4, marginLeft: 4 },
  searchTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchTag: { fontSize: 13, color: "#6B7280" },
  clearSearchText: { fontSize: 13, color: "#4C8BF5", fontWeight: "500" },
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
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  actions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  actionBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  actionText: { fontSize: 14, color: "#4C8BF5", fontWeight: "500" },
  deleteBtn: {},
  deleteText: { color: "#DC2626" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#4C8BF5",
  },
  addBtnText: { fontSize: 16, color: "#FFF", fontWeight: "600" },
});
