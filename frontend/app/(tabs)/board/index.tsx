// app/(tabs)/board/index.tsx
import React, { useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Modal,
  Alert,
  Share,
  Image,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { usePostList } from "../../../hooks/useBoard";
import { formatRelativeTime } from "../../../utils/formatDate";
import { useAuthContext, useMyUserId } from "../../../hooks/useAuth";
import type { PostListItem } from "../../../types/board";
import { getEventList } from "../../../services/event.service";
import * as reportService from "../../../services/report.service";
import * as blockService from "../../../services/block.service";
import * as savedPostService from "../../../services/savedPost.service";
import * as boardService from "../../../services/board.service";

type Post = {
  id: string;
  authorId: number;
  author: string;
  title?: string;
  time: string;
  tag?: string;
  content: string;
  likes: number;
  comments: number;
  scraps: number;
  imageUri?: string;
  liked?: boolean;
  /** 후기 카테고리일 때 연관 행사 제목 */
  eventTitle?: string | null;
};

const CATEGORIES = ["전체", "후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

/** 후기 탭에서 행사별 필터용 */
type EventFilter = { eventId: number; eventTitle: string } | null;

function toPost(item: { id: number; authorId?: number; author_id?: number; authorNickname?: string; title: string; contentPreview?: string; content?: string; categoryType?: string; likeCount: number; commentCount: number; createdAt: string; liked?: boolean; imageUrls?: string[]; eventTitle?: string | null; event_title?: string | null }): Post {
  const raw = item as Record<string, unknown>;
  const authorId = Number(raw.author_id ?? item.authorId ?? raw.authorId ?? 0) || 0;
  const preview = (
    raw.contentPreview ??
    raw.content_preview ??
    raw.content ??
    item.contentPreview ??
    item.content
  ) as string | undefined;
  let contentStr = typeof preview === "string" ? preview.trim() : "";
  if (contentStr.length > 120) contentStr = contentStr.slice(0, 120) + "…";
  const apiNickname = (raw.authorNickname ?? raw.author_nickname ?? item.authorNickname ?? "") as string;
  const authorName = (typeof apiNickname === "string" ? apiNickname.trim() : "") || `user_${authorId}`;
  const urls = (raw.imageUrls ?? item.imageUrls ?? raw.image_urls) as string[] | undefined;
  const firstImage = Array.isArray(urls) && urls.length > 0 ? urls[0] : undefined;
  const eventTitle = (raw.eventTitle ?? item.eventTitle ?? raw.event_title ?? item.event_title) as string | null | undefined;
  return {
    id: String(item.id),
    authorId,
    author: authorName,
    title: item.title,
    time: formatRelativeTime(item.createdAt),
    tag: item.categoryType ?? "",
    content: contentStr,
    likes: item.likeCount ?? 0,
    comments: item.commentCount ?? 0,
    scraps: 0,
    imageUri: firstImage,
    liked: raw.liked as boolean | undefined ?? item.liked,
    eventTitle: eventTitle ?? null,
  };
}

export default function BoardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthContext();
  const myUserId = useMyUserId();
  const searchParams = useLocalSearchParams<{ sort?: string }>();
  const route = useRoute();
  const routeParams = route.params as { sort?: string } | undefined;
  const sortParam = searchParams.sort ?? routeParams?.sort;

  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [selectedEventFilter, setSelectedEventFilter] = useState<EventFilter>(null);
  const [sortType, setSortType] = useState<"latest" | "popular">(
    () => (sortParam === "popular" ? "popular" : "latest")
  );
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  /** 후기 탭: 1년 이내 행사 목록, 월별 그룹 (eventId, eventTitle, startAt for grouping) */
  const [eventsByMonth, setEventsByMonth] = useState<{ monthLabel: string; events: { eventId: number; eventTitle: string }[] }[]>([]);
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [eventPickerRegion, setEventPickerRegion] = useState<string>("전체");
  const [eventPickerRegions, setEventPickerRegions] = useState<string[]>([]);
  /** 모달 내 왼쪽 월 선택: null = 전체, '2월' 등 = 해당 월만 */
  const [eventPickerSelectedMonthLabel, setEventPickerSelectedMonthLabel] = useState<string | null>(null);

  const reviewEventId =
    selectedCategory === "후기" && selectedEventFilter != null ? selectedEventFilter.eventId : undefined;
  const { posts: apiPosts, loading, error, refetch } = usePostList(
    selectedCategory,
    sortType,
    reviewEventId
  );
  const sortedPosts = useMemo(() => apiPosts.map(toPost), [apiPosts]);

  // 후기 탭일 때 1년 이내 행사 로드 → 월별 그룹 (지역 필터는 regionName 있으면 적용)
  useFocusEffect(
    React.useCallback(() => {
      if (selectedCategory !== "후기") return;
      getEventList({ page: 1, size: 200 })
        .then((list) => {
          const now = Date.now();
          const oneYearLater = now + 365 * 24 * 60 * 60 * 1000;
          const inRange = list.filter((e) => {
            const start = e.startAt ? new Date(e.startAt).getTime() : 0;
            if (!Number.isFinite(start)) return false;
            return start >= now && start <= oneYearLater;
          });
          const regions = new Set<string>();
          inRange.forEach((e) => {
            const r = (e as { regionName?: string }).regionName?.trim();
            if (r) regions.add(r);
          });
          setEventPickerRegions(["전체", ...Array.from(regions).sort()]);

          const filtered =
            eventPickerRegion === "전체"
              ? inRange
              : inRange.filter((e) => (e as { regionName?: string }).regionName?.trim() === eventPickerRegion);

          const byMonth = new Map<string, { eventId: number; eventTitle: string }[]>();
          for (const e of filtered) {
            const eventId = Number(e.id) || 0;
            if (eventId <= 0) continue;
            const start = e.startAt ? new Date(e.startAt) : null;
            const key = start && !isNaN(start.getTime())
              ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`
              : "9999-12";
            if (!byMonth.has(key)) byMonth.set(key, []);
            byMonth.get(key)!.push({ eventId, eventTitle: e.title || `행사 #${e.id}` });
          }
          const sortedKeys = Array.from(byMonth.keys()).sort();
          const monthLabels: Record<string, string> = {};
          const thisYear = new Date().getFullYear();
          for (const key of sortedKeys) {
            const [y, m] = key.split("-").map(Number);
            monthLabels[key] = y !== thisYear ? `${y}년 ${m}월` : `${m}월`;
          }
          setEventsByMonth(
            sortedKeys.map((key) => ({
              monthLabel: monthLabels[key] ?? key,
              events: byMonth.get(key) ?? [],
            }))
          );
        })
        .catch(() => setEventsByMonth([]));
    }, [selectedCategory, eventPickerRegion])
  );

  // 홈 인기 게시물 "더보기"로 진입 시에만 인기순 적용, 적용 후 파라미터 제거해 최신글 선택이 유지되도록
  useFocusEffect(
    React.useCallback(() => {
      if (sortParam === "popular") {
        setSortType("popular");
        (navigation as { setParams: (p: object) => void }).setParams({ sort: undefined });
      }
      refetch();
    }, [refetch, sortParam, navigation])
  );

  const handleCopyLink = async (postId: string) => {
    setMenuPostId(null);
    const link = `https://dailo.app/board/${postId}`;
    try {
      const result = await Share.share({
        message: link,
        title: "게시물 링크",
        url: link,
      });
      if (result?.action === Share.sharedAction) return;
    } catch {
      Alert.alert(
        "링크 공유",
        "공유할 수 없을 때는 링크를 복사해서 사용하세요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "링크 복사",
            onPress: async () => {
              await Clipboard.setStringAsync(link);
              Alert.alert("복사됨", "링크가 클립보드에 복사되었습니다.");
            },
          },
        ]
      );
    }
  };

  const handleReport = (postId: string) => {
    setMenuPostId(null);
    const reasons: { title: string; reason: reportService.ReportReason }[] = [
      { title: "스팸", reason: "SPAM" },
      { title: "욕설/혐오", reason: "ABUSE" },
      { title: "부적절한 내용", reason: "INAPPROPRIATE" },
      { title: "기타", reason: "OTHER" },
    ];
    Alert.alert(
      "신고",
      "신고 사유를 선택해 주세요.",
      [
        { text: "취소", style: "cancel" },
        ...reasons.map((r) => ({
          text: r.title,
          onPress: async () => {
            try {
              await reportService.createReport({
                targetType: "POST",
                targetId: Number(postId),
                reason: r.reason,
              });
              Alert.alert("완료", "신고가 접수되었습니다.");
            } catch {
              Alert.alert("오류", "신고 접수에 실패했습니다.");
            }
          },
        })),
      ]
    );
  };

  const handleBlock = (postId: string) => {
    setMenuPostId(null);
    const post = sortedPosts.find((p) => p.id === postId);
    const authorId = post?.authorId;
    if (authorId == null || authorId <= 0) return;
    Alert.alert("차단", "이 사용자를 차단하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            await blockService.blockUser(authorId);
            Alert.alert("차단됨", "사용자를 차단했습니다.");
            refetch();
          } catch {
            Alert.alert("오류", "차단에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleEdit = (postId: string) => {
    setMenuPostId(null);
    router.push({ pathname: "/board/write", params: { edit: postId } });
  };

  const handleSaveFromList = async (postId: string) => {
    const post = sortedPosts.find((p) => p.id === postId);
    setMenuPostId(null);
    if (!post) return;
    try {
      const added = await savedPostService.toggleSavedPost(
        Number(postId),
        post.title ?? "",
        undefined
      );
      Alert.alert(added ? "저장됨" : "저장 해제", added ? "게시글을 저장했습니다." : "저장을 해제했습니다.");
    } catch {
      Alert.alert("오류", "저장 처리에 실패했습니다.");
    }
  };

  const handleDeleteFromList = (postId: string) => {
    const post = sortedPosts.find((p) => p.id === postId);
    if (!post) return;
    Alert.alert("삭제", "이 게시글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setMenuPostId(null);
          try {
            await boardService.deletePost(postId);
            Alert.alert("완료", "삭제되었습니다.");
            refetch();
          } catch {
            Alert.alert("오류", "삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const renderPost = ({ item }: { item: Post }) => {
    return (
      <Pressable style={styles.postRow} onPress={() => router.push(`/board/${item.id}`)}>
        <View style={styles.postRowBody}>
          <View style={styles.postRowTop}>
            <Text style={styles.author}>{item.author}</Text>
            {item.tag && (
              <View style={styles.tagBadge}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            )}
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          {item.title ? (
            <Text style={styles.postTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
          ) : null}
          {item.tag === "후기" && item.eventTitle ? (
            <View style={styles.eventTitleRow}>
              <Ionicons name="calendar-outline" size={12} color="#4C8BF5" />
              <Text style={styles.eventTitleText} numberOfLines={1} ellipsizeMode="tail">
                {item.eventTitle}
              </Text>
            </View>
          ) : null}
          {item.content ? (
            <Text style={styles.postPreview} numberOfLines={2} ellipsizeMode="tail">
              {item.content}
            </Text>
          ) : null}
          <View style={styles.postRowFooter}>
            <View style={styles.footerItem}>
              <Ionicons name={item.liked ? "heart" : "heart-outline"} size={14} color={item.liked ? "#EF4444" : "#9CA3AF"} />
              <Text style={[styles.footerText, item.liked && { color: "#EF4444" }]}>{item.likes}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#9CA3AF" />
              <Text style={styles.footerText}>{item.comments}</Text>
            </View>
          </View>
        </View>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.postThumbnail} />
        ) : null}
        <Pressable
          style={styles.dotsBtn}
          onPress={(e) => {
            e.stopPropagation();
            setMenuPostId(item.id);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>게시판</Text>
          {/* 채팅하기 아이콘 주석 처리
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push("/board/chat")} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-outline" size={22} color="#111827" />
            </Pressable>
          </View>
          */}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 공지 카드 */}
          <Pressable style={styles.noticeCard} onPress={() => router.push("/board/notice")}>
            <View style={styles.noticeRow}>
              <Text style={styles.noticeTitle}>공지사항</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
            <Text style={styles.noticeText} numberOfLines={2} ellipsizeMode="tail">
              [공지사항] 이번 주 서버 점검 안내드립니다...
            </Text>
          </Pressable>

          {/* 카테고리 탭 */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setSelectedCategory(cat);
                    if (cat !== "후기") setSelectedEventFilter(null);
                  }}
                  style={[
                    styles.categoryChip,
                    selected && styles.categoryChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 정렬 탭 + 후기일 때 현재 열린 축제 선택 */}
          <View style={styles.sortRow}>
            <Pressable onPress={() => setSortType("latest")}>
              <Text
                style={[
                  styles.sortText,
                  sortType === "latest" && styles.sortTextSelected,
                ]}
              >
                최신글
              </Text>
            </Pressable>
            <Pressable onPress={() => setSortType("popular")}>
              <Text
                style={[
                  styles.sortText,
                  sortType === "popular" && styles.sortTextSelected,
                ]}
              >
                인기글
              </Text>
            </Pressable>
            {selectedCategory === "후기" && (
              <Pressable
                style={styles.eventSelectButton}
                onPress={() => setEventPickerVisible(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="#6B7280"
                />
                <Text
                  style={styles.eventSelectButtonText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedEventFilter
                    ? selectedEventFilter.eventTitle
                    : "축제 선택"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </Pressable>
            )}
          </View>

          {/* 축제 선택 모달: 왼쪽 월(전체/2월/3월…), 오른쪽 해당 월 행사 목록 */}
          <Modal
            visible={eventPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setEventPickerVisible(false)}
          >
            <Pressable
              style={styles.eventPickerBackdrop}
              onPress={() => setEventPickerVisible(false)}
            >
              <Pressable style={styles.eventPickerBox} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.eventPickerTitle}>행사 선택 (1년 이내)</Text>
                {eventPickerRegions.length > 1 && (
                  <View style={styles.eventPickerRegionRow}>
                    <Text style={styles.eventPickerRegionLabel}>지역</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.eventPickerRegionScroll}
                    >
                      {eventPickerRegions.map((reg) => {
                        const sel = eventPickerRegion === reg;
                        return (
                          <Pressable
                            key={reg}
                            style={[styles.eventPickerRegionChip, sel && styles.eventPickerRegionChipSelected]}
                            onPress={() => setEventPickerRegion(reg)}
                          >
                            <Text
                              style={[styles.eventPickerRegionChipText, sel && styles.eventPickerRegionChipTextSelected]}
                              numberOfLines={1}
                            >
                              {reg}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                <View style={styles.eventPickerRow}>
                  {/* 왼쪽: 전체 + 2월, 3월, ... */}
                  <ScrollView
                    style={styles.eventPickerMonthColumn}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <Pressable
                      style={[
                        styles.eventPickerMonthTab,
                        eventPickerSelectedMonthLabel === null && styles.eventPickerMonthTabSelected,
                      ]}
                      onPress={() => setEventPickerSelectedMonthLabel(null)}
                    >
                      <Text
                        style={[
                          styles.eventPickerMonthTabText,
                          eventPickerSelectedMonthLabel === null && styles.eventPickerMonthTabTextSelected,
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        전체
                      </Text>
                    </Pressable>
                    {eventsByMonth.map(({ monthLabel }) => (
                      <Pressable
                        key={monthLabel}
                        style={[
                          styles.eventPickerMonthTab,
                          eventPickerSelectedMonthLabel === monthLabel && styles.eventPickerMonthTabSelected,
                        ]}
                        onPress={() => setEventPickerSelectedMonthLabel(monthLabel)}
                      >
                        <Text
                          style={[
                            styles.eventPickerMonthTabText,
                            eventPickerSelectedMonthLabel === monthLabel && styles.eventPickerMonthTabTextSelected,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {monthLabel}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  {/* 오른쪽: 선택한 월의 행사 목록 (맨 위 "전체" = 필터 해제) */}
                  {(() => {
                    const eventsForMonth =
                      eventPickerSelectedMonthLabel === null
                        ? eventsByMonth.flatMap((m) => m.events)
                        : eventsByMonth.find((m) => m.monthLabel === eventPickerSelectedMonthLabel)?.events ?? [];
                    return (
                      <ScrollView
                        style={styles.eventPickerContentScroll}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled
                      >
                        <Pressable
                          style={[
                            styles.eventPickerItem,
                            selectedEventFilter === null && styles.eventPickerItemSelected,
                          ]}
                          onPress={() => {
                            setSelectedEventFilter(null);
                            setEventPickerVisible(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.eventPickerItemText,
                              selectedEventFilter === null && styles.eventPickerItemTextSelected,
                            ]}
                          >
                            전체
                          </Text>
                        </Pressable>
                        {eventsForMonth.map((ev) => {
                          const selected = selectedEventFilter?.eventId === ev.eventId;
                          return (
                            <Pressable
                              key={ev.eventId}
                              style={[
                                styles.eventPickerItem,
                                selected && styles.eventPickerItemSelected,
                              ]}
                              onPress={() => {
                                setSelectedEventFilter({
                                  eventId: ev.eventId,
                                  eventTitle: ev.eventTitle,
                                });
                                setEventPickerVisible(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.eventPickerItemText,
                                  selected && styles.eventPickerItemTextSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {ev.eventTitle}
                              </Text>
                            </Pressable>
                          );
                        })}
                        {eventsForMonth.length === 0 && (
                          <Text style={styles.eventPickerEmpty}>
                            {eventPickerSelectedMonthLabel === null
                              ? "1년 이내 예정된 행사가 없습니다."
                              : "해당 월 행사가 없습니다."}
                          </Text>
                        )}
                      </ScrollView>
                    );
                  })()}
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          {/* 게시글 리스트 - 좌우 여백 없이 전체 너비 */}
          <View style={styles.listWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#4C8BF5" />
                <Text style={styles.loadingText}>불러오는 중...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorWrap}>
                <Text style={styles.errorText}>목록을 불러올 수 없습니다.</Text>
                <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                  <Text style={styles.retryText}>다시 시도</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={sortedPosts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* 글쓰기 플로팅 버튼 (파란 동그라미) */}
        <Pressable style={styles.fab} onPress={() => router.push("/board/write")}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 게시글 ⋯ 메뉴: 본인글 → 저장, 수정, 삭제(빨간색) / 타인글 → 저장, 신고, 차단 */}
      <Modal visible={!!menuPostId} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuPostId(null)}>
          <View style={styles.menuCard}>
            {(() => {
              const menuPost = menuPostId ? sortedPosts.find((p) => p.id === menuPostId) : null;
              const isMyPost = !!menuPost && myUserId != null && menuPost.authorId === myUserId;
              if (isMyPost) {
                return (
                  <>
                    <Pressable style={styles.menuItem} onPress={() => menuPostId && handleSaveFromList(menuPostId)}>
                      <Text style={styles.menuText}>저장</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => menuPostId && handleEdit(menuPostId)}>
                      <Text style={styles.menuText}>수정</Text>
                    </Pressable>
                    <Pressable style={styles.menuItem} onPress={() => menuPostId && handleDeleteFromList(menuPostId)}>
                      <Text style={[styles.menuText, styles.menuTextDanger]}>삭제</Text>
                    </Pressable>
                  </>
                );
              }
              return (
                <>
                  <Pressable style={styles.menuItem} onPress={() => menuPostId && handleSaveFromList(menuPostId)}>
                    <Text style={styles.menuText}>저장</Text>
                  </Pressable>
                  <Pressable style={styles.menuItem} onPress={() => menuPostId && handleReport(menuPostId)}>
                    <Text style={styles.menuText}>신고</Text>
                  </Pressable>
                  <Pressable style={styles.menuItem} onPress={() => menuPostId && handleBlock(menuPostId)}>
                    <Text style={styles.menuText}>차단</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </Pressable>
      </Modal>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  listWrap: {
    marginHorizontal: -24,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  noticeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noticeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  noticeText: {
    fontSize: 13,
    color: "#6B7280",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  categoryChipSelected: {
    backgroundColor: "#4C8BF5",
    borderColor: "#4C8BF5",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  eventSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "transparent",
    maxWidth: 160,
    marginLeft: "auto",
  },
  eventSelectButtonText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    flex: 1,
  },
  eventPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  eventPickerBox: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  eventPickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  eventPickerRegionRow: {
    marginBottom: 12,
  },
  eventPickerRegionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  eventPickerRegionScroll: {
    flexDirection: "row",
    gap: 8,
  },
  eventPickerRegionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventPickerRegionChipSelected: {
    backgroundColor: "#374151",
    borderColor: "#374151",
  },
  eventPickerRegionChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  eventPickerRegionChipTextSelected: {
    color: "#F3F4F6",
  },
  eventPickerRow: {
    flexDirection: "row",
    maxHeight: 320,
    marginTop: 4,
  },
  eventPickerMonthColumn: {
    width: 40,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  eventPickerMonthTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
    borderRadius: 6,
  },
  eventPickerMonthTabSelected: {
    backgroundColor: "#E5E7EB",
  },
  eventPickerMonthTabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  eventPickerMonthTabTextSelected: {
    color: "#111827",
    fontWeight: "700",
  },
  eventPickerContentScroll: {
    flex: 1,
  },
  eventPickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    minWidth: 0,
  },
  eventPickerItemSelected: {
    backgroundColor: "#F3F4F6",
  },
  eventPickerItemText: {
    fontSize: 15,
    color: "#111827",
  },
  eventPickerItemTextSelected: {
    color: "#111827",
    fontWeight: "600",
  },
  eventPickerEmpty: {
    fontSize: 14,
    color: "#9CA3AF",
    paddingVertical: 12,
  },
  sortText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  sortTextSelected: {
    color: "#111827",
    fontWeight: "600",
  },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  postRowBody: { flex: 1, minWidth: 0, marginRight: 8 },
  postThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  postRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F3F4FF",
  },
  tagText: {
    fontSize: 11,
    color: "#4F46E5",
    fontWeight: "500",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  eventTitleText: {
    fontSize: 12,
    color: "#4C8BF5",
    flex: 1,
  },
  postPreview: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  postRowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  dotsBtn: { padding: 8, margin: -8 },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 20 },
  menuText: { fontSize: 15, color: "#111827" },
  menuTextDanger: { color: "#DC2626" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4C8BF5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
