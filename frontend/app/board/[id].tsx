// app/board/[id].tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Comment = {
  id: string;
  author: string;
  time: string;
  content: string;
  likes: number;
};

const MOCK_POST = {
  id: "1",
  author: "dog_dog",
  time: "15분전",
  tag: "후기",
  content:
    "이번 축제 푸드존 진짜 대박이었어요... 특히 감자버터구이랑 타코야끼 라인은 줄이 길었는데 기다릴 가치 있었음! 분위기도 너무 좋고 친구들이랑 사진도 많이 찍어서 행복했어요.",
  likes: 45,
  commentsCount: 12,
};

const MOCK_COMMENTS: Comment[] = [
  { id: "c1", author: "dog_1", time: "15분전", content: "저도 거기 가봤는데 정말 좋았어요!", likes: 3 },
  { id: "c2", author: "dog_2", time: "30분전", content: "다음에 같이 가요", likes: 1 },
  { id: "c3", author: "user3", time: "1시간전", content: "감자버터구이 진짜 맛있죠!", likes: 2 },
  { id: "c4", author: "user4", time: "2시간전", content: "분위기 최고였어요", likes: 1 },
  { id: "c5", author: "user5", time: "3시간전", content: "다음에도 가고 싶네요", likes: 0 },
  { id: "c6", author: "user6", time: "5시간전", content: "사진 많이 찍으셨나요?", likes: 1 },
  { id: "c7", author: "user7", time: "6시간전", content: "타코야끼 라인 얼마나 걸렸어요?", likes: 0 },
  { id: "c8", author: "user8", time: "8시간전", content: "저도 갔었는데 좋았어요", likes: 2 },
  { id: "c9", author: "user9", time: "10시간전", content: "추천 메뉴 있어요?", likes: 1 },
  { id: "c10", author: "user10", time: "12시간전", content: "주차는 어디서 하셨나요?", likes: 0 },
  { id: "c11", author: "user11", time: "어제", content: "다음 주에도 열리나요?", likes: 1 },
  { id: "c12", author: "user12", time: "어제", content: "친구들이랑 가기 좋아요", likes: 3 },
];

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(MOCK_POST.likes);

  const handleCopyLink = async () => {
    setMenuVisible(false);
    const link = `https://dailo.app/board/${id ?? ""}`;
    try {
      await Share.share({ message: link, title: "게시물 링크" });
    } catch {
      Alert.alert("링크", link);
    }
  };

  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert("신고", "해당 게시물을 신고하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "신고", style: "destructive", onPress: () => Alert.alert("완료", "신고 접수되었습니다.") },
    ]);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert("차단", "이 사용자를 차단하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "차단", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const handleSendChat = () => {
    setMenuVisible(false);
    router.push("/board/chat");
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      {
        id: `c${Date.now()}`,
        author: "Me",
        time: "방금 전",
        content: commentText.trim(),
        likes: 0,
      },
      ...prev,
    ]);
    setCommentText("");
  };

  const toggleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>게시물</Text>
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={styles.headerMenuBtn}
            hitSlop={16}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 게시물 본문 */}
          <View style={styles.postSection}>
            <View style={styles.postHeader}>
              <View style={styles.profileCircle} />
              <View style={styles.postMeta}>
                <Text style={styles.author}>{MOCK_POST.author}</Text>
                <Text style={styles.timeText}>{MOCK_POST.time}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{MOCK_POST.content}</Text>
            <View style={styles.postFooter}>
              <Pressable style={styles.footerItem} onPress={toggleLike}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#EF4444" : "#4B5563"} />
                <Text style={styles.footerText}>{likeCount}</Text>
              </Pressable>
              <View style={styles.footerItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4B5563" />
                <Text style={styles.footerText}>{comments.length}</Text>
              </View>
              <View style={styles.footerItem}>
                <Ionicons name="paper-plane-outline" size={18} color="#4B5563" />
              </View>
            </View>
          </View>

          {/* 댓글 섹션 */}
          <View style={styles.commentSection}>
            <Text style={styles.commentSectionTitle}>댓글</Text>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.commentAvatar} />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentTime}>{c.time}</Text>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  <Pressable style={styles.replyBtn}>
                    <Text style={styles.replyText}>답글달기</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.commentLike}>
                  <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Me</Text>
          <TextInput
            style={styles.input}
            placeholder="댓글을 입력하세요"
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSubmitComment}
            style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}
            disabled={!commentText.trim()}
          >
            <Text style={[styles.postBtnText, !commentText.trim() && styles.postBtnTextDisabled]}>게시</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 더보기 메뉴 모달: 채팅 보내기 - 링크 복사 - 신고 */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Pressable style={styles.menuItem} onPress={handleSendChat}>
              <Text style={styles.menuText}>채팅 보내기</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleCopyLink}>
              <Text style={styles.menuText}>링크 복사</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleReport}>
              <Text style={styles.menuText}>신고</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  headerMenuBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },
  postSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  postMeta: { marginLeft: 10 },
  author: { fontSize: 15, fontWeight: "600", color: "#111827" },
  timeText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  postContent: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 12 },
  postFooter: { flexDirection: "row", alignItems: "center", gap: 16 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 12, color: "#4B5563" },
  commentSection: { paddingHorizontal: 16, paddingTop: 16 },
  commentSectionTitle: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 12 },
  commentRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  commentBody: { flex: 1, marginLeft: 10 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: "#111827" },
  commentTime: { fontSize: 11, color: "#9CA3AF" },
  commentContent: { fontSize: 13, color: "#374151", lineHeight: 18 },
  replyBtn: { marginTop: 6 },
  replyText: { fontSize: 12, color: "#6B7280" },
  commentLike: { padding: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", minWidth: 24 },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    fontSize: 14,
    color: "#111827",
  },
  postBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  postBtnTextDisabled: { color: "#9CA3AF" },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 18 },
  menuText: { fontSize: 15, color: "#111827" },
  menuTextDanger: { color: "#DC2626" },
});
