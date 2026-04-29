// app/(tabs)/mypage/liked-posts.tsx - 좋아요 누른 글 목록
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../hooks/useAuth";
import { useLikedPostList } from "../../../hooks/useBoard";
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

export default function LikedPostsScreen() {
  const { isLoggedIn } = useAuth();
  const { posts, loading, error, refetch } = useLikedPostList(!!isLoggedIn);
  const sortedPosts = useMemo(() => posts.map(toPostRow), [posts]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isLoggedIn) refetch();
    }, [isLoggedIn, refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderPost = ({ item }: { item: PostRow }) => (
    <Pressable style={styles.postRow} onPress={() => router.push(`/board/${item.id}`)}>
      <View style={styles.postRowBody}>
        <View style={styles.postRowTop}>
          <Text style={styles.author}>{item.author}</Text>
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
            <Ionicons name="heart" size={14} color="#EF4444" />
            <Text style={[styles.footerText, styles.footerTextLiked]}>{item.likes}</Text>
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
            <Text style={styles.headerTitle}>좋아요 누른 글</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {!isLoggedIn ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>로그인하면 좋아요 누른 글이 표시됩니다.</Text>
            <Pressable style={styles.loginBtn} onPress={() => router.push("/login")}>
              <Text style={styles.loginBtnText}>로그인</Text>
            </Pressable>
          </View>
        ) : loading && !refreshing ? (
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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6366F1"]}
                tintColor="#6366F1"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>아직 좋아요 누른 글이 없습니다.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
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
  listContent: { paddingBottom: 24 },
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
  footerTextLiked: { color: "#EF4444" },
});
