// app/(tabs)/home/index.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  InteractionManager,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useHomePopularPosts } from "../../../hooks/useBoard";
import { useEventList, usePopularEvents } from "../../../hooks/useEvent";
import type { PopularEventItem } from "../../../services/event.service";
import type { Event } from "../../../types/event";
import { useAuth } from "../../../hooks/useAuth";
import { getDemoLocation } from "../../../services/demoLocationStorage";
import * as eventReminder from "../../../services/eventReminder.service";

const CAROUSEL_SIZE = 3;

function toCarouselItem(e: Event): PopularEventItem {
  return {
    id: Number(e.id),
    title: e.title,
    thumbnailUrl: e.thumbnailUrl ?? null,
    startAt: e.startAt ?? "",
    endAt: e.endAt ?? "",
    placeName: e.placeName ?? null,
  };
}
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;

function getDaysLeft(startAt: string): number | null {
  try {
    const start = new Date(startAt);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return diff;
  } catch {
    return null;
  }
}

function formatDday(startAt: string): string {
  const d = getDaysLeft(startAt);
  if (d === null) return "";
  if (d > 0) return `D-${d}`;
  if (d === 0) return "D-Day";
  return "종료";
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const { posts: popularPosts, loading: popularLoading } = useHomePopularPosts();
  const { events: eventList, loading: eventListLoading, refetch: refetchEventList } = useEventList({ size: 6 });
  const { events: popularEvents, loading: popularLoadingEvents, refetch: refetchPopular } = usePopularEvents(CAROUSEL_SIZE);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const carouselIndexRef = useRef(0);
  const carouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 캐러셀 5초마다 다음 슬라이드로 자동 이동 */
  useEffect(() => {
    carouselIndexRef.current = carouselIndex;
  }, [carouselIndex]);

  useEffect(() => {
    const items = carouselItems ?? [];
    if (items.length <= 1) return;
    const len = items.length;
    const cancel = InteractionManager.runAfterInteractions(() => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = setInterval(() => {
        const nextIndex = (carouselIndexRef.current + 1) % len;
        carouselIndexRef.current = nextIndex;
        setCarouselIndex(nextIndex);
        const list = carouselRef.current;
        if (list) {
          list.scrollToOffset({
            offset: nextIndex * BANNER_WIDTH,
            animated: true,
          });
        }
      }, 5000);
    });
    return () => {
      cancel.cancel();
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
    };
  }, [carouselItems?.length ?? 0]);

  useFocusEffect(
    useCallback(() => {
      refetchEventList();
      refetchPopular();
    }, [refetchEventList, refetchPopular])
  );

  const onCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / BANNER_WIDTH);
    carouselIndexRef.current = index;
    setCarouselIndex(index);
  }, []);

  // 캐러셀: 인기순 3개 있으면 사용, 없으면 행사 리스트에서 앞 3개 사용 (항상 3개 노출)
  const carouselItems: PopularEventItem[] = useMemo(() => {
    const popular = popularEvents ?? [];
    const list = eventList ?? [];
    if (popular.length >= CAROUSEL_SIZE) return popular.slice(0, CAROUSEL_SIZE);
    if (list.length > 0) {
      return list.slice(0, CAROUSEL_SIZE).map(toCarouselItem);
    }
    return popular;
  }, [popularEvents, eventList]);

  const carouselLoading = popularLoadingEvents && eventListLoading;
  const carouselEmpty = !carouselLoading && carouselItems.length === 0;

  const handleRegionAlarmPress = useCallback(async () => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "본인 지역 행사 알림은 로그인 후 이용할 수 있어요.");
      return;
    }
    let lat: number;
    let lng: number;
    const demo = await getDemoLocation();
    if (demo) {
      lat = demo.latitude;
      lng = demo.longitude;
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          Alert.alert("위치 권한", "본인 지역 행사 알림을 받으려면 위치 권한을 허용해 주세요.");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          mayShowUserSettingsDialog: false,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch {
        Alert.alert("위치 확인 실패", "위치를 가져올 수 없어요. 지도 탭에서 현재 위치를 설정해 보세요.");
        return;
      }
    }
    const result = await eventReminder.scheduleRegionEventReminders(lat, lng);
    if (result.ok) {
      await AsyncStorage.multiSet([
        ["@mypage/notification_event_reminder_region", "true"],
        ["@mypage/notification_event_reminder_region_key", result.regionKey],
      ]);
      Alert.alert(
        "알림 설정 완료",
        result.count > 0
          ? `${result.regionName} 지역 행사 ${result.count}건에 대해 1일 전 알림을 예약했어요.`
          : `${result.regionName} 지역에 예정된 행사가 없어요. 나중에 다시 시도해 주세요.`
      );
    } else {
      Alert.alert("알림 설정", result.message);
    }
  }, [isLoggedIn]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]} // 상단바와 겹치지 않게
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>Dailo</Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => router.push({ pathname: "/(tabs)/mypage/notification-settings", params: { from: "home" } })}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#111827"
              />
            </Pressable>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="search" size={20} color="#111827" />
            </Pressable>
          </View>
        </View>

        {/* 상단 캐러셀 (인기순 3개, 없으면 행사 리스트 앞 3개) */}
        <View style={styles.bannerWrapper}>
          {carouselLoading ? (
            <View style={[styles.bannerCard, styles.bannerPlaceholder]}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : carouselEmpty ? (
            <View style={[styles.bannerCard, styles.bannerPlaceholder]}>
              <Text style={styles.bannerEmpty}>등록된 행사가 없어요</Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={carouselRef}
                data={carouselItems}
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                getItemLayout={(_: unknown, index: number) => ({
                  length: BANNER_WIDTH,
                  offset: index * BANNER_WIDTH,
                  index,
                })}
                onMomentumScrollEnd={onCarouselScroll}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }: { item: PopularEventItem }) => (
                  <View style={{ width: BANNER_WIDTH }}>
                    <Pressable
                      style={[styles.bannerCard, styles.bannerCardCarousel]}
                      onPress={() => router.push(`/event/${item.id}?source=list`)}
                    >
                      <Image
                        source={{
                          uri: item.thumbnailUrl ?? "https://via.placeholder.com/700x380.png?text=Poster",
                        }}
                        style={styles.bannerImage}
                      />
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{formatDday(item.startAt)}</Text>
                      </View>
                      <View style={styles.bannerTextWrapper}>
                        <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.bannerSub} numberOfLines={1}>{item.placeName ?? "장소 미정"}</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              />
              {carouselItems.length > 1 && (
                <View style={styles.indicatorWrapper}>
                  {carouselItems.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.indicatorDot,
                        i === carouselIndex && styles.indicatorDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* 인기 게시물 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionTitleAccent}>인기</Text> 게시물
            </Text>
            <Pressable
              onPress={() => {
                (navigation as { navigate: (name: string, params?: object) => void }).navigate(
                  "board/index",
                  { sort: "popular" }
                );
              }}
            >
              <Text style={styles.sectionMore}>더 보기 &gt;</Text>
            </Pressable>
          </View>

          <View style={styles.postCard}>
            {popularLoading ? (
              <View style={styles.postCardLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            ) : popularPosts.length === 0 ? (
              <Text style={styles.postCardEmpty}>아직 게시글이 없어요</Text>
            ) : (
              popularPosts.map((post, index) => (
                <Pressable
                  key={post.id}
                  style={[styles.postRow, index !== 0 && styles.postRowDivider]}
                  onPress={() => router.push(`/board/${post.id}`)}
                >
                  <View style={styles.postLeft}>
                    <Text style={styles.postType}>{post.categoryType ?? "자유"} </Text>
                    <Text style={styles.postText} numberOfLines={1}>
                      {post.title?.trim() || post.contentPreview?.trim() || ""}
                    </Text>
                  </View>
                  <View style={styles.postBadgeNew}>
                    <Text style={styles.postBadgeNewText}>N</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* 행사 리스트 섹션 (GET /api/events) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Text style={styles.sectionTitleAccent}>행사</Text> 리스트
            </Text>
            <Pressable onPress={() => router.push("./home/event-list")}>
              <Text style={styles.sectionMore}>더 보기 &gt;</Text>
            </Pressable>
          </View>
          <View style={styles.eventCardList}>
            {eventListLoading ? (
              <View style={styles.eventCardLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            ) : eventList.length === 0 ? (
              <Text style={styles.eventCardEmpty}>등록된 행사가 없어요</Text>
            ) : (
              eventList.slice(0, 3).map((event) => {
                const dateStr = event.startAt
                  ? (() => {
                      try {
                        const d = new Date(event.startAt);
                        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}요일`;
                      } catch {
                        return "";
                      }
                    })()
                  : "";
                const timeStr =
                  event.startAt && event.endAt
                    ? (() => {
                        try {
                          const s = new Date(event.startAt);
                          const e = new Date(event.endAt);
                          return `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")} ~ ${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
                        } catch {
                          return "";
                        }
                      })()
                    : event.startAt
                      ? (() => {
                          try {
                            const d = new Date(event.startAt);
                            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ~`;
                          } catch {
                            return "";
                          }
                        })()
                      : "";
                const catLabel = { FESTIVAL: "축제", EXHIBITION: "전시", PERFORMANCE: "공연", EXPERIENCE_BOOTH: "체험부스", FOOD_TRUCK: "푸드트럭", TRAFFIC: "교통", CONSTRUCTION: "공사", ETC: "기타" }[event.category] ?? "기타";
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
                      <Text style={styles.eventCategory}>{catLabel}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <View style={styles.eventMeta}>
                        {dateStr ? <Text style={styles.eventDate}>{dateStr}</Text> : null}
                        {timeStr ? <Text style={styles.eventTime}>{timeStr}</Text> : null}
                      </View>
                      <View style={styles.eventCardFooter}>
                        <View style={styles.eventCardFooterCenter}>
                          <Text style={styles.detailButtonText}>자세히 보기</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },

  /* 헤더 */
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4C8BF5",
    marginRight: 6,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  /* 배너 */
  bannerWrapper: {
    paddingHorizontal: 16,
  },
  bannerCard: {
    borderRadius: CARD_RADIUS,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
    marginHorizontal: 16,
  },
  bannerCardCarousel: {
    marginHorizontal: 0,
  },
  bannerPlaceholder: {
    minHeight: 184,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerEmpty: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  bannerImage: {
    width: "100%",
    aspectRatio: 343 / 184,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#4C8BF5",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
  },
  bannerTextWrapper: {
    position: "absolute",
    left: 16,
    bottom: 22,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },
  bannerSub: {
    marginTop: 4,
    color: "#F9FAFB",
    fontSize: 12,
  },
  bannerDate: {
    marginTop: 2,
    color: "#E5E7EB",
    fontSize: 11,
  },
  indicatorWrapper: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 3,
  },
  indicatorDotActive: {
    width: 10,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },

  /* 공통 섹션 */
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
  sectionTitleAccent: {
    color: "#4C8BF5",
  },
  sectionMore: {
    fontSize: 12,
    color: "#6B7280",
  },

  /* 인기 게시물 카드 */
  postCard: {
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  postCardLoading: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  postCardEmpty: {
    paddingVertical: 24,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  postRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  postLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  postType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginRight: 10,
  },
  postText: {
    fontSize: 13,
    color: "#4B5563",
    flexShrink: 1,
  },
  postBadgeNew: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F97373",
    justifyContent: "center",
    alignItems: "center",
  },
  postBadgeNewText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },

  /* 행사 카드 리스트 (회색선만 위·아래, 직사각형, 그림자 없음) */
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
