// app/board/search.tsx – GET /api/posts/search 연동 (검색 결과 화면)
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSearchPosts } from "../../hooks/useBoard";
import { formatRelativeTime } from "../../utils/formatDate";
import type { PostListItem } from "../../types/board";

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

export default function BoardSearchScreen() {
  const { keyword } = useLocalSearchParams<{ keyword?: string }>();
  const router = useRouter();
  const { posts, totalElements, loading, error, refetch } = useSearchPosts(keyword);
  const sortedPosts = useMemo(() => posts.map(toPostRow), [posts]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            검색: {keyword ?? ""}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>검색 중...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>검색 결과를 불러올 수 없습니다.</Text>
              <Pressable style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : !keyword?.trim() ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>검색어를 입력해 주세요.</Text>
            </View>
          ) : sortedPosts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.resultCount}>총 {totalElements}건</Text>
              <View style={styles.listWrap}>
                <FlatList
                  data={sortedPosts}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
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
                            <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.footerText}>{item.likes}</Text>
                          </View>
                          <View style={styles.footerItem}>
                            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.footerText}>{item.comments}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  )}
                />
              </View>
            </>
          )}
        </ScrollView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  listWrap: { marginHorizontal: -24 },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, color: "#6B7280" },
  resultCount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
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
  postRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  author: { fontSize: 14, fontWeight: "400", color: "#6B7280" },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F3F4FF",
  },
  tagText: { fontSize: 11, color: "#4F46E5", fontWeight: "500" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginLeft: 6 },
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
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, color: "#9CA3AF" },
});
