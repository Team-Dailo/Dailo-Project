// app/(tabs)/board/index.tsx
import React, { useMemo, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../../constants/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

type Post = {
  id: string;
  author: string;
  time: string;
  tag?: string;
  title: string;
  content?: string;
  likes: number;
  comments: number;
  scraps: number;
};

const CATEGORIES = ["전체", "후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

// ✅ TODO: 나중에 로그인 붙이면 여기 값을 “로그인 유저 id”로 교체
const MY_USER_ID = "1";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function normalizePost(raw: any): Post {
  return {
    id: String(raw?.id ?? raw?.postId ?? ""),
    title: String(raw?.title ?? raw?.postTitle ?? ""),
    author: String(raw?.author ?? raw?.authorName ?? "unknown"),
    time: String(raw?.time ?? raw?.createdAtText ?? raw?.createdAt ?? ""),
    tag: raw?.tag ?? raw?.category ?? raw?.categoryType,
    content: raw?.content ?? raw?.postContent ?? raw?.body ?? raw?.text ?? undefined,
    likes: Number(raw?.likes ?? raw?.likeCount ?? 0),
    comments: Number(raw?.comments ?? raw?.commentCount ?? 0),
    scraps: Number(raw?.scraps ?? raw?.scrapCount ?? 0),
  };
}

export default function BoardScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [sortType, setSortType] = useState<"latest" | "popular">("latest");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/api/posts");
      const data = res.data;

      const list = Array.isArray(data) ? data : data?.content ?? [];
      const normalized = (Array.isArray(list) ? list : []).map(normalizePost);

      const nonEmpty = normalized.filter((p) => p.id && p.id !== "undefined" && p.id !== "null");
      const uniq = Array.from(new Map(nonEmpty.map((p) => [p.id, p])).values());

      setPosts(uniq);
    } catch (e: any) {
      console.log("❌ API ERROR", e?.response?.status, e?.response?.data, e?.message);
      setError(
        typeof e?.response?.data === "string"
          ? e.response.data
          : JSON.stringify(e?.response?.data ?? { message: e?.message, code: e?.code })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const visiblePosts = useMemo(() => {
    let filtered = [...posts];

    if (selectedCategory !== "전체") {
      filtered = filtered.filter((p) => p.tag === selectedCategory);
    }

    if (sortType === "popular") {
      filtered.sort((a, b) => b.likes - a.likes);
    } else {
      filtered.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return filtered;
  }, [posts, selectedCategory, sortType]);

  // ✅ 게시글 상세
  const goDetail = (item: Post) => {
    router.push({
      pathname: "/board/[id]",
      params: { id: String(item.id) },
    });
  };

  // ✅ (중요) 헤더 채팅 버튼: "채팅 목록"으로만 이동 (roomId 없이 userId만)
  const goChatList = () => {
    router.push({
      pathname: "/board/chat", // ✅ chat.tsx가 채팅 목록
      params: { userId: MY_USER_ID },
    });
  };

  // ✅ (중요) 게시글의 채팅 아이콘: 채팅 "방"으로 이동 (roomId + userId)
  // ⚠️ 너 프로젝트에서 채팅방 화면 경로가 /board/char-room 라고 했으니 그대로 씀
  // 만약 파일명이 chat-room.tsx면 "/board/chat-room"로 바꿔야 함
  const goChatRoom = (item: Post) => {
    router.push({
      pathname: "/board/char-room",
      params: {
        roomId: String(item.id), // ⚠️ 진짜 roomId가 맞는지는 백엔드 방식에 따라 달라짐
        userId: MY_USER_ID,
        name: item.author,
      },
    });
  };

  const renderPost = ({ item }: { item: Post }) => {
    const preview =
      (item.content ?? "").trim().length > 0
        ? String(item.content).slice(0, 80)
        : "내용은 상세 페이지에서 확인할 수 있어요.";

    return (
      <Pressable style={styles.postCard} onPress={() => goDetail(item)}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <View style={styles.profileCircle} />
            <View>
              <View style={styles.authorRow}>
                <Text style={styles.author}>{item.author}</Text>
                {item.tag ? (
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagText}>{item.tag}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>

          <View style={styles.postHeaderRight}>
            <Pressable
              onPress={() => goChatRoom(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.iconBtn}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#111827" />
            </Pressable>

            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </View>
        </View>

        <Text style={styles.postTitleText}>{item.title}</Text>
        <Text style={styles.postContent}>{preview}</Text>

        <View style={styles.postFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="heart-outline" size={18} color="#4B5563" />
            <Text style={styles.footerText}>{item.likes}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4B5563" />
            <Text style={styles.footerText}>{item.comments}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="bookmark-outline" size={18} color="#4B5563" />
            <Text style={styles.footerText}>{item.scraps}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>게시판</Text>

          {/* ✅ 헤더 채팅 버튼: 목록으로 이동 + userId 전달 */}
          <Pressable onPress={goChatList} style={styles.headerRight} hitSlop={12}>
            <Ionicons name="chatbubble-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? <Text style={{ paddingHorizontal: 16, marginTop: 8 }}>로딩중...</Text> : null}

          {error ? (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <Text style={{ color: "red", marginBottom: 8 }}>에러: {error}</Text>
              <Pressable onPress={loadPosts} style={{ paddingVertical: 10 }}>
                <Text style={{ color: "#2563EB", fontWeight: "600" }}>다시 시도</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 공지 카드 */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeRow}>
              <Text style={styles.noticeTitle}>공지사항</Text>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </View>
            <Text style={styles.noticeText}>[공지사항] 이번 주 서버 점검 안내드립니다...</Text>
          </View>

          {/* 카테고리 탭 */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 정렬 탭 */}
          <View style={styles.sortRow}>
            <Pressable onPress={() => setSortType("latest")}>
              <Text style={[styles.sortText, sortType === "latest" && styles.sortTextSelected]}>
                최신글
              </Text>
            </Pressable>
            <Pressable onPress={() => setSortType("popular")}>
              <Text style={[styles.sortText, sortType === "popular" && styles.sortTextSelected]}>
                인기글
              </Text>
            </Pressable>
          </View>

          {/* 게시글 리스트 */}
          <FlatList
            data={visiblePosts}
            extraData={`${selectedCategory}-${sortType}-${visiblePosts.length}`}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPost}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              !loading && !error ? (
                <Text style={{ paddingHorizontal: 16, marginTop: 8, color: "#6B7280" }}>
                  게시글이 없어요.
                </Text>
              ) : null
            }
          />
        </ScrollView>

        {/* 글쓰기 플로팅 버튼 */}
        <Pressable style={styles.fab} onPress={() => router.push("/board/write")}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },

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
  noticeTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  noticeText: { fontSize: 13, color: "#6B7280" },

  categoryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  categoryChipSelected: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  categoryChipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  categoryChipTextSelected: { color: "#FFFFFF" },

  sortRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  sortText: { fontSize: 13, color: "#9CA3AF" },
  sortTextSelected: { color: "#111827", fontWeight: "600" },

  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  postHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 6 },

  profileCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  author: { fontSize: 14, fontWeight: "600", color: "#111827" },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "#F4F4FF" },
  tagText: { fontSize: 11, color: "#4F46E5", fontWeight: "500" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  postTitleText: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 6 },
  postContent: { fontSize: 13, color: "#374151", lineHeight: 18, marginBottom: 10 },

  postFooter: { flexDirection: "row", alignItems: "center", gap: 16 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, color: "#4B5563" },

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
