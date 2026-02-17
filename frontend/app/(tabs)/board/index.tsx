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
};

const CATEGORIES = ["전체", "후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

function toPost(item: { id: number; authorId?: number; author_id?: number; authorNickname?: string; title: string; contentPreview?: string; content?: string; categoryType?: string; likeCount: number; commentCount: number; createdAt: string }): Post {
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
  // API 응답의 작성자 닉네임 (camelCase·snake_case 모두 처리)
  const apiNickname = (raw.authorNickname ?? raw.author_nickname ?? item.authorNickname ?? "") as string;
  const authorName = (typeof apiNickname === "string" ? apiNickname.trim() : "") || `user_${authorId}`;
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
  const [sortType, setSortType] = useState<"latest" | "popular">(
    () => (sortParam === "popular" ? "popular" : "latest")
  );
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  const { posts: apiPosts, loading, error, refetch } = usePostList(selectedCategory, sortType);
  const sortedPosts = useMemo(() => apiPosts.map(toPost), [apiPosts]);

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
    Alert.alert("신고", "해당 게시물을 신고하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "신고", style: "destructive", onPress: () => Alert.alert("완료", "신고 접수되었습니다.") },
    ]);
  };

  const handleBlock = (postId: string) => {
    setMenuPostId(null);
    Alert.alert("차단", "이 사용자를 차단하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "차단", style: "destructive" },
    ]);
  };

  const handleEdit = (postId: string) => {
    setMenuPostId(null);
    router.push({ pathname: "/board/write", params: { edit: postId } });
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
          {item.content ? (
            <Text style={styles.postPreview} numberOfLines={2} ellipsizeMode="tail">
              {item.content}
            </Text>
          ) : null}
          <View style={styles.postRowFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
              <Text style={styles.footerText}>{item.likes}</Text>
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
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push("/board/chat")} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-outline" size={22} color="#111827" />
            </Pressable>
          </View>
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
                  onPress={() => setSelectedCategory(cat)}
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

          {/* 정렬 탭 */}
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
          </View>

          {/* 게시글 리스트 - 좌우 여백 없이 전체 너비 */}
          <View style={styles.listWrap}>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#2563EB" />
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

      {/* 게시글 ⋯ 메뉴: 신고, 차단, 링크 복사 */}
      <Modal visible={!!menuPostId} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuPostId(null)}>
          <View style={styles.menuCard}>
            {menuPostId &&
              myUserId != null &&
              sortedPosts.find((p) => p.id === menuPostId && p.authorId === myUserId) && (
                <Pressable style={styles.menuItem} onPress={() => handleEdit(menuPostId)}>
                  <Text style={styles.menuText}>수정</Text>
                </Pressable>
              )}
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleReport(menuPostId)}>
              <Text style={styles.menuText}>신고</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleBlock(menuPostId)}>
              <Text style={styles.menuText}>차단</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleCopyLink(menuPostId)}>
              <Text style={styles.menuText}>링크 복사</Text>
            </Pressable>
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
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#2563EB", borderRadius: 8 },
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
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
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
    gap: 16,
    marginBottom: 12,
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
