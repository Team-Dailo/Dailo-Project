// app/(tabs)/home/event-list.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from "react-native";

const EVENTS = [
  {
    id: 1,
    title: "소리담 2학기 정기공연",
    date: "2025.11.20 목요일",
    time: "19:00 ~ 21:00",
    posterUrl: "https://via.placeholder.com/200x300.png?text=Poster",
  },
  {
    id: 2,
    title: "식스라인 2학기 정기공연",
    date: "2025.11.17 월요일",
    time: "19:00 ~ 21:00",
    posterUrl: "https://via.placeholder.com/200x300.png?text=Poster",
  },
  {
    id: 3,
    title: "소리담 2학기 정기공연",
    date: "2025.11.20 목요일",
    time: "19:00 ~ 21:00",
    posterUrl: "https://via.placeholder.com/200x300.png?text=Poster",
  },
];

export default function EventListScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 상단 필터 탭 영역 */}
      <View style={styles.filterRow}>
        {["날짜", "카테고리", "인기/추천", "지역"].map((label, index) => (
          <Pressable key={label} style={[styles.filterChip, index === 0 && styles.filterChipActive]}>
            {/* 아이콘은 나중에 Ionicons 등으로 추가 가능 */}
            <Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 행사 리스트 쭉 나열 */}
      {EVENTS.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          <Image
            source={{ uri: event.posterUrl }}
            style={styles.eventImage}
          />
          <View style={styles.eventInfo}>
            <Text style={styles.eventCategory}>공연</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDate}>{event.date}</Text>
            <Text style={styles.eventTime}>{event.time}</Text>

            <Pressable style={styles.detailButton}>
              <Text style={styles.detailButtonText}>자세히 보기</Text>
            </Pressable>
          </View>
        </View>
      ))}
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
