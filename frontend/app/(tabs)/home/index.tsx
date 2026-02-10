// app/(tabs)/home/index.tsx

import React from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHomePopularPosts } from "../../../hooks/useBoard";
import { useEventList, useTopClickedEvents } from "../../../hooks/useEvent";

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { posts: popularPosts, loading: popularLoading } = useHomePopularPosts();
  const { events: eventList, loading: eventListLoading } = useEventList({ size: 6 });
  const { events: topClickedEvents, loading: topClickedLoading } = useTopClickedEvents(5);

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
            <Pressable style={styles.headerIconBtn}>
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

        {/* 상단 배너 */}
        <View style={styles.bannerWrapper}>
          <View style={styles.bannerCard}>
            <Image
              source={{
                uri: "https://via.placeholder.com/700x380.png?text=Festival+Banner",
              }}
              style={styles.bannerImage}
            />

            {/* D-Day 뱃지 */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>D-5</Text>
            </View>

            {/* 텍스트 오버레이 */}
            <View style={styles.bannerTextWrapper}>
              <Text style={styles.bannerTitle}>Lucide Dream</Text>
              <Text style={styles.bannerSub}>한국교통대학교</Text>
              <Text style={styles.bannerDate}>2025.9.23 ~ 9.24</Text>
            </View>

            {/* 인디케이터 점 */}
            <View style={styles.indicatorWrapper}>
              <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
              <View style={styles.indicatorDot} />
              <View style={styles.indicatorDot} />
            </View>
          </View>
        </View>

        {/* 인기 게시물 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>인기 게시물</Text>
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

        {/* 인기 행사 섹션 (클릭 로그 기반) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>인기 행사</Text>
            <Pressable onPress={() => router.push("./home/event-list")}>
              <Text style={styles.sectionMore}>더 보기 &gt;</Text>
            </Pressable>
          </View>
          <View style={styles.eventCardList}>
            {topClickedLoading ? (
              <View style={styles.eventCardLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            ) : topClickedEvents.length === 0 ? (
              <Text style={styles.eventCardEmpty}>아직 인기 행사가 없어요</Text>
            ) : (
              topClickedEvents.slice(0, 3).map((event) => {
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
                const timeStr = event.startAt
                  ? (() => {
                      try {
                        const d = new Date(event.startAt);
                        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ~`;
                      } catch {
                        return "";
                      }
                    })()
                  : "";
                return (
                  <Pressable
                    key={event.id}
                    style={styles.eventCard}
                    onPress={() => router.push(`/event/${event.id}?source=list`)}
                  >
                    <Image
                      source={{
                        uri: event.posterUrls?.[0] ?? "https://via.placeholder.com/200x300.png?text=Poster",
                      }}
                      style={styles.eventImage}
                    />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventCategory}>
                        {event.categories?.[0] ?? "공연"}
                      </Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <View style={styles.eventMeta}>
                        {dateStr ? <Text style={styles.eventDate}>{dateStr}</Text> : null}
                        {timeStr ? <Text style={styles.eventTime}>{timeStr}</Text> : null}
                      </View>
                      <View style={styles.eventCardFooter}>
                        <Text style={styles.detailButtonText}>자세히 보기</Text>
                        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* 행사 리스트 섹션 (GET /api/events) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>행사 리스트</Text>
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
                const timeStr = event.startAt
                  ? (() => {
                      try {
                        const d = new Date(event.startAt);
                        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ~`;
                      } catch {
                        return "";
                      }
                    })()
                  : "";
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
                      <Text style={styles.eventCategory}>{event.category ?? "공연"}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <View style={styles.eventMeta}>
                        {dateStr ? <Text style={styles.eventDate}>{dateStr}</Text> : null}
                        {timeStr ? <Text style={styles.eventTime}>{timeStr}</Text> : null}
                      </View>
                      <View style={styles.eventCardFooter}>
                        <Text style={styles.detailButtonText}>자세히 보기</Text>
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
    backgroundColor: "#2563EB",
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
    backgroundColor: "#2563EB",
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

  /* 행사 카드 리스트 */
  eventCardList: {
    gap: 12,
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
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  eventImage: {
    width: 96,
    minWidth: 96,
    aspectRatio: 2 / 3,
    borderRadius: 10,
    marginRight: 14,
    backgroundColor: "#E5E7EB",
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
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
    marginBottom: 8,
  },
  eventMeta: {
    gap: 2,
    marginBottom: 10,
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
    justifyContent: "center",
    gap: 4,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
