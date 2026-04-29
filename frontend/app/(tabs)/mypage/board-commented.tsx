// app/(tabs)/mypage/board-commented.tsx - 댓글 단 게시글 목록
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, useMyUserId } from "../../../hooks/useAuth";
import { useMyCommentedPostList } from "../../../hooks/useBoard";
import * as boardService from "../../../services/board.service";
import type { CommentItem } from "../../../types/board";
import { formatRelativeTime } from "../../../utils/formatDate";
import type { PostListItem } from "../../../types/board";

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

type MyCommentRow = {
  commentId: string;
  postId: string;
  postTitle?: string;
  categoryType?: string;
  /** 내가 쓴 댓글 내용 */
  commentContent: string;
  /** 댓글 작성 시각 (상대 시간 문자열) */
  time: string;
};

function toPostRow(item: PostListItem): PostRow {
  const raw = item as Record<string, unknown>;
  const preview = (raw.contentPreview ?? raw.content_preview ?? item.contentPreview ?? item.title ?? "") as string;
  let contentStr = typeof preview === "string" ? preview.trim() : "";
  if (contentStr.length > 120) contentStr = contentStr.slice(0, 120) + "…";
  const authorName = (item.authorNickname ?? (raw.author_nickname as string) ?? "").trim() || `user_${item.authorId}`;
  const createdAt = (raw.createdAt ?? raw.created_at ?? item.createdAt) as string | undefined;
  return {
    id: String(item.id),
    author: authorName,
    title: item.title,
    time: formatRelativeTime(createdAt),
    tag: item.categoryType ?? "",
    content: contentStr,
    likes: item.likeCount ?? 0,
    comments: item.commentCount ?? 0,
  };
}

export default function BoardCommentedScreen() {
  const { isLoggedIn } = useAuth();
  const myUserId = useMyUserId();
  const { posts, loading, error, refetch } = useMyCommentedPostList(!!isLoggedIn);
  const sortedPosts = useMemo(() => posts.map(toPostRow), [posts]);
  const [myComments, setMyComments] = useState<MyCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) refetch();
    }, [isLoggedIn, refetch])
  );

  // 각 게시글의 댓글 목록을 조회해 "내가 쓴 댓글"만 모아서 리스트로 구성
  useEffect(() => {
    if (!isLoggedIn || !myUserId || !sortedPosts.length) {
      setMyComments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setCommentsLoading(true);
        const rows: MyCommentRow[] = [];
        for (const post of sortedPosts) {
          try {
            const res = await boardService.getComments(post.id, { page: 0, size: 100 });
            const contents = res.content ?? [];
            const pushComment = (c: CommentItem) => {
              const raw = c as Record<string, unknown>;
              const authorId = Number(
                (c.authorId as number | undefined) ??
                  (raw.author_id as number | undefined) ??
                  0
              );
              if (!Number.isFinite(authorId) || authorId !== myUserId) return;
              const createdAt =
                (c.createdAt as string | undefined) ??
                (raw.createdAt as string | undefined) ??
                (raw.created_at as string | undefined) ??
                "";
              rows.push({
                commentId: String(c.id),
                postId: post.id,
                postTitle: post.title,
                categoryType: post.tag,
                commentContent: c.content ?? "",
                time: formatRelativeTime(createdAt || post.time),
              });
            };
            contents.forEach((c: CommentItem & { replies?: CommentItem[] }) => {
              pushComment(c);
              (c.replies ?? []).forEach(pushComment);
            });
          } catch {
            // 해당 게시글 댓글 조회 실패는 무시
          }
        }
        if (!cancelled) {
          // 최신 순으로 정렬
          setMyComments(
            rows.sort((a, b) => (a.time > b.time ? -1 : 1))
          );
        }
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, myUserId, sortedPosts]);

  const filteredComments = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return myComments;
    return myComments.filter((c) => {
      const title = c.postTitle ?? "";
      const content = c.commentContent ?? "";
      return (
        title.toLowerCase().includes(q) ||
        content.toLowerCase().includes(q)
      );
    });
  }, [myComments, appliedSearch]);

  const renderPost = ({ item }: { item: MyCommentRow }) => (
    <Pressable style={styles.postRow} onPress={() => router.push(`/board/${item.postId}`)}>
      <View style={styles.postRowBody}>
        <View style={styles.postRowTop}>
          <Text style={styles.author}>내가 쓴 댓글</Text>
          {item.categoryType ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{item.categoryType}</Text>
            </View>
          ) : null}
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        {item.postTitle ? (
          <Text style={styles.postTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.postTitle}
          </Text>
        ) : null}
        {item.commentContent ? (
          <Text style={styles.postPreview} numberOfLines={2} ellipsizeMode="tail">
            {item.commentContent}
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
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
            <Text style={styles.headerTitle}>내가 쓴 댓글</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!isLoggedIn ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>로그인하면 댓글 단 글이 표시됩니다.</Text>
              <Pressable style={styles.loginBtn} onPress={() => router.push("/login")}>
                <Text style={styles.loginBtnText}>로그인</Text>
              </Pressable>
            </View>
          ) : loading || commentsLoading ? (
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
          ) : myComments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>아직 댓글 단 글이 없습니다.</Text>
            </View>
          ) : (
            <>
              {/* 검색창 */}
              <View style={styles.searchBarWrap}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="게시글 제목 또는 댓글 내용 검색"
                  placeholderTextColor="#9CA3AF"
                  value={searchKeyword}
                  onChangeText={setSearchKeyword}
                  returnKeyType="search"
                  onSubmitEditing={() =>
                    setAppliedSearch(searchKeyword.trim())
                  }
                />
                {searchKeyword.length > 0 ? (
                  <Pressable
                    onPress={() => setSearchKeyword("")}
                    style={styles.searchClear}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color="#9CA3AF"
                    />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setAppliedSearch(searchKeyword.trim())}
                  style={styles.searchButton}
                  hitSlop={8}
                >
                  <Ionicons name="search" size={22} color="#111827" />
                </Pressable>
              </View>

              <View style={styles.listWrap}>
                <FlatList
                  data={filteredComments}
                  keyExtractor={(item) => item.commentId}
                  renderItem={renderPost}
                  scrollEnabled={false}
                />
              </View>
              {filteredComments.length === 0 && appliedSearch.trim() ? (
                <Text style={styles.searchEmpty}>
                  조건에 맞는 댓글이 없어요
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  listWrap: { marginHorizontal: -24 },
  loadingWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  emptyText: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  loginBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 8,
  },
  searchClear: { padding: 4 },
  searchButton: { padding: 4, marginLeft: 4 },
  searchEmpty: {
    paddingVertical: 24,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
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
  postRowTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  author: { fontSize: 14, fontWeight: "400", color: "#6B7280" },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "#F3F4FF" },
  tagText: { fontSize: 11, color: "#4F46E5", fontWeight: "500" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginLeft: 6 },
  postTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 4 },
  postPreview: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  postRowFooter: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, color: "#9CA3AF" },
});
