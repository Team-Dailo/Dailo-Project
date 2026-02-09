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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Post = {
  id: string;
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

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    author: "dog_dog",
    title: "푸드존 후기 공유해요!",
    time: "15분전",
    tag: "후기",
    content:
      "이번 축제 푸드존 진짜 대박이었어요... 😆\n특히 감자버터구이랑 타코야끼 라인은 줄이 길었는데 기다린 가치 있었음!\n분위기도 너무 좋고 친구들이랑 사진도 많이 찍어서 행복했어요.",
    likes: 45,
    comments: 12,
    scraps: 4,
    imageUri: "https://picsum.photos/seed/dog1/200/200",
  },
  {
    id: "2",
    author: "cat",
    title: "저녁 공연 진짜 대박",
    time: "1시간전",
    tag: "후기",
    content:
      "저녁 공연 무대 연출 미쳤어요.\n조명 + 사운드 + 날씨 삼박자가 완벽해서\n가수 나오자마자 관객들이랑 다 같이 떼창한 거 아직도 소름...\n영원히 기억에 남을 하루였습니다!",
    likes: 39,
    comments: 8,
    scraps: 3,
  },
  {
    id: "3",
    author: "user_q",
    title: "주차 가능한 곳 알려주세요",
    time: "2시간전",
    tag: "질문",
    content: "이번 주말에 축제 갈 예정인데 차로 가려고 해요. 주차 가능한 곳이나 주차장 정보 알려주실 수 있을까요?",
    likes: 5,
    comments: 3,
    scraps: 1,
  },
  {
    id: "4",
    author: "user_f",
    title: "날씨 좋은 날 나들이 추천",
    time: "3시간전",
    tag: "자유",
    content: "오늘 날씨가 너무 좋아서 뭐라도 하고 싶네요. 다들 주말에 뭐 하시나요?",
    likes: 12,
    comments: 7,
    scraps: 2,
  },
];

const CATEGORIES = ["전체", "후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

export default function BoardScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [sortType, setSortType] = useState<"latest" | "popular">("latest");
  const [menuPostId, setMenuPostId] = useState<string | null>(null);

  const handleCopyLink = async (postId: string) => {
    setMenuPostId(null);
    const link = `https://dailo.app/board/${postId}`;
    try {
      await Share.share({ message: link, title: "게시물 링크" });
    } catch {
      Alert.alert("링크", link);
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

  const sortedPosts = useMemo(() => {
    const filtered =
      selectedCategory === "전체"
        ? MOCK_POSTS
        : MOCK_POSTS.filter((p) => p.tag === selectedCategory);
    if (sortType === "popular") {
      return [...filtered].sort((a, b) => b.likes - a.likes);
    }
    return filtered;
  }, [sortType, selectedCategory]);

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
          <Text style={styles.postPreview} numberOfLines={2} ellipsizeMode="tail">
            {item.content}
          </Text>
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
            <Pressable style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={22} color="#111827" />
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
            <FlatList
              data={sortedPosts}
              keyExtractor={(item) => item.id}
              renderItem={renderPost}
              scrollEnabled={false}
            />
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
