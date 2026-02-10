import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import axios from "axios";
import { API_BASE_URL } from "../../constants/api";

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ✅ 상세 응답을 화면에서 쓰기 좋은 형태로 안전 변환
function normalizeDetail(raw: any) {
  return {
    id: String(raw?.id ?? raw?.postId ?? ""),
    title: String(raw?.title ?? raw?.postTitle ?? ""),
    authorName: String(raw?.author ?? raw?.authorName ?? raw?.writer ?? "unknown"),
    authorAvatarUrl:
      raw?.authorAvatarUrl ?? raw?.profileImageUrl ?? raw?.avatarUrl ?? null,
    category: String(raw?.category ?? raw?.tag ?? raw?.categoryType ?? ""),
    createdAt: String(raw?.createdAt ?? raw?.createdAtText ?? raw?.time ?? ""),
    content: String(
      raw?.content ??
        raw?.postContent ??
        raw?.body ??
        raw?.text ??
        raw?.description ??
        raw?.post?.content ??
        ""
    ),
    likeCount: Number(raw?.likeCount ?? raw?.likes ?? 0),
    commentCount: Number(raw?.commentCount ?? raw?.comments ?? 0),
  };
}

export default function BoardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [menuOpen, setMenuOpen] = useState(false);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 댓글은 로컬 상태만
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");

  // ✅ 삭제 로딩
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/api/posts/${id}`);
      setPost(normalizeDetail(res.data));
    } catch (e: any) {
      setError(
        typeof e?.response?.data === "string"
          ? e.response.data
          : JSON.stringify(e?.response?.data ?? { message: e?.message, code: e?.code })
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onSubmit = () => {
    const t = text.trim();
    if (!t) return;

    setComments((prev) => [
      {
        id: `c_${Date.now()}`,
        postId: String(id),
        authorName: "Me",
        content: t,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setText("");
  };

  // ✅ 글 삭제 (확인 팝업 → DELETE 호출 → 성공하면 뒤로가기)
  const onDeletePost = useCallback(() => {
    if (!id || deleting) return;

    Alert.alert("게시글 삭제", "정말 삭제할까요? 삭제하면 복구할 수 없어요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            setMenuOpen(false);

            await api.delete(`/api/posts/${id}`);

            router.back();
          } catch (e: any) {
            console.log("❌ DELETE ERROR", e?.response?.status, e?.response?.data);

            Alert.alert(
              "삭제 실패",
              typeof e?.response?.data === "string"
                ? e.response.data
                : e?.message ?? "알 수 없는 오류"
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [id, deleting, router]);

  if (loading && !post) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <Text>로딩중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !post) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <Text style={{ color: "red", marginBottom: 10 }}>에러: {error}</Text>
          <Pressable onPress={loadDetail}>
            <Text style={{ color: "#3B82F6", fontWeight: "900" }}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <Text>게시글을 찾을 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.screen}>
        {/* ✅ 헤더 (터치 보장: zIndex/elevation 추가됨) */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{ padding: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>

          <Text style={styles.headerTitle}>게시물</Text>

          <Pressable
            onPress={() => {
              console.log("ellipsis pressed");
              setMenuOpen((v) => !v);
            }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={{ padding: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#111" />
          </Pressable>
        </View>

        {/* ✅ 더보기 메뉴 */}
        {menuOpen && (
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/board/chat");
              }}
            >
              <Text style={styles.menuText}>채팅 보내기</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={onDeletePost}
              disabled={deleting}
            >
              <Text style={[styles.menuText, styles.dangerText]}>
                {deleting ? "삭제중..." : "삭제"}
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert("신고", "신고 기능은 아직 연결되지 않았어요.");
              }}
            >
              <Text style={styles.menuText}>신고</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                Alert.alert("링크 복사", "링크 복사 기능은 아직 연결되지 않았어요.");
              }}
            >
              <Text style={styles.menuText}>링크 복사</Text>
            </Pressable>
          </View>
        )}

        {/* ✅ 상단 게시글 카드 */}
        <View style={styles.postCard}>
          <View style={styles.postTopRow}>
            <View style={styles.profileRow}>
              {post.authorAvatarUrl ? (
                <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]} />
              )}

              <View>
                <Text style={styles.author}>{post.authorName}</Text>
                <Text style={styles.meta}>
                  {post.createdAt ? timeAgo(post.createdAt) : ""}{" "}
                  {post.category ? `· ${post.category}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {post.title ? <Text style={styles.title}>{post.title}</Text> : null}

          <Text style={styles.content}>{post.content}</Text>

          <View style={styles.reactions}>
            <View style={styles.iconRow}>
              <Ionicons name="heart-outline" size={18} color="#444" />
              <Text style={styles.count}>{post.likeCount}</Text>
            </View>
            <View style={styles.iconRow}>
              <Ionicons name="chatbubble-outline" size={18} color="#444" />
              <Text style={styles.count}>{post.commentCount}</Text>
            </View>
            <View style={styles.iconRow}>
              <Ionicons name="return-down-forward-outline" size={18} color="#444" />
            </View>
            <View style={styles.iconRow}>
              <Ionicons name="paper-plane-outline" size={18} color="#444" />
            </View>
          </View>
        </View>

        {/* ✅ 댓글 리스트 (flex:1로 레이아웃 분리해서 헤더 터치 안 먹게) */}
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.commentList}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          ListHeaderComponent={<Text style={styles.commentTitle}>댓글</Text>}
          ListEmptyComponent={<Text style={styles.emptyComment}>댓글이 없어요.</Text>}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentAvatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentAuthor}>{item.authorName}</Text>
                  <Pressable hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="heart-outline" size={16} color="#777" />
                  </Pressable>
                </View>
                <Text style={styles.commentContent}>{item.content}</Text>
                <Text style={styles.reply}>답글달기</Text>
              </View>
            </View>
          )}
        />

        {/* ✅ 하단 입력바 */}
        <View style={styles.inputBar}>
          <View style={styles.meCircle}>
            <Text style={styles.meText}>Me</Text>
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="댓글을 입력하세요"
              placeholderTextColor="#999"
              style={styles.input}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 6 }}
          >
            <Text style={styles.submit}>게시</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  screen: { flex: 1, position: "relative" },
  container: { padding: 16 },

  header: {
    height: 52,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",

    // ✅ 헤더가 최상단에서 터치 받도록
    position: "relative",
    zIndex: 1000,
    elevation: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111" },

  menu: {
    position: "absolute",
    top: 52,
    right: 14,
    width: 150,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 10,

    zIndex: 9999,
    elevation: 20,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },

    overflow: "hidden",
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 12 },
  menuText: { fontSize: 13, fontWeight: "700", color: "#111" },
  dangerText: { color: "#EF4444" },
  menuDivider: { height: 1, backgroundColor: "#EEE" },

  postCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  postTopRow: { flexDirection: "row", justifyContent: "space-between" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEE" },
  avatarFallback: { backgroundColor: "#E7E7E7" },

  author: { fontSize: 14, fontWeight: "900", color: "#111" },
  meta: { marginTop: 2, fontSize: 12, color: "#777", fontWeight: "700" },

  title: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#111" },
  content: { marginTop: 10, fontSize: 13.5, lineHeight: 19, color: "#111" },

  reactions: { flexDirection: "row", gap: 16, marginTop: 12, alignItems: "center" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 12, color: "#444", fontWeight: "700" },

  commentList: { paddingHorizontal: 16, paddingBottom: 90 },
  commentTitle: {
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },
  emptyComment: { paddingVertical: 10, color: "#777", fontWeight: "700" },

  commentRow: { flexDirection: "row", gap: 10, paddingVertical: 12 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E7E7E7" },
  commentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  commentAuthor: { fontSize: 13, fontWeight: "800", color: "#111" },
  commentContent: { marginTop: 6, fontSize: 13, color: "#111" },
  reply: { marginTop: 8, fontSize: 12, color: "#777", fontWeight: "700" },

  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  meText: { fontSize: 12, fontWeight: "800", color: "#111" },
  inputWrap: {
    flex: 1,
    height: 38,
    backgroundColor: "#F7F7F7",
    borderRadius: 18,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  input: { fontSize: 13, color: "#111" },
  submit: { fontSize: 13, fontWeight: "900", color: "#3B82F6" },
});
