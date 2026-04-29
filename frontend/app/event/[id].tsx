// frontend/app/event/[id].tsx
import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ToastAndroid,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EventDetailHeader from "../../components/detail/EventDetailHeader";
import { useAuth } from "../../hooks/useAuth";
import { useEventDetail } from "../../hooks/useEvent";
import EventDetailTabs, { TabKey } from "../../components/detail/EventDetailTabs";
import * as scrapService from "../../services/scrap.service";
import * as eventService from "../../services/event.service";
import Timeline, { formatEventDate } from "../../components/detail/Timeline";
import EventNewsTab from "../../components/detail/EventNewsTab";
import EventBoothTab from "../../components/detail/EventBoothTab";
import { parseEventExtra } from "../../utils/eventExtra";

const STICKY_THRESHOLD_PX = 2;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
/** 행사 기간(시작~종료) 일자별 라벨 "M.D(요일)" 배열. 2일 이상일 때 타임테이블 날짜 선택용 */
function getEventDayLabels(startAt?: string | null, endAt?: string | null): string[] {
  if (!startAt || !endAt) return [];
  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
    const labels: string[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cur <= endDay) {
      const m = cur.getMonth() + 1;
      const d = cur.getDate();
      const w = WEEKDAY_KO[cur.getDay()];
      labels.push(`${m}.${d}(${w})`);
      cur.setDate(cur.getDate() + 1);
    }
    return labels;
  } catch {
    return [];
  }
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { id, source, tab: tabParam, thumb } = useLocalSearchParams<{
    id: string;
    source?: string;
    tab?: string;
    thumb?: string;
  }>();
  const { detail: event, loading, error, refetch: refetchDetail } = useEventDetail(id, source ?? "detail");
  const initialTab: TabKey =
    tabParam === "news"
      ? "news"
      : tabParam === "timeline"
        ? "timeline"
        : tabParam === "booths"
          ? "booths"
          : "news";

  const extra = useMemo(
    () => parseEventExtra(event?.extraJson ?? null),
    [event?.extraJson]
  );

  const timelineDateLabel = useMemo(() => {
    if (extra.timeline && extra.timeline.length > 0 && extra.timeline[0].dateLabel) {
      return extra.timeline[0].dateLabel;
    }
    return event?.startAt ? formatEventDate(event.startAt) : null;
  }, [extra.timeline, event?.startAt]);

  const thumbnailFromRoute = useMemo(() => {
    if (!thumb || typeof thumb !== "string") return null;
    const t = thumb.trim();
    return t.length > 0 ? t : null;
  }, [thumb]);

  const eventWithThumbnail = useMemo(
    () =>
      event
        ? {
            ...event,
            thumbnailUrl:
              thumbnailFromRoute?.trim() ||
              (event as typeof event & { thumbnailUrl?: string | null }).thumbnailUrl?.trim() ||
              event.posterUrls?.[0] ||
              null,
          }
        : event,
    [event, thumbnailFromRoute]
  );

  const eventDayLabels = useMemo(
    () => getEventDayLabels(event?.startAt ?? null, event?.endAt ?? null),
    [event?.startAt, event?.endAt]
  );
  const isMultiDayTimeline = eventDayLabels.length >= 2;
  const [selectedTimelineDateIndex, setSelectedTimelineDateIndex] = useState(0);
  const selectedTimelineDateLabel = eventDayLabels[selectedTimelineDateIndex] ?? eventDayLabels[0] ?? timelineDateLabel ?? "";
  const timelineItemsForDay = useMemo(() => {
    const list = extra.timeline ?? [];
    if (!isMultiDayTimeline) return list;
    return list.filter((i) => (i.dateLabel ?? "") === selectedTimelineDateLabel);
  }, [extra.timeline, isMultiDayTimeline, selectedTimelineDateLabel]);

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [scrapedOverride, setScrapedOverride] = useState<boolean | null>(null);

  const eventIdNum = id ? Number(id) : NaN;
  const hasValidId = Number.isFinite(eventIdNum);

  // 서버에서 '현재 사용자' 기준 좋아요 여부 + 전체 좋아요 수 조회 (다른 계정이면 빈 하트)
  const fetchLikeStatus = useCallback(() => {
    if (!hasValidId) return;
    eventService.getEventLikeStatus(eventIdNum).then(({ liked, likeCount: count }) => {
      setIsLiked(liked);
      setLikeCount(count);
    }).catch(() => {
      setIsLiked(false);
      setLikeCount(0);
    });
  }, [hasValidId, eventIdNum]);

  useEffect(() => {
    fetchLikeStatus();
  }, [fetchLikeStatus]);

  useFocusEffect(
    useCallback(() => {
      if (hasValidId) fetchLikeStatus();
    }, [hasValidId, fetchLikeStatus])
  );

  useEffect(() => {
    setScrapedOverride(null);
  }, [event?.id, event?.isBookmarked]);

  useEffect(() => {
    if (eventDayLabels.length > 0 && selectedTimelineDateIndex >= eventDayLabels.length) {
      setSelectedTimelineDateIndex(0);
    }
  }, [eventDayLabels.length, selectedTimelineDateIndex]);

  const handleLike = useCallback(async () => {
    if (!hasValidId) return;
    if (!isLoggedIn) {
      if (Platform.OS === "android") {
        ToastAndroid.show("로그인 후 좋아요를 누를 수 있습니다.", ToastAndroid.SHORT);
      } else {
        Alert.alert("로그인 필요", "로그인 후 좋아요를 누를 수 있습니다.");
      }
      return;
    }
    try {
      const { liked, likeCount: count } = await eventService.toggleEventLike(eventIdNum);
      setIsLiked(liked);
      setLikeCount(count);
      if (Platform.OS === "android") {
        ToastAndroid.show(liked ? "좋아요" : "좋아요 해제", ToastAndroid.SHORT);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "처리에 실패했습니다.";
      if (Platform.OS === "android") {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert("알림", msg);
      }
    }
  }, [hasValidId, eventIdNum, isLoggedIn]);

  const scrollRef = useRef<ScrollView | null>(null);
  const [tabsOffsetY, setTabsOffsetY] = useState(0);
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const showStickyRef = useRef(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const threshold = tabsOffsetY - STICKY_THRESHOLD_PX;
      if (tabsOffsetY <= 0) return;
      if (y >= threshold) {
        if (!showStickyRef.current) {
          showStickyRef.current = true;
          setShowStickyTabs(true);
        }
      } else {
        if (showStickyRef.current) {
          showStickyRef.current = false;
          setShowStickyTabs(false);
        }
      }
    },
    [tabsOffsetY]
  );

  const handleChangeTab = useCallback(
    (key: TabKey) => {
      setTab(key);
      scrollRef.current?.scrollTo({ y: tabsOffsetY, animated: true });
    },
    [tabsOffsetY]
  );

  const handleSave = useCallback(async () => {
    const eventId = id ? Number(id) : NaN;
    if (!Number.isFinite(eventId)) return;
    try {
      const added = await scrapService.toggleScrap(eventId);
      setScrapedOverride(added);
      refetchDetail();
      if (Platform.OS === "android") {
        ToastAndroid.show(
          added ? "저장되었습니다" : "저장이 해제되었습니다",
          ToastAndroid.SHORT
        );
      } else {
        Alert.alert(added ? "저장되었습니다" : "저장이 해제되었습니다");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "저장에 실패했습니다.";
      if (Platform.OS === "android") {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert("알림", msg);
      }
    }
  }, [id, refetchDetail]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={[styles.scroll, { minHeight: SCREEN_HEIGHT }]}
        contentContainerStyle={[
          styles.contentContainer,
          { minHeight: SCREEN_HEIGHT + 200 },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <EventDetailHeader
          id={id}
          event={eventWithThumbnail}
          loading={loading}
          error={error}
          onSave={handleSave}
          isLiked={isLiked}
          likeCount={likeCount}
          onLike={handleLike}
          isLoggedIn={isLoggedIn}
          isScraped={scrapedOverride ?? event?.isBookmarked ?? false}
        />

        <View
          style={styles.tabsWrapper}
          onLayout={(e) => setTabsOffsetY(e.nativeEvent.layout.y)}
        >
          <EventDetailTabs value={tab} onChange={handleChangeTab} />
        </View>

        <View style={styles.body}>
          {tab === "news" && (
            <View style={styles.bodyInner}>
              <EventNewsTab
                news={extra.news}
                eventId={event?.id != null ? Number(event.id) : undefined}
              />
            </View>
          )}
          {(tab === "timeline" || tab === "booths") && (
            <View style={[styles.timelineWrap, styles.bodyInner]}>
              {tab === "timeline" && isMultiDayTimeline && (
                <View style={styles.timelineDateNavRow}>
                  <Pressable
                    onPress={() => setSelectedTimelineDateIndex((i) => Math.max(0, i - 1))}
                    style={styles.timelineDateNavBtn}
                    disabled={selectedTimelineDateIndex <= 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={selectedTimelineDateIndex <= 0 ? "#D1D5DB" : "#374151"}
                    />
                  </Pressable>
                  <Text style={styles.timelineDateNavLabel}>{selectedTimelineDateLabel}</Text>
                  <Pressable
                    onPress={() =>
                      setSelectedTimelineDateIndex((i) =>
                        Math.min(eventDayLabels.length - 1, i + 1)
                      )
                    }
                    style={styles.timelineDateNavBtn}
                    disabled={selectedTimelineDateIndex >= eventDayLabels.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={
                        selectedTimelineDateIndex >= eventDayLabels.length - 1
                          ? "#D1D5DB"
                          : "#374151"
                      }
                    />
                  </Pressable>
                </View>
              )}
              {tab === "timeline" && (
                <Timeline
                  dateLabel={isMultiDayTimeline ? null : timelineDateLabel}
                  items={timelineItemsForDay}
                />
              )}
              {tab === "booths" && (
                <EventBoothTab
                  eventId={event?.id != null ? Number(event.id) : undefined}
                  eventTitle={event?.title ?? ""}
                  foodBooths={extra.foodBooths}
                  experienceBooths={extra.experienceBooths}
                  eventLatitude={event?.latitude ?? null}
                  eventLongitude={event?.longitude ?? null}
                  foodArea={extra.foodArea}
                  experienceArea={extra.experienceArea}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {showStickyTabs ? (
        <View
          style={[
            styles.stickyTabs,
            {
              paddingTop: Math.max(insets.top, 8),
            },
          ]}
          pointerEvents="box-none"
        >
          <EventDetailTabs value={tab} onChange={handleChangeTab} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scroll: { flex: 1 },
  contentContainer: { paddingBottom: 40, backgroundColor: "#ffffff" },
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  bodyInner: {
    paddingTop: 10,
  },
  timelineWrap: {},
  timelineDateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingVertical: 2,
    paddingBottom: 8,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  timelineDateNavBtn: { padding: 2 },
  timelineDateNavLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    minWidth: 100,
    textAlign: "center",
  },
  stickyTabs: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
});
