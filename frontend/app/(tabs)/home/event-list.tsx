// app/(tabs)/home/event-list.tsx - 행사 리스트 전체 (참고 이미지 스타일)
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEventList } from "../../../hooks/useEvent";
import type { Event } from "../../../types/event";

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

export default function EventListScreen() {
  const router = useRouter();
  const { events, loading, error, refetch } = useEventList({ size: 50 });
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>행사 리스트</Text>
        </View>
        <View style={styles.eventCardList}>
          {loading ? (
            <View style={styles.eventCardLoading}>
              <ActivityIndicator size="small" color="#6366F1" />
            </View>
          ) : events.length === 0 ? (
            <Text style={styles.eventCardEmpty}>등록된 행사가 없어요</Text>
          ) : (
            events.map((event: Event) => {
              const dateStr = formatDate(event.startAt);
              const timeStr = formatTimeRange(event.startAt, event.endAt);
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
                    <Text style={styles.eventCategory}>
                      {categoryLabel(event.category)}
                    </Text>
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
                      <Text style={styles.detailButtonText}>자세히 보기</Text>
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
    backgroundColor: "#2563EB",
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
  eventCardList: {
    gap: 12,
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
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  eventImage: {
    width: 96,
    minWidth: 96,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: "#E5E7EB",
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  eventCategory: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 8,
  },
  eventMeta: {
    gap: 2,
    marginBottom: 10,
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
    justifyContent: "center",
    gap: 4,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
