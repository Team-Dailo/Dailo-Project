import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { mockBoardPosts, mockBoardComments } from "../../constants/mockBoardPosts";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}

export default function BoardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const post = useMemo(() => mockBoardPosts.find((p) => p.id === id), [id]);
  const initialComments = useMemo(
    () => mockBoardComments.filter((c) => c.postId === id),
    [id]
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");

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
      {/* ✅ 헤더(상단 여백 포함) */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <Text style={styles.headerTitle}>게시물</Text>

        <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#111" />
        </Pressable>
      </View>

      {/* ✅ 더보기 메뉴(사진 느낌) */}
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

          <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuText}>신고</Text>
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable style={styles.menuItem} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuText}>링크 복사</Text>
          </Pressable>
        </View>
      )}

      {/* ✅ 상단 게시글 카드(사진처럼 여백/구성) */}
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
                {timeAgo(post.createdAt)} · {post.category}
              </Text>
            </View>
          </View>
        </View>

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

      {/* ✅ 댓글 리스트 */}
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.commentList}
        ListHeaderComponent={<Text style={styles.commentTitle}>댓글</Text>}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={styles.commentAvatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.commentTop}>
                <Text style={styles.commentAuthor}>{item.authorName}</Text>
                <Pressable hitSlop={10}>
                  <Ionicons name="heart-outline" size={16} color="#777" />
                </Pressable>
              </View>
              <Text style={styles.commentContent}>{item.content}</Text>
              <Text style={styles.reply}>답글달기</Text>
            </View>
          </View>
        )}
      />

      {/* ✅ 하단 입력바(사진처럼) */}
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

        <Pressable onPress={onSubmit} hitSlop={10}>
          <Text style={styles.submit}>게시</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
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
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111" },

  menu: {
    position: "absolute",
    top: 52, // 헤더 바로 아래
    right: 14,
    width: 150,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 10,
    zIndex: 50,
    overflow: "hidden",
  },
  menuItem: { paddingVertical: 10, paddingHorizontal: 12 },
  menuText: { fontSize: 13, fontWeight: "700", color: "#111" },
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

  content: { marginTop: 10, fontSize: 13.5, lineHeight: 19, color: "#111" },

  reactions: { flexDirection: "row", gap: 16, marginTop: 12, alignItems: "center" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 12, color: "#444", fontWeight: "700" },

  commentList: { paddingHorizontal: 16, paddingBottom: 90 },
  commentTitle: { paddingTop: 14, paddingBottom: 8, fontSize: 14, fontWeight: "900", color: "#111" },

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
  meCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },
  meText: { fontSize: 12, fontWeight: "800", color: "#111" },
  inputWrap: { flex: 1, height: 38, backgroundColor: "#F7F7F7", borderRadius: 18, paddingHorizontal: 12, justifyContent: "center" },
  input: { fontSize: 13, color: "#111" },
  submit: { fontSize: 13, fontWeight: "900", color: "#3B82F6" },
});
