// frontend/app/event/[id].tsx
import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Platform,
  ToastAndroid,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
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

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useAuth();
  const { id, source, tab: tabParam } = useLocalSearchParams<{
    id: string;
    source?: string;
    tab?: string;
  }>();
  const { detail: event, loading, error, refetch: refetchDetail } = useEventDetail(id, source ?? "detail");
  const initialTab: TabKey =
    tabParam === "booths"
      ? "booths"
      : tabParam === "timeline"
        ? "timeline"
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

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [isLiked, setIsLiked] = useState(false);

  const eventIdNum = id ? Number(id) : NaN;
  const hasValidId = Number.isFinite(eventIdNum);

  useEffect(() => {
    setIsLiked(event?.isLiked ?? false);
  }, [event?.isLiked]);

  const handleLike = useCallback(async () => {
    if (!hasValidId) return;
    try {
      const res = await eventService.toggleEventLike(eventIdNum);
      setIsLiked(res.liked);
      if (Platform.OS === "android") {
        ToastAndroid.show(res.liked ? "좋아요" : "좋아요 취소", ToastAndroid.SHORT);
      } else {
        Alert.alert(res.liked ? "좋아요" : "좋아요 취소");
      }
      refetchDetail();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "처리에 실패했습니다.";
      if (Platform.OS === "android") {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert("알림", msg);
      }
    }
  }, [hasValidId, eventIdNum, refetchDetail]);

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
  }, [id]);

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
          event={event}
          loading={loading}
          error={error}
          onSave={handleSave}
          isLiked={isLiked}
          onLike={handleLike}
          isLoggedIn={isLoggedIn}
        />

        <View
          style={styles.tabsWrapper}
          onLayout={(e) => setTabsOffsetY(e.nativeEvent.layout.y)}
        >
          <EventDetailTabs value={tab} onChange={handleChangeTab} />
        </View>

        <View style={styles.body}>
          {tab === "news" && (
            <EventNewsTab
              news={extra.news}
              eventId={event?.id != null ? Number(event.id) : undefined}
            />
          )}
          {tab === "timeline" && (
            <Timeline dateLabel={timelineDateLabel} items={extra.timeline} />
          )}
          {tab === "booths" && (
            <EventBoothTab
              eventId={event?.id != null ? Number(event.id) : undefined}
              eventTitle={event?.title ?? ""}
              foodBooths={extra.foodBooths}
              experienceBooths={extra.experienceBooths}
            />
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
    paddingTop: 20,
    paddingBottom: 20,
    minHeight: SCREEN_HEIGHT * 0.5,
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
