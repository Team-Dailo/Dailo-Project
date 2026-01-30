import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { BoardCategory, BoardSort, BoardPost } from "../../../types/board";
import { mockBoardNotice, mockBoardPosts } from "../../../constants/mockBoardPosts";

import BoardNoticeCard from "./_components/BoardNoticeCard";
import BoardCategoryChips from "./_components/BoardCategoryChips";
import BoardSortTabs from "./_components/BoardSortTabs";
import BoardPostCard from "./_components/BoardPostCard";
import FloatingWriteButton from "./_components/FloatingWriteButton";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}

export default function BoardTabScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<BoardCategory>("전체");
  const [sort, setSort] = useState<BoardSort>("최신글");

  const posts = useMemo(() => {
    let list: BoardPost[] = [...mockBoardPosts];

    if (category !== "전체") list = list.filter((p) => p.category === category);

    if (sort === "최신글") {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else {
      list.sort((a, b) => b.likeCount - a.likeCount);
    }

    return list;
  }, [category, sort]);

  const goChatList = () => {
    // ✅ 탭 밖 라우트는 객체 pathname으로 (꼬임 방지)
    router.push({ pathname: "/board/chat" });
  };

  const goWrite = () => {
    router.push({ pathname: "/board/write" });
  };

  const goDetail = (postId: string) => {
    router.push({ pathname: "/board/[id]", params: { id: postId } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>게시판</Text>

          <Pressable onPress={goChatList} hitSlop={10} style={styles.headerIconBtn}>
            <Ionicons name="chatbubble-outline" size={22} color="#111" />
          </Pressable>
        </View>

        <BoardNoticeCard
          title={mockBoardNotice.title}
          preview={mockBoardNotice.preview}
          onPress={() => {
            // 공지 상세가 생기면 연결
          }}
        />

        <BoardCategoryChips value={category} onChange={setCategory} />
        <BoardSortTabs value={sort} onChange={setSort} />

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BoardPostCard
              post={item}
              timeLabel={timeAgo(item.createdAt)}
              onPress={() => goDetail(item.id)}
              onMorePress={() => goDetail(item.id)}
            />
          )}
        />

        <FloatingWriteButton onPress={goWrite} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#111" },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: { paddingBottom: 120 },
});
