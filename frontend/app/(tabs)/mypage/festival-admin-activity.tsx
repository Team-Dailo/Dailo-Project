// app/(tabs)/mypage/festival-admin-activity.tsx - 시간대별 사용자 활동 대시보드
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import * as festivalAdminService from "../../../services/festival-admin.service";
import type { AdminEventResponse } from "../../../services/admin.service";
import type { EventActivityStatsResponse, HourlyCount } from "../../../services/festival-admin.service";

export default function FestivalAdminActivityScreen() {
  const params = useLocalSearchParams<{ eventId?: string }>();
  const initialEventId = params.eventId ? Number(params.eventId) : null;

  const [events, setEvents] = useState<AdminEventResponse[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialEventId);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [stats, setStats] = useState<EventActivityStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function getTodayString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await festivalAdminService.getMyManagedEvents();
      setEvents(data);
      if (!selectedEventId && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (e: any) {
      setError(e.message || "축제 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  const loadStats = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      setStatsLoading(true);
      const data = await festivalAdminService.getEventActivityStats(selectedEventId, selectedDate);
      setStats(data);
    } catch (e: any) {
      setStats(null);
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, [selectedEventId, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  useEffect(() => {
    if (selectedEventId) {
      loadStats();
    }
  }, [selectedEventId, selectedDate, loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  const changeDate = (delta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + delta);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
    setSelectedDate(newDate);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  const getMaxCount = (hourlyCounts: HourlyCount[]): number => {
    const max = Math.max(...hourlyCounts.map((h) => h.count));
    return max > 0 ? max : 1;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>관리하는 축제가 없습니다.</Text>
      </View>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 축제 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>축제 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventPicker}>
          {events.map((event) => (
            <Pressable
              key={event.id}
              style={[
                styles.eventChip,
                selectedEventId === event.id && styles.eventChipSelected,
              ]}
              onPress={() => setSelectedEventId(event.id)}
            >
              <Text
                style={[
                  styles.eventChipText,
                  selectedEventId === event.id && styles.eventChipTextSelected,
                ]}
                numberOfLines={1}
              >
                {event.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 날짜 선택 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>날짜 선택</Text>
        <View style={styles.datePicker}>
          <Pressable style={styles.dateArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
          <Pressable style={styles.dateArrow} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={24} color="#6B7280" />
          </Pressable>
        </View>
      </View>

      {/* 통계 카드 */}
      {statsLoading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.statsLoadingText}>불러오는 중...</Text>
        </View>
      ) : stats ? (
        <>
          {/* 총 조회수 */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Ionicons name="eye-outline" size={24} color="#3B82F6" />
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>총 조회수</Text>
                <Text style={styles.summaryValue}>{stats.totalViews.toLocaleString()}회</Text>
              </View>
            </View>
          </View>

          {/* 시간대별 차트 */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>시간대별 조회수</Text>
            <View style={styles.chart}>
              {stats.hourlyCounts.map((item) => {
                const maxCount = getMaxCount(stats.hourlyCounts);
                const heightPercent = (item.count / maxCount) * 100;
                return (
                  <View key={item.hour} style={styles.barContainer}>
                    <Text style={styles.barCount}>
                      {item.count > 0 ? item.count : ""}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(heightPercent, 2)}%`,
                          backgroundColor: item.count > 0 ? "#3B82F6" : "#E5E7EB",
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{item.hour}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.chartSubtitle}>시간 (0~23시)</Text>
          </View>

          {/* 시간대별 상세 테이블 */}
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>시간대별 상세</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>시간</Text>
              <Text style={styles.tableHeaderCell}>조회수</Text>
            </View>
            {stats.hourlyCounts
              .filter((item) => item.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
              .map((item) => (
                <View key={item.hour} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.hour}시</Text>
                  <Text style={styles.tableCell}>{item.count}회</Text>
                </View>
              ))}
            {stats.hourlyCounts.every((item) => item.count === 0) && (
              <Text style={styles.noDataText}>해당 날짜에 조회 기록이 없습니다.</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noStats}>
          <Ionicons name="bar-chart-outline" size={48} color="#9CA3AF" />
          <Text style={styles.noStatsText}>통계를 불러올 수 없습니다.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  errorText: { fontSize: 14, color: "#EF4444", marginTop: 12 },
  emptyText: { fontSize: 16, color: "#6B7280", marginTop: 12 },

  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  eventPicker: { flexDirection: "row" },
  eventChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventChipSelected: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  eventChipText: {
    fontSize: 14,
    color: "#374151",
    maxWidth: 150,
  },
  eventChipTextSelected: { color: "#FFFFFF", fontWeight: "600" },

  datePicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  dateArrow: { padding: 8 },
  dateText: { fontSize: 16, fontWeight: "600", color: "#111827", marginHorizontal: 16 },

  statsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  statsLoadingText: { fontSize: 14, color: "#6B7280" },

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 13, color: "#6B7280" },
  summaryValue: { fontSize: 28, fontWeight: "700", color: "#111827", marginTop: 4 },

  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 16 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 2,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barCount: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  bar: {
    width: "80%",
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 8,
    color: "#9CA3AF",
    marginTop: 4,
  },
  chartSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },

  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  tableTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  noDataText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 20,
  },

  noStats: {
    alignItems: "center",
    padding: 40,
  },
  noStatsText: { fontSize: 14, color: "#9CA3AF", marginTop: 12 },
});
