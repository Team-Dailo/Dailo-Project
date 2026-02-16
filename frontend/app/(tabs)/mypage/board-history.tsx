// app/(tabs)/mypage/board-history.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useAuthContext } from "../../../contexts/AuthContext";
import { useMyUserId } from "../../../hooks/useAuth";
import { useMyPostList } from "../../../hooks/useBoard";
import { formatRelativeTime } from "../../../utils/formatDate";
import type { PostListItem } from "../../../types/board";
import * as authService from "../../../services/auth.service";
import * as boardService from "../../../services/board.service";

type PostRow = {
  id: string;
  author: string;
  title?: string;
  time: string;
  tag?: string;
  content: string;
  likes: number;
  comments: number;
};

function toPostRow(item: PostListItem): PostRow {
  const raw = item as Record<string, unknown>;
  // 내용 미리보기는 본문만 사용 (제목 fallback 시 제목이 두 번 보이는 문제 방지)
  const preview = (raw.contentPreview ?? raw.content_preview ?? item.contentPreview ?? "") as string;
  let contentStr = typeof preview === "string" ? preview.trim() : "";
  if (contentStr.length > 120) contentStr = contentStr.slice(0, 120) + "…";
  const authorName = (item.authorNickname ?? (raw.author_nickname as string) ?? (raw.authorNickname as string) ?? "").trim() || `user_${item.authorId}`;
  return {
    id: String(item.id),
    author: authorName,
    title: item.title,
    time: formatRelativeTime(item.createdAt),
    tag: item.categoryType ?? "",
    content: contentStr,
    likes: item.likeCount ?? 0,
    comments: item.commentCount ?? 0,
  };
}

export default function BoardHistoryScreen() {
  const { user, refreshUser } = useAuthContext();
  const userIdFromHook = useMyUserId();
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const userId =
    (user?.id != null && user.id > 0 ? Number(user.id) : null) ??
    resolvedUserId ??
    userIdFromHook;
  const isLoggedIn = !!(user || resolvedUserId || userIdFromHook);
  const { posts, loading, error, refetch } = useMyPostList(isLoggedIn);
  const sortedPosts = useMemo(() => posts.map(toPostRow), [posts]);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  const handleEdit = (postId: string) => {
    setMenuPostId(null);
    router.push({ pathname: "/board/write", params: { edit: postId } });
  };

  const handleDelete = (postId: string) => {
    setMenuPostId(null);
    Alert.alert("삭제", "이 게시물을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await boardService.deletePost(postId, userId ?? undefined);
            refetch();
          } catch {
            Alert.alert("오류", "삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

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
      // ignore
    }
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert("복사됨", "링크가 클립보드에 복사되었습니다.");
    } catch {
      Alert.alert("오류", "링크 복사에 실패했습니다.");
    }
  };

  const handleHide = (postId: string) => {
    setMenuPostId(null);
    Alert.alert("숨기기(나만 보기)", "해당 기능은 준비 중입니다.");
  };

  // 로그인 시 저장된 userId를 먼저 사용해, getMe() 대기 없이 내 글 조회 가능하도록 함
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id != null && user.id > 0) {
        setResolvedUserId(Number(user.id));
        return;
      }
      if (!user) {
        setResolvedUserId(null);
        return;
      }
      let cancelled = false;
      (async () => {
        const stored = await authService.getStoredUserId();
        if (!cancelled && stored != null && stored > 0) {
          setResolvedUserId(stored);
          return;
        }
        const me = await authService.getMe();
        if (!cancelled && me?.id != null && me.id > 0) {
          setResolvedUserId(me.id);
          await authService.setStoredUserId(me.id);
          return;
        }
        if (!cancelled && userIdFromHook != null && userIdFromHook > 0) {
          setResolvedUserId(userIdFromHook);
          return;
        }
        if (!cancelled) setResolvedUserId(null);
      })();
      return () => { cancelled = true; };
    }, [user, user?.id, userIdFromHook])
  );

  // 게시판 기록 화면에 들어올 때마다 내 글 목록 새로고침 (수정 후 반영)
  useFocusEffect(
    React.useCallback(() => {
      if (userId != null && userId > 0) refetch();
    }, [userId, refetch])
  );

  const handleRetryUserIdAndRefetch = React.useCallback(async () => {
    await refreshUser();
    const stored = await authService.getStoredUserId();
    if (stored != null && stored > 0) setResolvedUserId(stored);
    refetch();
  }, [refreshUser, refetch]);

  const renderPost = ({ item }: { item: PostRow }) => (
    <Pressable style={styles.postRow} onPress={() => router.push(`/board/${item.id}`)}>
      <View style={styles.postRowBody}>
        <View style={styles.postRowTop}>
          <Text style={styles.author}>{user?.name ?? item.author}</Text>
          {item.tag ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          ) : null}
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={styles.headerTitleWrap} pointerEvents="box-none">
            <Text style={styles.headerTitle}>게시판 기록</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!user ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>로그인하면 내가 쓴 글이 표시됩니다.</Text>
              <Pressable style={styles.loginBtn} onPress={() => router.push("/login")}>
                <Text style={styles.loginBtnText}>로그인</Text>
              </Pressable>
            </View>
          ) : userId == null ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>내 글 정보를 불러오는 중...</Text>
              <Pressable style={styles.retryBtn} onPress={handleRetryUserIdAndRefetch}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : loading ? (
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
          ) : sortedPosts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>아직 작성한 글이 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              <FlatList
                data={sortedPosts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                scrollEnabled={false}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {/* 더보기 메뉴: 수정, 삭제, 링크 복사, 숨기기(나만 보기) */}
      <Modal visible={!!menuPostId} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuPostId(null)}>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleEdit(menuPostId)}>
              <Text style={styles.menuText}>수정</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleDelete(menuPostId)}>
              <Text style={[styles.menuText, styles.menuTextDanger]}>삭제</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleCopyLink(menuPostId)}>
              <Text style={styles.menuText}>링크 복사</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => menuPostId && handleHide(menuPostId)}>
              <Text style={styles.menuText}>숨기기(나만 보기)</Text>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerBack: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 56,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  scroll: { flex: 1 },
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
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  emptyText: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  loginBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
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
});
