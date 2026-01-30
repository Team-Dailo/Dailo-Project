// app/(tabs)/calendar/index.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const FILTERS = ["충주시", "대학교", "총학생회", "단과대", "동아리"] as const;

type Day = {
  day: number;
  currentMonth: boolean;
};

const WEEKS: Day[][] = [
  [
    { day: 27, currentMonth: false },
    { day: 28, currentMonth: false },
    { day: 29, currentMonth: false },
    { day: 30, currentMonth: false },
    { day: 1, currentMonth: true },
    { day: 2, currentMonth: true },
    { day: 3, currentMonth: true },
  ],
  [
    { day: 4, currentMonth: true },
    { day: 5, currentMonth: true },
    { day: 6, currentMonth: true },
    { day: 7, currentMonth: true },
    { day: 8, currentMonth: true },
    { day: 9, currentMonth: true },
    { day: 10, currentMonth: true },
  ],
  [
    { day: 11, currentMonth: true },
    { day: 12, currentMonth: true },
    { day: 13, currentMonth: true },
    { day: 14, currentMonth: true },
    { day: 15, currentMonth: true },
    { day: 16, currentMonth: true },
    { day: 17, currentMonth: true },
  ],
  [
    { day: 18, currentMonth: true },
    { day: 19, currentMonth: true },
    { day: 20, currentMonth: true },
    { day: 21, currentMonth: true },
    { day: 22, currentMonth: true },
    { day: 23, currentMonth: true },
    { day: 24, currentMonth: true },
  ],
  [
    { day: 25, currentMonth: true },
    { day: 26, currentMonth: true },
    { day: 27, currentMonth: true },
    { day: 28, currentMonth: true },
    { day: 29, currentMonth: true },
    { day: 30, currentMonth: true },
    { day: 31, currentMonth: true },
  ],
];

// 특정 날짜 아래에 색깔 바 넣기 위한 매핑
const EVENT_BAR_COLOR: Record<number, string> = {
  8: "#F97373", // 빨강
  9: "#F97373",
  10: "#F97373",
  20: "#34D399", // 초록
  21: "#34D399",
  22: "#34D399",
  28: "#A855F7", // 보라
  29: "#A855F7",
  30: "#A855F7",
  31: "#A855F7",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarScreen() {
  const [selectedFilter, setSelectedFilter] =
    useState<(typeof FILTERS)[number]>("충주시");
  const [selectedDay, setSelectedDay] = useState<number>(21);
  const today = 8;

  const handleDayPress = (dayObj: Day) => {
    if (!dayObj.currentMonth) return;
    setSelectedDay(dayObj.day);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Pressable style={styles.headerIconButton}>
            <Ionicons name="menu" size={22} color="#111827" />
          </Pressable>

          <View style={styles.monthSwitcher}>
            <Pressable>
              <Ionicons name="chevron-back" size={18} color="#6B7280" />
            </Pressable>
            <Text style={styles.monthText}>5월</Text>
            <Pressable>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </Pressable>
          </View>

          <Pressable style={styles.headerIconButton}>
            <Ionicons name="search" size={20} color="#111827" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 필터 칩 */}
          <View style={styles.filterRow}>
            {FILTERS.map((filter) => {
              const selected = selectedFilter === filter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={[
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && styles.filterChipTextSelected,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 요일 헤더 */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, index) => (
              <Text
                key={w}
                style={[
                  styles.weekdayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {w}
              </Text>
            ))}
          </View>

          {/* 달력 그리드 */}
          <View style={styles.calendarGrid}>
            {WEEKS.map((week, rowIndex) => (
              <View key={rowIndex} style={styles.weekRow}>
                {week.map((dayObj, colIndex) => {
                  const isToday = dayObj.day === today && dayObj.currentMonth;
                  const isSelected =
                    dayObj.day === selectedDay && dayObj.currentMonth;
                  const eventColor = EVENT_BAR_COLOR[dayObj.day];

                  return (
                    <Pressable
                      key={`${rowIndex}-${colIndex}`}
                      style={styles.dayCellWrapper}
                      onPress={() => handleDayPress(dayObj)}
                    >
                      <View
                        style={[
                          styles.dayCell,
                          !dayObj.currentMonth && styles.dayOutsideMonth,
                        ]}
                      >
                        {/* 오늘 표시 */}
                        {isToday && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayText}>{dayObj.day}</Text>
                          </View>
                        )}

                        {/* 선택된 날짜 박스 */}
                        {!isToday && isSelected && dayObj.currentMonth && (
                          <View style={styles.selectedDayBox}>
                            <Text style={styles.selectedDayText}>
                              {dayObj.day}
                            </Text>
                          </View>
                        )}

                        {/* 일반 날짜 */}
                        {!isToday && !isSelected && (
                          <Text
                            style={[
                              styles.dayText,
                              !dayObj.currentMonth && styles.dayTextOutside,
                              colIndex === 0 && styles.sundayText,
                              colIndex === 6 && styles.saturdayText,
                            ]}
                          >
                            {dayObj.day}
                          </Text>
                        )}
                      </View>

                      {/* 날짜 아래 이벤트 색 바 */}
                      {eventColor && (
                        <View
                          style={[
                            styles.eventBar,
                            { backgroundColor: eventColor },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* 선택된 날짜 영역 제목 */}
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateText}>
              {selectedDay} 수요일
            </Text>
          </View>

          {/* 이벤트 카드 리스트 (모크 데이터) */}
          <View style={styles.eventList}>
            <View style={[styles.eventCard, styles.eventCardRedBorder]}>
              <View style={styles.eventLeft}>
                <View style={[styles.eventIcon, styles.eventIconRed]}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={styles.eventTitle}>
                    충주 다이브 페스티벌
                  </Text>
                  <Text style={styles.eventTime}>19:00~21:00</Text>
                </View>
              </View>
              <Ionicons
                name="bookmark-outline"
                size={20}
                color="#9CA3AF"
              />
            </View>

            <View style={[styles.eventCard, styles.eventCardGreenBorder]}>
              <View style={styles.eventLeft}>
                <View style={[styles.eventIcon, styles.eventIconGreen]}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={styles.eventTitle}>
                    한국교통대 &lt;Lucid dream&gt;
                  </Text>
                  <Text style={styles.eventTime}>19:00~21:00</Text>
                </View>
              </View>
              <Ionicons
                name="bookmark-outline"
                size={20}
                color="#9CA3AF"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  filterChipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterChipText: {
    fontSize: 12,
    color: "#4B5563",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 24,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
  sundayText: {
    color: "#F97373",
  },
  saturdayText: {
    color: "#3B82F6",
  },
  calendarGrid: {
    marginBottom: 16,
    paddingVertical: 4,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
  dayCellWrapper: {
    flex: 1,
    alignItems: "center",
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOutsideMonth: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 13,
    color: "#111827",
    textAlign: "center",
  },
  dayTextOutside: {
    color: "#9CA3AF",
  },
  todayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  todayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  selectedDayBox: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedDayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  eventBar: {
    marginTop: 4,
    width: 22,
    height: 3,
    borderRadius: 999,
  },
  selectedDateHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  eventList: {
    gap: 8,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
  },
  eventCardRedBorder: {
    borderColor: "#F97373",
  },
  eventCardGreenBorder: {
    borderColor: "#34D399",
  },
  eventLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  eventIconRed: {
    backgroundColor: "#F97373",
  },
  eventIconGreen: {
    backgroundColor: "#34D399",
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 11,
    color: "#6B7280",
  },
});
