// app/(tabs)/home/event-list.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useEventList } from "../../../hooks/useEvent";
import type { Event } from "../../../types/event";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}요일`;
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ~`;
  } catch {
    return "";
  }
}

export default function EventListScreen() {
  const router = useRouter();
  const { events, loading, error, refetch } = useEventList({ size: 50 });

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.filterRow}>
        {["날짜", "카테고리", "인기/추천", "지역"].map((label, index) => (
          <Pressable key={label} style={[styles.filterChip, index === 0 && styles.filterChipActive]}>
            <Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : (
        events.map((event: Event) => (
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
              <Text style={styles.eventCategory}>{event.category ?? "공연"}</Text>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>{formatDate(event.startAt)}</Text>
              <Text style={styles.eventTime}>{formatTime(event.startAt)}</Text>
              <Pressable style={styles.detailButton}>
                <Text style={styles.detailButtonText}>자세히 보기</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterText: {
    fontSize: 13,
    color: "#4B5563",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  eventCard: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  eventImage: {
    width: 80,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#D1D5DB",
  },
  eventInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  eventCategory: {
    fontSize: 12,
    color: "#6B7280",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  eventDate: {
    fontSize: 13,
    color: "#374151",
    marginTop: 6,
  },
  eventTime: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  detailButton: {
    marginTop: 10,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
