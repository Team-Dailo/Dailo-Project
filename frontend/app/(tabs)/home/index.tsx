// app/(tabs)/home/index.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScrollView,
  View,
  Text,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { useHomePopularPosts } from "../../../hooks/useBoard";
import { useEventList } from "../../../hooks/useEvent";
import type { Event } from "../../../types/event";
import type { PopularEventItem } from "../../../services/event.service";
import { useAuth } from "../../../hooks/useAuth";
import { getDemoLocation } from "../../../services/demoLocationStorage";
import * as eventReminder from "../../../services/eventReminder.service";

const CAROUSEL_SIZE = 3;

/** 종료된 행사 여부 (종료일이 "오늘 날짜"보다 이전이면 true, 로컬 시간 기준) */
function isEventEnded(endAt: string | null | undefined): boolean {
  if (!endAt) return false;
  try {
    const end = new Date(endAt);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return end.getTime() < today.getTime();
  } catch {
    return false;
  }
}

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

function MarqueeBannerTitle({ text, style }: { text: string; style?: object }) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const shouldScroll = containerW > 0 && textW > containerW + 2;

  useEffect(() => {
    anim.current?.stop();
    translateX.setValue(0);
    if (!shouldScroll) return;

    const dist = textW - containerW + 24;
    const duration = Math.round((dist / 48) * 1000); // 48 px/s

    const run = () => {
      anim.current = Animated.sequence([
        Animated.delay(1400),
        Animated.timing(translateX, { toValue: -dist, duration, useNativeDriver: true }),
        Animated.delay(600),
        Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]);
      anim.current.start(({ finished }) => { if (finished) run(); });
    };
    run();
    return () => { anim.current?.stop(); };
  }, [shouldScroll, textW, containerW]);

  return (
    <View
      style={{ overflow: 'hidden' }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* 실제 텍스트 너비 측정용: width:9999로 줄바꿈 방지, onTextLayout으로 실제 렌더 폭 취득 */}
      <Text
        style={[style as any, { position: 'absolute', opacity: 0, width: 9999 }]}
        numberOfLines={1}
        onTextLayout={(e) => {
          const w = e.nativeEvent.lines[0]?.width;
          if (w) setTextW(w);
        }}
        pointerEvents="none"
      >
        {text}
      </Text>
      <Animated.Text
        style={[
          style as any,
          {
            transform: [{ translateX }],
            // 측정된 자연 너비로 명시 설정해야 numberOfLines={1}이 잘라내지 않음
            // 미측정 시(0)에는 undefined로 둬서 컨테이너 폭 기준으로 표시
            width: textW > 0 ? Math.ceil(textW) + 1 : undefined,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const { posts: popularPosts, loading: popularLoading } = useHomePopularPosts();
  // 캐러셀에서 D-Day 순 정렬을 위해 넉넉히 가져온 뒤, 종료된 행사 제거 + 상위 3개만 사용
  const { events: eventList, loading: eventListLoading, refetch: refetchEventList } = useEventList({ size: 100 });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const carouselIndexRef = useRef(0);
  const carouselIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 캐러셀: 행사 리스트에서 가져온 "종료되지 않은 행사"만 사용.
  // 정렬 기준: D-Day(가까운 순) 오름차순.
  const carouselItems: PopularEventItem[] = useMemo(() => {
    const list = (eventList ?? []).filter((e) => !isEventEnded(e.endAt));

    // Event → PopularEventItem 변환
    const source: PopularEventItem[] = list.map(toCarouselItem);

    // D-Day 가까운 순으로 정렬
    const sorted = [...source].sort((a, b) => {
      const da = getDaysLeft(a.startAt);
      const db = getDaysLeft(b.startAt);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });

    return sorted.slice(0, CAROUSEL_SIZE);
  }, [eventList]);

  /** 캐러셀 5초마다 다음 슬라이드로 자동 이동 (실기기에서 runAfterInteractions 지연 이슈 방지를 위해 setTimeout 사용) */
  useEffect(() => {
    carouselIndexRef.current = carouselIndex;
  }, [carouselIndex]);

  useEffect(() => {
    const items = carouselItems ?? [];
    if (items.length <= 1) return;
    const len = items.length;
    const startTimer = () => {
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
    };
    const timeoutId = setTimeout(startTimer, 400);
    return () => {
      clearTimeout(timeoutId);
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
    };
  }, [carouselItems?.length ?? 0]);

  useFocusEffect(
    useCallback(() => {
      refetchEventList();
    }, [refetchEventList])
  );

  const onCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / BANNER_WIDTH);
    carouselIndexRef.current = index;
    setCarouselIndex(index);
  }, []);

  const carouselLoading = eventListLoading;
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
            <Image
              source={require("../../../assets/images/splash-icon.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Dailo</Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => router.push('/notification-history' as any)}
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
                      <LinearGradient
                        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.75)"]}
                        locations={[0, 1]}
                        style={styles.bannerGradient}
                      />
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{formatDday(item.startAt)}</Text>
                      </View>
                      <View style={styles.bannerTextWrapper}>
                        <MarqueeBannerTitle text={item.title} style={styles.bannerTitle} />
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
                  {(() => {
                    const createdAt = (post as any).createdAt as string | undefined;
                    if (!createdAt) return null;
                    try {
                      const created = new Date(createdAt).getTime();
                      const now = Date.now();
                      const diffDays = (now - created) / (24 * 60 * 60 * 1000);
                      // 3일 이상 지난 글은 N 배지 숨김
                      if (diffDays >= 3) return null;
                    } catch {
                      return null;
                    }
                    return (
                      <View style={styles.postBadgeNew}>
                        <Text style={styles.postBadgeNewText}>N</Text>
                      </View>
                    );
                  })()}
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
              // 홈 탭에서는 기본적으로 이미 종료된 행사는 숨기고,
              // 오늘과 가장 가까운 시작일 순으로 정렬된 행사 중 3개만 노출
              (() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const activeEvents = eventList.filter((e: Event) => {
                  if (!e.endAt) return true;
                  try {
                    const endStr = e.endAt.slice(0, 10);
                    return endStr >= todayStr;
                  } catch {
                    return true;
                  }
                });
                const withDays = activeEvents.map((e) => {
                  try {
                    const start = new Date(e.startAt);
                    const today = new Date();
                    start.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const diff = start.getTime() - today.getTime();
                    const days = Math.round(diff / (24 * 60 * 60 * 1000));
                    return { event: e, daysUntil: Math.max(0, days) };
                  } catch {
                    return { event: e, daysUntil: Number.MAX_SAFE_INTEGER };
                  }
                });
                withDays.sort((a, b) => a.daysUntil - b.daysUntil);
                return withDays.slice(0, 3).map(({ event }) => {
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
                });
              })()
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
  logoIcon: {
    width: 36,
    height: 36,
    marginRight: 8,
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
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(76, 139, 245, 0.82)",
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
  },
  bannerTextWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
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
