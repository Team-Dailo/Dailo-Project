// app/(tabs)/calendar/index.tsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthContext } from "../../../hooks/useAuth";
import { getCalendarEvents, type CalendarEventItem } from "../../../services/event.service";
import * as scrapService from "../../../services/scrap.service";
import { getEventColorByFilterGroup, MAP_UI } from "../../../constants/colors";

/** 요일: 일-토 순서 */
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
/** 하단 시트 3단계: 최소(날짜만) / 기본 / 전체 */
const BOTTOM_SHEET_MIN_RATIO = 0.12;
const BOTTOM_SHEET_DEFAULT_RATIO = 0.3;
const BOTTOM_SHEET_EXPANDED_RATIO = 0.72;
const SHEET_HEIGHTS = [
  SCREEN_HEIGHT * BOTTOM_SHEET_MIN_RATIO,
  SCREEN_HEIGHT * BOTTOM_SHEET_DEFAULT_RATIO,
  SCREEN_HEIGHT * BOTTOM_SHEET_EXPANDED_RATIO,
] as const;
type SheetLevel = 0 | 1 | 2;
/** 달력·하단시트 공통 가로 여백 (줄인 여백) */
const HORIZONTAL_PADDING = 12;
const CONTENT_MAX_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

/** 카테고리 필터 색상: 지도·관리자와 동일 (MAP_UI.scaleBadge) */
const FILTER_CATEGORIES = [
  { id: "충주시", label: "충주시", color: MAP_UI.scaleBadge[0], bgLight: "#FEE2E2" },
  { id: "대학교", label: "대학교", color: MAP_UI.scaleBadge[1], bgLight: "#FFEDD5" },
  { id: "총학생회", label: "학생회", color: MAP_UI.scaleBadge[2], bgLight: "#FEF9C3" },
  { id: "동아리", label: "동아리", color: MAP_UI.scaleBadge[3], bgLight: "#DCFCE7" },
  { id: "개인", label: "개인", color: MAP_UI.scaleBadge[4], bgLight: "#DBEAFE" },
] as const;

/** 달력 필터 id → 백엔드 filterGroup (관리자 규모와 동일: 단과대/학생회 = COLLEGE) */
const FILTER_ID_TO_GROUP: Record<string, string | null> = {
  충주시: "CHUNGJU_CITY",
  대학교: "UNIVERSITY",
  총학생회: "COLLEGE",
  동아리: "CLUB",
  개인: "",
};

type DayCell = { day: number; currentMonth: boolean; date: Date };

const CATEGORY_COLORS: Record<string, string> = {
  FESTIVAL: "#EF4444",
  EXHIBITION: "#EAB308",
  PERFORMANCE: "#A855F7",
  EXPERIENCE_BOOTH: "#22C55E",
  FOOD_TRUCK: "#F97316",
  TRAFFIC: "#F59E0B",
  CONSTRUCTION: "#3B82F6",
  ETC: "#6B7280",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.ETC;
}

/** 이벤트 표시 색상: 규모(filterGroup) 우선·지도/관리자와 동일, 없을 때만 카테고리 */
function getEventColor(ev: CalendarEventItem): string {
  if (ev.filterGroup !== undefined) {
    return getEventColorByFilterGroup(ev.filterGroup);
  }
  return getCategoryColor(ev.category);
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

/** 행사가 해당 월에 걸쳐 있는 모든 날(일) 목록. 2일 이상이면 여러 날 반환 */
function getEventDaysInMonth(ev: CalendarEventItem, year: number, month: number): number[] {
  try {
    const start = new Date(ev.startAt);
    const end = ev.endAt ? new Date(ev.endAt) : new Date(ev.startAt);
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const days: number[] = [];
    const cur = new Date(startDate.getTime());
    while (cur <= endDate) {
      if (cur.getFullYear() === year && cur.getMonth() === month - 1) {
        days.push(cur.getDate());
      }
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  } catch {
    const d = getDayFromIso(ev.startAt);
    return d ? [d] : [];
  }
}

/** 백엔드 LocalDateTime이 배열 [y,mo,d,h,min,s]로 올 수 있음 → ISO 문자열로 통일 */
function toIsoString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const [y, mo, d, h = 0, min = 0, s = 0] = v.map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min), Number(s));
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  }
  return "";
}

/** API 응답 정규화: startAt/endAt → ISO 문자열, filterGroup → 칩/카드 색상용, isBookmarked */
function normalizeCalendarItem(
  raw: CalendarEventItem & { filter_group?: string | null; bookmarked?: boolean }
): CalendarEventItem {
  return {
    ...raw,
    startAt: toIsoString(raw.startAt) || raw.startAt,
    endAt: toIsoString(raw.endAt) || raw.endAt,
    filterGroup: raw.filterGroup ?? raw.filter_group ?? null,
    isBookmarked: raw.isBookmarked ?? raw.bookmarked ?? false,
  };
}

/** 일요일 시작 주 (일-토 순서) */
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
  const [sheetLevel, setSheetLevel] = useState<SheetLevel>(1);
  const sheetLevelRef = useRef<SheetLevel>(1);
  sheetLevelRef.current = sheetLevel;
  const sheetHeightAnim = useRef(
    new Animated.Value(SHEET_HEIGHTS[1])
  ).current;

  const animateSheetToLevel = useCallback(
    (level: SheetLevel) => {
      const toValue = SHEET_HEIGHTS[level];
      Animated.timing(sheetHeightAnim, {
        toValue,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setSheetLevel(level);
        sheetLevelRef.current = level;
      });
    },
    [sheetHeightAnim]
  );

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 8,
      onPanResponderRelease: (_, gestureState) => {
        const { dy } = gestureState;
        const current = sheetLevelRef.current;
        let next: SheetLevel = current;
        if (dy < -25) {
          if (current === 0) next = 1;
          else if (current === 1) next = 2;
        } else if (dy > 25) {
          if (current === 2) next = 1;
          else if (current === 1) next = 0;
        }
        if (next !== current) animateSheetToLevel(next);
      },
    })
  ).current;

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const list = await getCalendarEvents(year, month);
      setEvents(list.map(normalizeCalendarItem));
    } catch (e) {
      setError(e instanceof Error ? e.message : "이벤트를 불러올 수 없습니다.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchEvents]);

  const weeks = useMemo(
    () => buildCalendarWeeks(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  /** 달력 위 행사 표시(뭉툭한 선): 카테고리 선택 시 해당 카테고리만. 2일 이상 행사는 해당하는 모든 날에 선 표시. 3개 초과 시 마지막 선 짧게 + '+' */
  const eventsByDayForDots = useMemo(() => {
    const filterGroupValue =
      selectedCategory != null ? FILTER_ID_TO_GROUP[selectedCategory] ?? null : null;
    const filtered =
      filterGroupValue === null
        ? events
        : filterGroupValue === ""
          ? events.filter((ev) => !ev.filterGroup || String(ev.filterGroup).trim() === "")
          : events.filter(
              (ev) =>
                ev.filterGroup != null &&
                String(ev.filterGroup).trim() === String(filterGroupValue).trim()
            );
    const map: Record<number, CalendarEventItem[]> = {};
    filtered.forEach((ev) => {
      const daysInMonth = getEventDaysInMonth(ev, viewYear, viewMonth);
      daysInMonth.forEach((d) => {
        if (!map[d]) map[d] = [];
        map[d].push(ev);
      });
    });
    return map;
  }, [events, selectedCategory, viewYear, viewMonth]);

  /** 상세보기 칸: 해당 날짜의 모든 행사 (카테고리 필터 무관). 2일 이상 행사는 해당하는 모든 날에 표시 */
  const eventsByDayAll = useMemo(() => {
    const map: Record<number, CalendarEventItem[]> = {};
    events.forEach((ev) => {
      const daysInMonth = getEventDaysInMonth(ev, viewYear, viewMonth);
      daysInMonth.forEach((d) => {
        if (!map[d]) map[d] = [];
        map[d].push(ev);
      });
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const selectedEvents = useMemo(() => {
    return eventsByDayAll[selectedDay] ?? [];
  }, [eventsByDayAll, selectedDay]);

  const { isLoggedIn } = useAuthContext();
  const handleToggleBookmark = useCallback(async (ev: CalendarEventItem) => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "저장 기능은 로그인 후 사용할 수 있습니다.", [
        { text: "취소" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    try {
      const isNowSaved = await scrapService.toggleScrap(ev.id);
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, isBookmarked: isNowSaved } : e))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "저장할 수 없습니다.";
      Alert.alert("알림", msg.includes("로그인") ? "로그인 후 저장할 수 있어요." : msg);
    }
  }, [isLoggedIn]);

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
    if (cell.currentMonth) {
      setSelectedDay(cell.day);
    } else {
      // 옅게 보이는 이전달/다음달 날짜 터치 시 해당 달로 이동
      setViewYear(cell.date.getFullYear());
      setViewMonth(cell.date.getMonth() + 1);
      setSelectedDay(cell.day);
    }
    animateSheetToLevel(1);
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

  const SWIPE_THRESHOLD = 50;
  const monthNavRef = useRef({ handlePrevMonth: () => {}, handleNextMonth: () => {} });
  monthNavRef.current.handlePrevMonth = handlePrevMonth;
  monthNavRef.current.handleNextMonth = handleNextMonth;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        if (dx < -SWIPE_THRESHOLD) monthNavRef.current.handleNextMonth();
        else if (dx > SWIPE_THRESHOLD) monthNavRef.current.handlePrevMonth();
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* 헤더: 꺾쇠는 벽쪽, 년월은 가운데 */}
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

        {/* 카테고리: 윤곽선 없음, 연한 배경, 글씨 옆 동그라미 */}
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
                  { backgroundColor: selected ? cat.color : cat.bgLight },
                ]}
              >
                <View style={[styles.filterChipCircle, { backgroundColor: cat.color }]} />
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

        {/* 요일 + 날짜 카드: 좌우 스와이프로 이전/다음 달 이동 */}
        <View style={styles.calendarCard} {...panResponder.panHandlers}>
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
                  ? eventsByDayForDots[cell.day] ?? []
                : [];

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
                      <View style={styles.dayNumberSlot}>
                        {todayCell && (
                          <View style={[StyleSheet.absoluteFillObject, styles.todayBadgeFill]} />
                        )}
                        {!todayCell && isSelected && (
                          <View style={[StyleSheet.absoluteFillObject, styles.selectedDayBoxSquare]} />
                        )}
                        <Text
                          style={[
                            styles.dayText,
                            todayCell && styles.todayText,
                            !todayCell && isSelected && styles.selectedDayText,
                            !cell.currentMonth && styles.dayTextOutside,
                            !todayCell && colIndex === 0 && styles.sundayText,
                            !todayCell && colIndex === 6 && styles.saturdayText,
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                      {dayEvents.length > 0 && cell.currentMonth && (
                        <View style={styles.eventLines}>
                          {dayEvents.slice(0, 3).map((ev) => (
                            <View key={ev.id} style={styles.eventLineRow}>
                              <View
                                style={[
                                  styles.eventLine,
                                  { backgroundColor: getEventColor(ev) },
                                ]}
                              />
                            </View>
                          ))}
                          {dayEvents.length > 3 && (
                            <Text style={styles.eventLinePlus}>+</Text>
                          )}
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

        {/* 하단 시트: 터치로 위로 당기면 확장되어 카드 전체 표시 */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              height: sheetHeightAnim,
              bottom: 0,
            },
          ]}
        >
          <View style={styles.bottomSheetHandleWrap} {...sheetPanResponder.panHandlers}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>
              {selectedDay}일 {selectedWeekday}
            </Text>
          </View>

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
                  const color = getEventColor(ev);
                  return (
                    <View key={ev.id} style={[styles.eventCard, { borderColor: color }]}>
                      <Pressable
                        style={styles.eventLeft}
                        onPress={() => router.push(`/event/${ev.id}?source=calendar`)}
                      >
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
                      </Pressable>
                      <Pressable
                        onPress={() => handleToggleBookmark(ev)}
                        style={styles.eventBookmarkBtn}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={ev.isBookmarked ? "bookmark" : "bookmark-outline"}
                          size={22}
                          color={ev.isBookmarked ? "#6366F1" : "#9CA3AF"}
                        />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </Animated.View>
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  monthNavBtn: {
    padding: 4,
    minWidth: 40,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  filterChipsScroll: {
    marginBottom: 10,
    marginTop: 20,
  },
  filterChipsWrap: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 60,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 6,
    justifyContent: "center",
  },
  filterChipCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  calendarCard: {
    paddingVertical: 8,
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: "row",
    paddingBottom: 6,
    marginBottom: 0,
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
    paddingVertical: 0,
  },
  weekRow: {
    flexDirection: "row",
    paddingTop: 6,
    paddingBottom: 9,
  },
  dayCellWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  dayCell: {
    minWidth: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  dayOutsideMonth: { opacity: 0.35 },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  dayTextOutside: { color: "#9CA3AF" },
  /** 날짜 숫자 고정 슬롯 (선택/오늘 여부와 관계없이 같은 위치) */
  dayNumberSlot: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  /** 오늘: 윤곽선 없이 채워진 연한 회색 원 */
  todayBadgeFill: {
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  todayText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  /** 선택한 날짜: 둥근 정사각형 배경 */
  selectedDayBoxSquare: {
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  selectedDayText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E40AF",
  },
  /** 행사 표시: 숫자 바로 아래 가운데 정렬, 뭉툭한 선. 3개 초과 시 선 아래에 '+' */
  eventLines: {
    flexDirection: "column",
    alignItems: "center",
    alignSelf: "center",
    gap: 1,
    marginTop: 3,
    width: 32,
  },
  eventLineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
    height: 6,
  },
  eventLine: {
    height: 4,
    width: 28,
    borderRadius: 2,
  },
  eventLinePlus: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: -2,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomSheetHandleWrap: {
    alignSelf: "stretch",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 0,
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
    minWidth: 0,
  },
  eventBookmarkBtn: {
    padding: 6,
    margin: -6,
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
