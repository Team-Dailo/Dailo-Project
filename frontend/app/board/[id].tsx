// app/board/[id].tsx
import React, { useState, useRef, useMemo } from "react";
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
  Share,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePostDetail, useComments } from "../../hooks/useBoard";
import { formatRelativeTime } from "../../utils/formatDate";
import * as boardService from "../../services/board.service";
import * as reportService from "../../services/report.service";
import * as blockService from "../../services/block.service";
import * as chatService from "../../services/chat.service";

type CommentDisplay = {
  id: string;
  author: string;
  time: string;
  content: string;
  likes: number;
};

function toCommentDisplay(c: { id: number; authorId: number; content: string; likeCount: number; createdAt: string }): CommentDisplay {
  return {
    id: String(c.id),
    author: `user_${c.authorId}`,
    time: formatRelativeTime(c.createdAt),
    content: c.content,
    likes: c.likeCount ?? 0,
  };
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuthContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const commentSectionY = useRef(0);

  const { post, loading: postLoading, error: postError, refetch: refetchPost } = usePostDetail(id);
  const { comments: apiComments, loading: commentsLoading, refetch: refetchComments } = useComments(id);

  const comments = useMemo(() => apiComments.map(toCommentDisplay), [apiComments]);
  const likeCount = post ? (liked ? (post.likeCount ?? 0) + 1 : (post.likeCount ?? 0)) : 0;

  const handleCopyLink = async () => {
    setMenuVisible(false);
    const link = `https://dailo.app/board/${id ?? ""}`;
    try {
      const result = await Share.share({
        message: link,
        title: "게시물 링크",
        url: link,
      });
      if (result?.action === Share.sharedAction) return;
    } catch {
      // 공유 시트 취소 또는 실패 시 링크 복사로 대체
      Alert.alert(
        "링크 공유",
        "공유할 수 없을 때는 아래 링크를 복사해서 사용하세요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "링크 복사",
            onPress: async () => {
              await Clipboard.setStringAsync(link);
              Alert.alert("복사됨", "링크가 클립보드에 복사되었습니다.");
            },
          },
        ]
      );
    }
  };

  const handleReport = () => {
    setMenuVisible(false);
    const reasons: { title: string; reason: reportService.ReportReason }[] = [
      { title: "스팸", reason: "SPAM" },
      { title: "욕설/혐오", reason: "ABUSE" },
      { title: "부적절한 내용", reason: "INAPPROPRIATE" },
      { title: "기타", reason: "OTHER" },
    ];
    Alert.alert(
      "신고",
      "신고 사유를 선택해 주세요.",
      [
        { text: "취소", style: "cancel" },
        ...reasons.map((r) => ({
          text: r.title,
          onPress: async () => {
            try {
              await reportService.createReport({
                targetType: "POST",
                targetId: Number(id),
                reason: r.reason,
              });
              Alert.alert("완료", "신고가 접수되었습니다.");
            } catch {
              Alert.alert("오류", "신고 접수에 실패했습니다.");
            }
          },
        })),
      ]
    );
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (!post?.authorId) return;
    Alert.alert("차단", "이 사용자를 차단하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            await blockService.blockUser(post!.authorId);
            Alert.alert("차단됨", "사용자를 차단했습니다.");
            router.back();
          } catch {
            Alert.alert("오류", "차단에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleSendChat = () => {
    setMenuVisible(false);
    if (!post?.authorId) return;
    (async () => {
      try {
        const room = await chatService.createRoom(post!.authorId);
        router.push(`/board/chat/${room.id}`);
      } catch {
        Alert.alert("오류", "채팅방을 열 수 없습니다.");
      }
    })();
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    setSubmittingComment(true);
    try {
      await boardService.createComment(id, { content: commentText.trim() });
      setCommentText("");
      refetchComments();
      refetchPost();
    } catch {
      Alert.alert("오류", "댓글을 등록할 수 없습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleLike = () => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "좋아요를 누르려면 로그인해 주세요.", [
        { text: "취소", style: "cancel" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    setLiked((prev) => !prev);
  };

  const toggleCommentLike = (commentId: string) => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "댓글에 좋아요를 누르려면 로그인해 주세요.", [
        { text: "취소", style: "cancel" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
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
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {postLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : postError || !post ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>게시물을 불러올 수 없습니다.</Text>
              <Pressable style={styles.retryBtn} onPress={() => refetchPost()}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* 게시물 본문 */}
              <View style={styles.postSection}>
                <View style={styles.postHeader}>
                  <View style={styles.profileCircle} />
                  <View style={styles.postMeta}>
                    <Text style={styles.author}>{post.authorNickname ?? `user_${post.authorId}`}</Text>
                    <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </View>
                {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postFooter}>
                  <Pressable style={styles.footerItem} onPress={toggleLike}>
                    <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#EF4444" : "#4B5563"} />
                    <Text style={[styles.footerText, liked && styles.footerTextLiked]}>{likeCount}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.footerItem}
                    onPress={() =>
                      scrollViewRef.current?.scrollTo({
                        y: Math.max(0, commentSectionY.current - 40),
                        animated: true,
                      })
                    }
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color="#4B5563" />
                    <Text style={styles.footerText}>{post.commentCount ?? comments.length}</Text>
                  </Pressable>
                  <View style={styles.footerItem}>
                    <Ionicons name="paper-plane-outline" size={18} color="#4B5563" />
                  </View>
                </View>
              </View>

              {/* 댓글 섹션 */}
              <View
                style={styles.commentSection}
                onLayout={(e) => {
                  commentSectionY.current = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.commentSectionTitle}>댓글</Text>
                {commentsLoading ? (
                  <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 16 }} />
                ) : (
                  comments.map((c) => {
              const commentLiked = likedCommentIds.has(c.id);
              const commentLikeCount = c.likes + (commentLiked ? 1 : 0);
              return (
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
                  <Pressable style={styles.commentLikeWrap} onPress={() => toggleCommentLike(c.id)}>
                    <Ionicons
                      name={commentLiked ? "heart" : "heart-outline"}
                      size={16}
                      color={commentLiked ? "#EF4444" : "#9CA3AF"}
                    />
                    <Text style={[styles.commentLikeCount, commentLiked && styles.commentLikeCountLiked]}>
                      {commentLikeCount}
                    </Text>
                  </Pressable>
                </View>
              );
            })
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* 댓글 입력 - 게시물 로드된 경우만 */}
        {post && (
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
            style={[styles.postBtn, (!commentText.trim() || submittingComment) && styles.postBtnDisabled]}
            disabled={!commentText.trim() || submittingComment}
          >
            <Text style={[styles.postBtnText, !commentText.trim() && styles.postBtnTextDisabled]}>
              {submittingComment ? "..." : "게시"}
            </Text>
          </Pressable>
        </View>
        )}
      </KeyboardAvoidingView>

      {/* 더보기 메뉴: 채팅 보내기 - 링크 복사 - 신고 - 차단하기 */}
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
            <Pressable style={styles.menuItem} onPress={handleBlock}>
              <Text style={[styles.menuText, styles.menuTextDanger]}>차단하기</Text>
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
  postTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginBottom: 8 },
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
  commentLikeWrap: { alignItems: "center", padding: 4, minWidth: 28 },
  commentLikeCount: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  commentLikeCountLiked: { color: "#EF4444" },
  footerTextLiked: { color: "#EF4444" },
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
  loadingWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#2563EB", borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
