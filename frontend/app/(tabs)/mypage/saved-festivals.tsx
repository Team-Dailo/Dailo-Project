import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as scrapService from "../../../services/scrap.service";

/** 2026.02.20 금요일 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}요일`;
  } catch {
    return "";
  }
}

/** 09:00 ~ 18:00 */
function formatTimeRange(startIso: string, endIso?: string): string {
  try {
    const start = new Date(startIso);
    const startStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    if (endIso) {
      const end = new Date(endIso);
      const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      return `${startStr} ~ ${endStr}`;
    }
    return `${startStr} ~`;
  } catch {
    return "";
  }
}

export default function SavedFestivalsScreen() {
  const [list, setList] = useState<scrapService.ScrapEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  /** 검색 아이콘을 눌렀을 때 적용되는 검색어 */
  const [appliedSearch, setAppliedSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const { list: data } = await scrapService.getMyScraps({ page: 0, size: 50 });
      setList(data);
    } catch (e) {
      setList([]);
      setError(e instanceof Error ? e.message : "저장한 축제를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.placeName ?? "").toLowerCase().includes(q)
    );
  }, [list, appliedSearch]);

  const handleRemoveScrap = useCallback(
    (item: scrapService.ScrapEventItem) => {
      Alert.alert(
        "찜 해제",
        `"${item.title}"을(를) 저장 목록에서 제거할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "제거",
            style: "destructive",
            onPress: async () => {
              try {
                await scrapService.toggleScrap(item.id);
                setList((prev) => prev.filter((e) => e.id !== item.id));
              } catch (e) {
                Alert.alert(
                  "오류",
                  e instanceof Error ? e.message : "찜 해제에 실패했습니다."
                );
              }
            },
          },
        ]
      );
    },
    []
  );

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={() => router.replace("/(tabs)/mypage")}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={styles.headerTitleWrap} pointerEvents="box-none">
            <Text style={styles.headerTitle}>저장한 축제</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.replace("/(tabs)/mypage")}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerTitleWrap} pointerEvents="box-none">
          <Text style={styles.headerTitle}>저장한 축제</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4C8BF5" />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>저장한 축제가 없습니다</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            {/* 검색창: 입력 후 오른쪽 검색 아이콘 누르면 검색 */}
            <View style={styles.searchBarWrap}>
              <TextInput
                style={styles.searchInput}
                placeholder="행사명 또는 장소 검색"
                placeholderTextColor="#9CA3AF"
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                returnKeyType="search"
                onSubmitEditing={() => setAppliedSearch(searchKeyword.trim())}
              />
              {searchKeyword.length > 0 ? (
                <Pressable
                  onPress={() => setSearchKeyword("")}
                  style={styles.searchClear}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setAppliedSearch(searchKeyword.trim())}
                style={styles.searchButton}
                hitSlop={8}
              >
                <Ionicons name="search" size={22} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.eventCardList}>
              {filteredList.length === 0 ? (
                <Text style={styles.eventCardEmpty}>
                  {appliedSearch.trim() ? "조건에 맞는 저장 행사가 없어요" : "저장한 축제가 없습니다"}
                </Text>
              ) : (
                filteredList.map((item) => {
                  const dateStr = formatDate(item.startAt);
                  const timeStr = formatTimeRange(item.startAt, item.endAt);
                  return (
                    <View key={item.id} style={styles.eventCard}>
                      <Pressable
                        style={styles.eventCardInner}
                        onPress={() =>
                          router.push(`/event/${String(item.id)}?source=list` as import("expo-router").Href)
                        }
                      >
                        <Image
                          source={{
                            uri: item.thumbnailUrl ?? "https://via.placeholder.com/200x300.png?text=Poster",
                          }}
                          style={styles.eventImage}
                        />
                        <View style={styles.eventInfo}>
                          <View style={styles.eventInfoHeader}>
                            <Text style={styles.eventCategory}>저장</Text>
                            <Pressable
                              onPress={() => handleRemoveScrap(item)}
                              hitSlop={8}
                              style={styles.unscrapWrap}
                            >
                              <Ionicons name="bookmark" size={16} color="#4C8BF5" />
                              <Text style={styles.unscrapText}>찜 해제</Text>
                            </Pressable>
                          </View>
                          <Text style={styles.eventTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <View style={styles.eventMeta}>
                            {dateStr ? (
                              <Text style={styles.eventDate}>{dateStr}</Text>
                            ) : null}
                            {timeStr ? (
                              <Text style={styles.eventTime}>{timeStr}</Text>
                            ) : null}
                          </View>
                          <View style={styles.eventCardFooter}>
                            <View style={styles.eventCardFooterCenter}>
                              <Text style={styles.detailButtonText}>자세히 보기</Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerBack: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 56,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#9CA3AF",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 8,
  },
  searchClear: {
    padding: 4,
  },
  searchButton: {
    padding: 4,
    marginLeft: 4,
  },
  eventCardList: {
    gap: 0,
  },
  eventCardEmpty: {
    paddingVertical: 24,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  eventCard: {
    borderRadius: 0,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    borderBottomColor: "#E5E7EB",
  },
  eventCardInner: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 14,
  },
  eventImage: {
    width: 96,
    minWidth: 96,
    height: 128,
    borderRadius: 0,
    marginRight: 14,
    backgroundColor: "#E5E7EB",
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
    minHeight: 128,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  eventInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unscrapWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unscrapText: {
    fontSize: 12,
    color: "#4C8BF5",
    fontWeight: "500",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 4,
  },
  eventMeta: {
    gap: 2,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    color: "#374151",
  },
  eventTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  eventCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 36,
    borderRadius: 10,
    backgroundColor: "#4C8BF5",
    paddingHorizontal: 12,
  },
  eventCardFooterCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
