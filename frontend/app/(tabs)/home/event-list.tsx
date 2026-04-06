// app/(tabs)/home/event-list.tsx - 행사 리스트 (지도 탭과 동일 필터 칩 + 검색)
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEventList } from "../../../hooks/useEvent";
import type { EventListSort } from "../../../services/event.service";
import type { Event } from "../../../types/event";
import { FilterChips } from "../map/_components/FilterChips";
import {
  DateFilterModal,
  CategoryFilterModal,
  PopularFilterModal,
  DistanceFilterModal,
  ScaleFilterModal,
  StatusFilterModal,
  type DateRange,
} from "../map/_components/FilterModals";
import { getDemoLocation } from "../../../services/demoLocationStorage";

/** 2025.11.20 목요일 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}요일`;
  } catch {
    return "";
  }
}

/** 19:00 ~ 21:00 (시작~종료) */
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

function categoryLabel(cat: string | undefined): string {
  const map: Record<string, string> = {
    FESTIVAL: "축제",
    EXHIBITION: "전시",
    PERFORMANCE: "공연",
    EXPERIENCE_BOOTH: "체험부스",
    FOOD_TRUCK: "푸드트럭",
    TRAFFIC: "교통",
    CONSTRUCTION: "공사",
    ETC: "기타",
  };
  return (cat && map[cat]) || "기타";
}

/** 행사가 날짜 범위 [start, end]와 하루라도 겹치는지 */
function eventOverlapsDateRange(event: Event, range: DateRange): boolean {
  const eventStart = event.startAt.slice(0, 10);
  const eventEnd = event.endAt ? event.endAt.slice(0, 10) : eventStart;
  return eventStart <= range.end && eventEnd >= range.start;
}

function todayYyyyMmDdUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function toYyyyMmDd(iso: string): string {
  try {
    return iso.slice(0, 10);
  } catch {
    return "";
  }
}

/** 오늘 기준으로 이미 종료된 행사인지 여부 */
function isEventEnded(event: Event): boolean {
  if (!event.endAt) return false;
  try {
    const endStr = event.endAt.slice(0, 10);
    const todayStr = todayYyyyMmDdUtc();
    return endStr < todayStr;
  } catch {
    return false;
  }
}

/** 오늘(UTC 날짜) 기준 아직 시작 전 */
function isEventUpcoming(event: Event): boolean {
  const start = toYyyyMmDd(event.startAt);
  if (!start) return false;
  return start > todayYyyyMmDdUtc();
}

/** 오늘(UTC 날짜) 기준 진행 중 (시작일 ≤ 오늘 ≤ 종료일, 단일일은 종료일=시작일) */
function isEventOngoing(event: Event): boolean {
  if (isEventUpcoming(event)) return false;
  if (isEventEnded(event)) return false;
  const today = todayYyyyMmDdUtc();
  const start = toYyyyMmDd(event.startAt);
  const end = event.endAt ? toYyyyMmDd(event.endAt) : start;
  if (!start || !end) return false;
  return start <= today && today <= end;
}

type StatusFilter = "all" | "ongoing" | "upcoming" | "ended";

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: "전체",
  ongoing: "진행중",
  upcoming: "예정",
  ended: "종료",
};

function rankForSort(e: Event): number {
  if (isEventEnded(e)) return 2;
  if (isEventOngoing(e)) return 0;
  if (isEventUpcoming(e)) return 1;
  return 3;
}

/** 오늘 기준으로 행사 시작일까지 남은 일 수 (지났으면 0) */
function daysUntilStart(event: Event): number {
  try {
    const start = new Date(event.startAt);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = start.getTime() - today.getTime();
    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    return Math.max(0, days);
  } catch {
    return 0;
  }
}

/** 두 점 거리(km) 대략 계산 (Haversine 아님, 위도·경도 차이 근사) */
function approxKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function EventListScreen() {
  const router = useRouter();
  // 홈 탭 행사 리스트 진입 시 기본 정렬은 "최신순"이 되도록,
  // 인기/조회수 필터가 선택된 경우에만 sort 파라미터를 넘긴다.
  const [popularFilter, setPopularFilter] = useState<string>("all");
  const sort: EventListSort =
    popularFilter === "all" ? null : (popularFilter as EventListSort);
  const { events, loading, error, refetch } = useEventList({ size: 50, sort });
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "status" | "date" | "category" | "popular" | "distance" | "scale" | null
  >(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [distanceFilter, setDistanceFilter] = useState<string>("all");
  const [scaleFilter, setScaleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 필터 요약 텍스트 (칩에 표시)
  const dateSummary = useMemo(() => {
    if (!dateRange) return null;
    try {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const fmt = (d: Date) =>
        `${d.getMonth() + 1}/${d.getDate()}`;
      return start.toDateString() === end.toDateString()
        ? fmt(start)
        : `${fmt(start)}~${fmt(end)}`;
    } catch {
      return null;
    }
  }, [dateRange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const demo = await getDemoLocation();
      if (cancelled) return;
      if (demo) setUserLocation({ lat: demo.latitude, lng: demo.longitude });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /** 날짜·카테고리·규모·검색·정렬(거리)·진행 상태(전체/진행중/예정/종료) 적용 */
  const filteredEvents = useMemo(() => {
    let list = events;
    const hasCustomDateRange = !!dateRange;

    if (dateRange) {
      list = list.filter((e) => eventOverlapsDateRange(e, dateRange));
    }

    if (statusFilter === "ongoing") {
      list = list.filter(isEventOngoing);
    } else if (statusFilter === "upcoming") {
      list = list.filter(isEventUpcoming);
    } else if (statusFilter === "ended") {
      list = list.filter(isEventEnded);
    }
    // statusFilter === "all": 종료 행사 포함
    if (categoryFilter !== "all") {
      list = list.filter((e) => (e.category ?? "ETC") === categoryFilter);
    }
    if (scaleFilter !== "all") {
      list = list.filter((e) => (e.scale ?? "PERSONAL") === scaleFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          (e.title ?? "").toLowerCase().includes(q) ||
          (e.placeName ?? "").toLowerCase().includes(q) ||
          (e.address ?? "").toLowerCase().includes(q)
      );
    }
    if (distanceFilter !== "all" && userLocation) {
      list = [...list].sort(
        (a, b) =>
          approxKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude) -
          approxKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
      );
    } else if (!hasCustomDateRange) {
      if (statusFilter === "ended") {
        list = [...list].sort((a, b) =>
          toYyyyMmDd(b.endAt ?? "").localeCompare(toYyyyMmDd(a.endAt ?? ""))
        );
      } else if (statusFilter === "upcoming") {
        list = [...list].sort((a, b) => daysUntilStart(a) - daysUntilStart(b));
      } else if (statusFilter === "ongoing") {
        list = [...list].sort((a, b) =>
          toYyyyMmDd(a.endAt || a.startAt).localeCompare(toYyyyMmDd(b.endAt || b.startAt))
        );
      } else {
        // 전체: 진행중 → 예정 → 종료, 그룹 내 가까운 순
        list = [...list].sort((a, b) => {
          const ra = rankForSort(a);
          const rb = rankForSort(b);
          if (ra !== rb) return ra - rb;
          if (ra === 0) {
            return toYyyyMmDd(a.endAt || a.startAt).localeCompare(
              toYyyyMmDd(b.endAt || b.startAt)
            );
          }
          if (ra === 1) return daysUntilStart(a) - daysUntilStart(b);
          if (ra === 2) {
            return toYyyyMmDd(b.endAt ?? "").localeCompare(toYyyyMmDd(a.endAt ?? ""));
          }
          return 0;
        });
      }
    }
    return list;
  }, [
    events,
    dateRange,
    categoryFilter,
    scaleFilter,
    searchQuery,
    distanceFilter,
    userLocation,
    statusFilter,
  ]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>목록을 불러올 수 없습니다.</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        {/* 검색창 */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="행사명 또는 장소 검색"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              style={styles.searchClear}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          ) : null}
        </View>

        {/* 지도 탭과 동일한 필터 칩 (날짜·카테고리·인기/추천·거리·규모) — 검색창 바로 아래 */}
        <View style={styles.filterChipsWrap}>
          <FilterChips
            onPressStatus={() => setActiveFilter("status")}
            onPressDate={() => setActiveFilter("date")}
            onPressCategory={() => setActiveFilter("category")}
            onPressPopular={() => setActiveFilter("popular")}
            onPressDistance={() => setActiveFilter("distance")}
            onPressScale={() => setActiveFilter("scale")}
            selectedStatusSummary={
              statusFilter === "all"
                ? undefined
                : STATUS_FILTER_LABEL[statusFilter]
            }
            selectedDateSummary={dateSummary ?? undefined}
            selectedCategorySummary={
              categoryFilter !== "all"
                ? categoryLabel(categoryFilter)
                : undefined
            }
            selectedPopularSummary={
              popularFilter !== "all"
                ? popularFilter === "all"
                  ? undefined
                  : popularFilter === "trending"
                    ? "지금 뜨는 축제"
                    : popularFilter === "views"
                      ? "조회수 많은 순"
                      : "인기순"
                : undefined
            }
            selectedDistanceSummary={
              distanceFilter !== "all" ? distanceFilter : undefined
            }
            selectedScaleSummary={
              scaleFilter !== "all"
                ? (() => {
                    switch (scaleFilter) {
                      case "CITY":
                        return "시·군·구";
                      case "UNIVERSITY":
                        return "대학교";
                      case "DEPARTMENT":
                        return "단과대/학생회";
                      case "CLUB":
                        return "동아리/소모임";
                      case "PERSONAL":
                        return "개인";
                      default:
                        return undefined;
                    }
                  })()
                : undefined
            }
          />
        </View>

        <View style={styles.eventCardList}>
          {loading ? (
            <View style={styles.eventCardLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          ) : filteredEvents.length === 0 ? (
            <Text style={styles.eventCardEmpty}>
              {events.length === 0
                ? "등록된 행사가 없어요"
                : "조건에 맞는 행사가 없어요"}
            </Text>
          ) : (
            filteredEvents.map((event: Event) => {
              const dateStr = formatDate(event.startAt);
              const timeStr = formatTimeRange(event.startAt, event.endAt);
              const ended = isEventEnded(event);
              return (
                <Pressable
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => router.push(`/event/${event.id}?source=list`)}
                >
                  <Image
                    source={{
                      uri: event.thumbnailUrl ?? "https://via.placeholder.com/200x300.png?text=Poster",
                    }}
                    style={styles.eventImage}
                  />
                  <View style={styles.eventInfo}>
                    <View style={styles.eventHeaderRow}>
                      <Text
                        style={styles.eventCategory}
                        numberOfLines={1}
                      >
                        {categoryLabel(event.category)}
                      </Text>
                      {ended ? (
                        <View style={styles.eventEndedBadge}>
                          <Text style={styles.eventEndedBadgeText}>종료</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
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
              );
            })
          )}
        </View>
      </View>

      {/* 필터 모달 (지도 탭과 동일 + 행사 상태) */}
      <StatusFilterModal
        visible={activeFilter === "status"}
        onClose={() => setActiveFilter(null)}
        selectedValue={statusFilter}
        onSelect={(v) => {
          setStatusFilter(v as StatusFilter);
          setActiveFilter(null);
        }}
      />
      <DateFilterModal
        visible={activeFilter === "date"}
        onClose={() => setActiveFilter(null)}
        selectedDateRange={dateRange}
        onSelectDateRange={setDateRange}
      />
      <CategoryFilterModal
        visible={activeFilter === "category"}
        onClose={() => setActiveFilter(null)}
        selectedValue={categoryFilter}
        onSelect={(v) => {
          setCategoryFilter(v);
          setActiveFilter(null);
        }}
      />
      <PopularFilterModal
        visible={activeFilter === "popular"}
        onClose={() => setActiveFilter(null)}
        selectedValue={popularFilter}
        onSelect={(v) => {
          setPopularFilter(v);
          setActiveFilter(null);
        }}
      />
      <DistanceFilterModal
        visible={activeFilter === "distance"}
        onClose={() => setActiveFilter(null)}
        selectedValue={distanceFilter}
        onSelect={(v) => {
          setDistanceFilter(v);
          setActiveFilter(null);
        }}
      />
      <ScaleFilterModal
        visible={activeFilter === "scale"}
        onClose={() => setActiveFilter(null)}
        selectedValue={scaleFilter}
        onSelect={(v) => {
          setScaleFilter(v);
          setActiveFilter(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4C8BF5",
    borderRadius: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  /* 홈 탭과 동일한 섹션/카드 스타일 */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
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
  filterChipsWrap: {
    marginHorizontal: -4,
    marginBottom: 12,
  },
  eventCardList: {
    gap: 0,
  },
  eventCardLoading: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardEmpty: {
    paddingVertical: 24,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 0,
    backgroundColor: "#FFFFFF",
    padding: 14,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    borderBottomColor: "#E5E7EB",
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
  eventHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  eventCategory: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventEndedBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  eventEndedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
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
