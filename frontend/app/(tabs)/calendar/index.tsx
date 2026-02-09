// app/(tabs)/calendar/index.tsx
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getCalendarEvents, type CalendarEventItem } from "../../../services/event.service";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_MAX_RATIO = 0.4;
/** 달력·하단시트 공통 가로 여백 (가로 크기 넘지 않게) */
const HORIZONTAL_PADDING = 20;
const CONTENT_MAX_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

/** 카테고리 필터 (사진처럼) */
const FILTER_CATEGORIES = [
  { id: "충주시", label: "충주시", borderColor: "#EF4444" },
  { id: "대학교", label: "대학교", borderColor: "#F97316" },
  { id: "총학생회", label: "총학생회", borderColor: "#EAB308" },
  { id: "단과대", label: "단과대", borderColor: "#0EA5E9" },
  { id: "동아리", label: "동아리", borderColor: "#22C55E" },
] as const;

/** 규모(필터) id → 이벤트 category 매핑 (해당하는 점만 표시) */
const FILTER_TO_EVENT_CATEGORIES: Record<string, string[]> = {
  충주시: ["FESTIVAL"],
  대학교: ["CONSTRUCTION", "TRAFFIC"],
  총학생회: ["FESTIVAL"],
  단과대: ["EXHIBITION"],
  동아리: ["ETC"],
};

type DayCell = { day: number; currentMonth: boolean; date: Date };

const CATEGORY_COLORS: Record<string, string> = {
  FESTIVAL: "#EF4444",
  EXHIBITION: "#EAB308",
  TRAFFIC: "#F59E0B",
  CONSTRUCTION: "#3B82F6",
  ETC: "#6B7280",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.ETC;
}

function formatTimeRange(startAt: string, endAt: string): string {
  try {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const sh = s.getHours();
    const sm = s.getMinutes();
    const eh = e.getHours();
    const em = e.getMinutes();
    const fmt = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return `${fmt(sh, sm)}~${fmt(eh, em)}`;
  } catch {
    return "";
  }
}

function getDayFromIso(iso: string): number {
  try {
    return new Date(iso).getDate();
  } catch {
    return 0;
  }
}

function buildCalendarWeeks(year: number, month: number): DayCell[][] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < startDay; i++) {
    const day = prevLast - startDay + i + 1;
    cells.push({
      day,
      currentMonth: false,
      date: new Date(prevYear, prevMonth - 1, day),
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      currentMonth: true,
      date: new Date(year, month - 1, d),
    });
  }
  const MAX_WEEKS = 5;
  const totalCells = MAX_WEEKS * 7;
  const nextCount = Math.max(0, totalCells - cells.length);
  for (let i = 0; i < nextCount; i++) {
    cells.push({
      day: i + 1,
      currentMonth: false,
      date: new Date(year, month, i + 1),
    });
  }
  const trimmed = cells.slice(0, totalCells);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < MAX_WEEKS; w++) {
    weeks.push(trimmed.slice(w * 7, (w + 1) * 7));
  }
  return weeks;
}

export default function CalendarScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number>(today.getDate());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  /** 9일 임시 행사 2건 (다른 규모/카테고리) */
  const mockEventsForDay9 = useCallback(
    (year: number, month: number): CalendarEventItem[] => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const base = `${year}-${pad(month)}-09`;
      return [
        {
          id: -1,
          title: "충주 다이브 페스티벌",
          category: "FESTIVAL",
          startAt: `${base}T19:00:00`,
          endAt: `${base}T21:00:00`,
          isBookmarked: false,
        },
        {
          id: -2,
          title: "한국교통대 <Lucid dream>",
          category: "EXHIBITION",
          startAt: `${base}T19:00:00`,
          endAt: `${base}T21:00:00`,
          isBookmarked: false,
        },
      ];
    },
    []
  );

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCalendarEvents(year, month);
      const mock9 = mockEventsForDay9(year, month);
      const listWithout9 = list.filter((ev) => getDayFromIso(ev.startAt) !== 9);
      setEvents([...listWithout9, ...mock9]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "이벤트를 불러올 수 없습니다.");
      setEvents(mockEventsForDay9(year, month));
    } finally {
      setLoading(false);
    }
  }, [mockEventsForDay9]);

  useEffect(() => {
    fetchEvents(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchEvents]);

  const weeks = useMemo(
    () => buildCalendarWeeks(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const eventsByDay = useMemo(() => {
    const allowedCategories =
      selectedCategory != null
        ? FILTER_TO_EVENT_CATEGORIES[selectedCategory] ?? []
        : null;
    const filtered =
      allowedCategories === null
        ? events
        : events.filter((ev) => allowedCategories.includes(ev.category));
    const map: Record<number, CalendarEventItem[]> = {};
    filtered.forEach((ev) => {
      const d = getDayFromIso(ev.startAt);
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events, selectedCategory]);

  const selectedEvents = useMemo(() => {
    return events.filter((ev) => getDayFromIso(ev.startAt) === selectedDay);
  }, [events, selectedDay]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
    const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
    const lastDay = new Date(nextYear, nextMonth, 0).getDate();
    setSelectedDay(Math.min(selectedDay, lastDay));
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  };

  const handleDayPress = (cell: DayCell) => {
    if (!cell.currentMonth) return;
    setSelectedDay(cell.day);
  };

  const isToday = (cell: DayCell) =>
    cell.currentMonth &&
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() + 1 &&
    cell.day === today.getDate();

  const selectedWeekday = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, selectedDay);
    return WEEKDAYS[d.getDay()];
  }, [viewYear, viewMonth, selectedDay]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.monthSwitcher}>
            <Pressable
              onPress={handlePrevMonth}
              style={styles.monthNavBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color="#374151" />
            </Pressable>
            <Text style={styles.monthText}>
              {viewYear}년 {viewMonth}월
            </Text>
            <Pressable
              onPress={handleNextMonth}
              style={styles.monthNavBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-forward" size={22} color="#374151" />
            </Pressable>
          </View>
        </View>

        {/* 달력 영역만 스크롤 (전체 흰 배경) */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 카테고리 칩 (가운데 정렬) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterChipsWrap, { justifyContent: "center" }]}
            style={styles.filterChipsScroll}
          >
            {FILTER_CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() =>
                    setSelectedCategory(selected ? null : cat.id)
                  }
                  style={[
                    styles.filterChip,
                    { borderColor: cat.borderColor },
                    selected && {
                      backgroundColor: cat.borderColor,
                      borderColor: cat.borderColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && styles.filterChipTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 요일 + 날짜 카드 (연한 회색 배경) */}
          <View style={styles.calendarCard}>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w, i) => (
                <View key={w} style={styles.weekdayCell}>
                  <Text
                    style={[
                      styles.weekdayText,
                      i === 0 && styles.sundayText,
                      i === 6 && styles.saturdayText,
                    ]}
                  >
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* 달력 그리드 (요일과 같은 열 정렬) */}
            <View style={styles.calendarGrid}>
            {weeks.map((week, rowIndex) => (
              <View key={rowIndex} style={styles.weekRow}>
                {week.map((cell, colIndex) => {
                  const todayCell = isToday(cell);
                  const isSelected =
                    cell.currentMonth && cell.day === selectedDay;
                  const dayEvents = cell.currentMonth
                    ? eventsByDay[cell.day] ?? []
                  : [];
                  const dotColor =
                    selectedCategory != null
                      ? FILTER_CATEGORIES.find(
                          (c) => c.id === selectedCategory
                        )?.borderColor
                      : null;

                  return (
                    <Pressable
                      key={`${rowIndex}-${colIndex}`}
                      style={styles.dayCellWrapper}
                      onPress={() => handleDayPress(cell)}
                    >
                      <View
                        style={[
                          styles.dayCell,
                          !cell.currentMonth && styles.dayOutsideMonth,
                        ]}
                      >
                        {todayCell && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayText}>{cell.day}</Text>
                          </View>
                        )}
                        {!todayCell && isSelected && (
                          <View style={styles.selectedDayBox}>
                            <Text style={styles.selectedDayText}>
                              {cell.day}
                            </Text>
                          </View>
                        )}
                        {!todayCell && !isSelected && (
                          <Text
                            style={[
                              styles.dayText,
                              !cell.currentMonth && styles.dayTextOutside,
                              colIndex === 0 && styles.sundayText,
                              colIndex === 6 && styles.saturdayText,
                            ]}
                          >
                            {cell.day}
                          </Text>
                        )}
                        {dayEvents.length > 0 && cell.currentMonth && (
                          <View style={styles.eventDots}>
                            {dayEvents.slice(0, 3).map((ev) => (
                              <View
                                key={ev.id}
                                style={[
                                  styles.eventDot,
                                  {
                                    backgroundColor:
                                      dotColor ??
                                      getCategoryColor(ev.category),
                                  },
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            </View>
          </View>
        </ScrollView>

        {/* 하단 시트: 탭 바로 위쪽부터 시작, 그림자 위쪽 */}
        <View
          style={[
            styles.bottomSheet,
            {
              height: SCREEN_HEIGHT * BOTTOM_SHEET_MAX_RATIO,
              bottom: 0,
            },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>
            {selectedDay}일 {selectedWeekday}
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.loadingText}>이벤트 불러오는 중</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="cloud-offline-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : selectedEvents.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>이 날짜에 예정된 이벤트가 없어요</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.bottomSheetScroll}
              contentContainerStyle={[styles.bottomSheetScrollContent, { maxWidth: CONTENT_MAX_WIDTH }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.eventList}>
                {selectedEvents.map((ev) => {
                  const color = getCategoryColor(ev.category);
                  return (
                    <Pressable
                      key={ev.id}
                      style={[styles.eventCard, { borderColor: color }]}
                      onPress={() => router.push(`/event/${ev.id}?source=calendar`)}
                    >
                      <View style={styles.eventLeft}>
                        <View
                          style={[
                            styles.eventIcon,
                            { backgroundColor: color },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.eventBody}>
                          <Text
                            style={styles.eventTitle}
                            numberOfLines={2}
                          >
                            {ev.title}
                          </Text>
                          <Text style={styles.eventTime}>
                            {formatTimeRange(ev.startAt, ev.endAt)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name={ev.isBookmarked ? "bookmark" : "bookmark-outline"}
                        size={20}
                        color={ev.isBookmarked ? "#6366F1" : "#9CA3AF"}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    minWidth: 100,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 20,
    backgroundColor: "#F3F4F6",
    paddingBottom: 24 + SCREEN_HEIGHT * BOTTOM_SHEET_MAX_RATIO,
  },
  filterChipsScroll: {
    marginBottom: 20,
    marginTop: 0,
    marginHorizontal: -HORIZONTAL_PADDING,
  },
  filterChipsWrap: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    minWidth: 60,
    height: 28,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  sundayText: { color: "#EF4444" },
  saturdayText: { color: "#3B82F6" },
  calendarGrid: {
    paddingVertical: 4,
  },
  weekRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  dayCellWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dayCell: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dayOutsideMonth: { opacity: 0.35 },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  dayTextOutside: { color: "#9CA3AF" },
  todayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  todayText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366F1",
  },
  selectedDayBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedDayText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  eventDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
    marginHorizontal: 0,
    minHeight: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
    marginLeft: 12,
  },
  bottomSheetScroll: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    paddingBottom: 24,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: { fontSize: 14, color: "#6B7280" },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  eventList: { gap: 10, maxWidth: CONTENT_MAX_WIDTH },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  eventBody: { flex: 1, minWidth: 0 },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: "#6B7280",
  },
});
