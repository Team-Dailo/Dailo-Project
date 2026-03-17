// app/board/[id].tsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
  Image,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ImageViewing from "react-native-image-viewing";
import * as Clipboard from "expo-clipboard";
import { useAuthContext } from "../../contexts/AuthContext";
import { usePostDetail, useComments } from "../../hooks/useBoard";
import { formatRelativeTime } from "../../utils/formatDate";
import * as boardService from "../../services/board.service";
import * as reportService from "../../services/report.service";
import * as authService from "../../services/auth.service";
import * as blockService from "../../services/block.service";
import * as chatService from "../../services/chat.service";
import * as savedPostService from "../../services/savedPost.service";

const DEFAULT_PROFILE_IMAGE = require("../../assets/images/default-profile.png");

type CommentDisplay = {
  id: string;
  authorId: number | null;
  author: string | null;
  authorProfileImageUrl: string | null;
  time: string;
  content: string | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  replies: CommentDisplay[];
};

function toCommentDisplay(c: { id: number; authorId: number | null; authorNickname?: string | null; authorProfileImageUrl?: string | null; author_profile_image_url?: string | null; content: string | null; likeCount: number; createdAt: string; updatedAt?: string; deleted?: boolean; replies?: unknown[] }): CommentDisplay {
  const raw = c as Record<string, unknown>;
  const isDeleted = c.deleted === true || raw.deleted === true;

  const nick = (c.authorNickname ?? raw.author_nickname) as string | null | undefined;
  const author = isDeleted ? null : (typeof nick === "string" && nick.trim()) ? nick.trim() : `user_${c.authorId}`;
  const profileUrl = (raw.authorProfileImageUrl ?? raw.author_profile_image_url ?? c.authorProfileImageUrl) as string | null | undefined;
  const authorProfileImageUrl = isDeleted ? null : (profileUrl && typeof profileUrl === "string" && profileUrl.trim() ? profileUrl.trim() : null);
  const replies = (c.replies ?? []).map((r: unknown) => toCommentDisplay(r as Parameters<typeof toCommentDisplay>[0]));

  return {
    id: String(c.id),
    authorId: isDeleted ? null : c.authorId,
    author,
    authorProfileImageUrl,
    time: formatRelativeTime(c.createdAt),
    content: isDeleted ? null : c.content,
    likes: isDeleted ? 0 : (c.likeCount ?? 0),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt ?? c.createdAt,
    deleted: isDeleted,
    replies,
  };
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: winWidth } = useWindowDimensions();
  const { isLoggedIn, user, logout } = useAuthContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToAuthor, setReplyingToAuthor] = useState<string | null>(null);
  /** 이 게시글에서 삭제한 댓글 ID (나갔다 들어와도 서버가 삭제된 댓글을 주는 경우 대비) */
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const commentSectionY = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const { post, loading: postLoading, error: postError, refetch: refetchPost } = usePostDetail(id);
  const { comments: apiComments, loading: commentsLoading, refetch: refetchComments, removeComment } = useComments(id);

  const onRefresh = useCallback(async () => {
    if (refreshing) return; // 중복 새로고침 방지
    setRefreshing(true);
    try {
      await Promise.all([refetchPost(), refetchComments()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, refetchPost, refetchComments]);

  useEffect(() => {
    setDeletedCommentIds(new Set());
  }, [id]);

  const postAuthorId = post ? Number((post as Record<string, unknown>).author_id ?? post.authorId ?? 0) : 0;
  const isMyPost = Boolean(post && user?.id != null && postAuthorId !== 0 && Number(postAuthorId) === Number(user.id));
  const [blockCheck, setBlockCheck] = useState<{ iBlockedThem: boolean; theyBlockedMe: boolean } | null>(null);
  const [isSavedPost, setIsSavedPost] = useState(false);

  useEffect(() => {
    if (!id || !Number.isFinite(Number(id))) return;
    savedPostService.isSavedPost(Number(id)).then(setIsSavedPost);
  }, [id]);

  useEffect(() => {
    if (!post || postAuthorId <= 0 || isMyPost) {
      setBlockCheck(null);
      return;
    }
    blockService.checkBlock(postAuthorId).then(setBlockCheck).catch(() => setBlockCheck(null));
  }, [post, postAuthorId, isMyPost]);

  /** 항상 API에서 온 작성자 닉네임 표시 (백엔드가 실제 작성자 정보 반환) */
  const authorDisplayName = post
    ? (post.authorNickname ?? (post as Record<string, unknown>).author_nickname ?? `user_${postAuthorId}`)
    : "";
  const postAuthorProfileUrl = post
    ? ((post as Record<string, unknown>).authorProfileImageUrl ?? (post as Record<string, unknown>).author_profile_image_url) as string | null | undefined
    : undefined;
  const hasPostAuthorPhoto = postAuthorProfileUrl && typeof postAuthorProfileUrl === "string" && postAuthorProfileUrl.trim();

  const filteredApiComments = useMemo(
    () =>
      apiComments
        .filter((c) => {
          // 로컬에서 삭제한 댓글 제외
          if (deletedCommentIds.has(String(c.id))) return false;
          // 서버에서 삭제된 댓글 중 대댓글이 없는 것 제외
          const raw = c as Record<string, unknown>;
          const isDeleted = c.deleted === true || raw.deleted === true;
          if (isDeleted) {
            const replies = (c.replies ?? []).filter((r) => {
              const rRaw = r as Record<string, unknown>;
              return !(r.deleted === true || rRaw.deleted === true);
            });
            return replies.length > 0;
          }
          return true;
        })
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => !deletedCommentIds.has(String(r.id))),
        })),
    [apiComments, deletedCommentIds]
  );
  const comments = useMemo(() => filteredApiComments.map(toCommentDisplay), [filteredApiComments]);
  const likeCount = post ? (post.likeCount ?? 0) : 0;

  useEffect(() => {
    setLiked(post?.isLiked ?? false);
  }, [post?.id, post?.isLiked]);

  const handleSavePost = async () => {
    setMenuVisible(false);
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "저장 기능은 로그인 후 사용할 수 있습니다.", [
        { text: "취소" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    if (!id || !post) return;
    const postId = Number(id);
    if (!Number.isFinite(postId)) return;
    try {
      const added = await savedPostService.toggleSavedPost(
        postId,
        post.title ?? "",
        (post as Record<string, unknown>).createdAt as string | undefined,
        ((post as Record<string, unknown>).imageUrls as string[] | undefined)?.[0]
      );
      setIsSavedPost(added);
      Alert.alert(added ? "저장됨" : "저장 해제", added ? "게시글을 저장했습니다." : "저장을 해제했습니다.");
    } catch {
      Alert.alert("오류", "저장 처리에 실패했습니다.");
    }
  };

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
    if (blockCheck?.iBlockedThem) return;
    const authorId = post?.authorId ?? postAuthorId;
    if (!authorId) return;
    Alert.alert("차단", "이 사용자를 차단하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            await blockService.blockUser(authorId);
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
    const targetId = post?.authorId ?? postAuthorId;
    if (!targetId || targetId <= 0) return;
    const myId = user?.id != null ? Number(user.id) : null;
    if (myId != null && Number(targetId) === myId) {
      Alert.alert("알림", "본인 글에는 채팅을 보낼 수 없습니다.");
      return;
    }
    (async () => {
      try {
        const token = await authService.getAccessToken();
        if (!token?.trim()) {
          await logout();
          Alert.alert(
            "로그인 필요",
            "채팅을 사용하려면 로그인이 필요합니다. 마이페이지에서 로그인해 주세요.",
            [{ text: "확인", onPress: () => router.push("/login") }]
          );
          return;
        }
        const me = await authService.getMe();
        if (!me) {
          await authService.clearAuthStorage();
          await logout();
          Alert.alert(
            "로그인 필요",
            "로그인이 만료되었습니다. 다시 로그인해 주세요.",
            [{ text: "확인", onPress: () => router.push("/login") }]
          );
          return;
        }
        const room = await chatService.createRoom(Number(targetId));
        router.push(`/board/chat/${room.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "채팅방을 열 수 없습니다.";
        const isAuthError = msg.includes("로그인이 만료") || msg.includes("로그인");
        if (isAuthError) {
          await authService.clearAuthStorage();
          await logout();
        }
        Alert.alert(
          isAuthError ? "로그인 필요" : "오류",
          msg,
          isAuthError ? [{ text: "확인", onPress: () => router.push("/login") }] : undefined
        );
      }
    })();
  };

  const handleEditPost = () => {
    setMenuVisible(false);
    if (!id) return;
    router.push({ pathname: "/board/write", params: { edit: id } });
  };

  const handleDeletePost = () => {
    setMenuVisible(false);
    if (!id) return;
    Alert.alert("삭제", "이 게시물을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await boardService.deletePost(id);
            router.back();
          } catch {
            Alert.alert("오류", "삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !id) return;
    if (!isLoggedIn) {
      Alert.alert(
        "로그인이 필요합니다",
        "댓글을 달려면 로그인해 주세요.",
        [
          { text: "취소", style: "cancel" },
          { text: "로그인", onPress: () => router.push("/login") },
        ]
      );
      return;
    }
    setSubmittingComment(true);
    try {
      const payload: { content: string; parentCommentId?: number } = { content: commentText.trim() };
      if (replyingToCommentId) {
        payload.parentCommentId = Number(replyingToCommentId);
      }
      await boardService.createComment(id, payload);
      setCommentText("");
      setReplyingToCommentId(null);
      setReplyingToAuthor(null);
      refetchComments();
      refetchPost();
    } catch {
      Alert.alert("오류", "댓글을 등록할 수 없습니다.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReply = (commentId: string, author: string) => {
    setReplyingToCommentId(commentId);
    setReplyingToAuthor(author);
  };

  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setReplyingToAuthor(null);
  };

  const handleProfilePress = (authorId: number) => {
    if (!authorId || authorId <= 0) return;
    router.push(`/profile/${authorId}`);
  };

  const toggleLike = async () => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "좋아요를 누르려면 로그인해 주세요.", [
        { text: "취소", style: "cancel" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    if (!id) return;
    try {
      const userId = user?.id != null ? Number(user.id) : undefined;
      const res = await boardService.togglePostLike(id, userId);
      setLiked(res.liked);
      await refetchPost();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "좋아요 처리에 실패했습니다.";
      const isAuthError = msg.includes("로그인이 만료");
      Alert.alert(
        isAuthError ? "로그인 필요" : "오류",
        isAuthError ? "로그인이 만료되었습니다. 다시 로그인해 주세요." : msg,
        isAuthError ? [{ text: "확인", onPress: () => router.push("/login") }] : undefined
      );
    }
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

  const isMyComment = (commentId: string) => {
    // 최상위 댓글에서 찾기
    let comment = apiComments.find((f) => String(f.id) === commentId);
    // 대댓글에서도 찾기
    if (!comment) {
      for (const c of apiComments) {
        const reply = c.replies?.find((r) => String(r.id) === commentId);
        if (reply) {
          comment = reply;
          break;
        }
      }
    }
    return comment && user?.id != null && Number(comment.authorId) === Number(user.id);
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentMenuId(null);
    Alert.alert("삭제", "이 댓글을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await boardService.deleteComment(commentId);
            setDeletedCommentIds((prev) => new Set(prev).add(commentId));
            removeComment(commentId);
            await refetchPost();
          } catch {
            Alert.alert("오류", "댓글 삭제에 실패했습니다.");
          }
        },
      },
    ]);
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#6366F1"]}
              tintColor="#6366F1"
            />
          }
        >
          {postLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#4C8BF5" />
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
                <Pressable style={styles.postHeader} onPress={() => handleProfilePress(postAuthorId)}>
                  {hasPostAuthorPhoto ? (
                    <Image source={{ uri: postAuthorProfileUrl! }} style={styles.profileCircle} resizeMode="cover" />
                  ) : (
                    <View style={styles.profileCircle}>
                      <Image source={DEFAULT_PROFILE_IMAGE} style={[styles.profileCircle, styles.defaultProfileImageZoom]} resizeMode="cover" />
                    </View>
                  )}
                  <View style={styles.postMeta}>
                    <Text style={styles.author}>{authorDisplayName}</Text>
                    <Text style={styles.timeText}>{formatRelativeTime(post.createdAt)}</Text>
                  </View>
                </Pressable>
                {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                {post.categoryType === "후기" && (post.eventTitle ?? (post as Record<string, unknown>).event_title) ? (
                  <Pressable
                    style={styles.eventBadge}
                    onPress={() => {
                      const eventId = post.eventId ?? (post as Record<string, unknown>).event_id;
                      const id = typeof eventId === "number" ? eventId : Number(eventId);
                      if (Number.isFinite(id) && id > 0) {
                        router.push(`/event/${id}?source=board` as import("expo-router").Href);
                      }
                    }}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#4C8BF5" />
                    <Text style={styles.eventBadgeText}>
                      {post.eventTitle ?? (post as Record<string, unknown>).event_title ?? ""}
                    </Text>
                  </Pressable>
                ) : null}
                {(() => {
                  const urls = post.imageUrls ?? (post as Record<string, unknown>).image_urls as string[] | undefined;
                  const list = Array.isArray(urls) ? urls : [];
                  if (list.length === 0) return null;
                  const gap = 8;
                  const size = Math.floor((winWidth - 32 - gap * 2) / 3);
                  return (
                    <View style={styles.postImagesWrap}>
                      {list.map((uri, index) => (
                        <Pressable
                          key={uri}
                          onPress={() => {
                            setImageViewerIndex(index);
                            setImageViewerVisible(true);
                          }}
                        >
                          <Image
                            source={{ uri }}
                            style={[styles.postImage, { width: size, height: size }]}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </View>
                  );
                })()}
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
                    <Text style={styles.footerText}>
                      {commentsLoading ? (post.commentCount ?? 0) : comments.length}
                    </Text>
                  </Pressable>
                  {/* 종이비행기(공유/채팅) 아이콘 비노출 처리
                  <View style={styles.footerItem}>
                    <Ionicons name="paper-plane-outline" size={18} color="#4B5563" />
                  </View>
                  */}
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
                  <ActivityIndicator size="small" color="#4C8BF5" style={{ marginVertical: 16 }} />
                ) : (
                  comments.map((c) => {
              const commentLiked = likedCommentIds.has(c.id);
              const commentLikeCount = c.likes + (commentLiked ? 1 : 0);
              const isMine = !c.deleted && isMyComment(c.id);
              const hasCommentPhoto = !c.deleted && c.authorProfileImageUrl?.trim();
              const isEdited = !c.deleted && new Date(c.updatedAt) > new Date(c.createdAt);
              return (
                <View key={c.id}>
                  <View style={styles.commentRow}>
                    {c.deleted ? (
                      <View style={styles.deletedCommentAvatar} />
                    ) : (
                      <Pressable onPress={() => c.authorId && handleProfilePress(c.authorId)}>
                        {hasCommentPhoto ? (
                          <Image source={{ uri: c.authorProfileImageUrl! }} style={styles.commentAvatar} resizeMode="cover" />
                        ) : (
                          <View style={styles.commentAvatar}>
                            <Image source={DEFAULT_PROFILE_IMAGE} style={[styles.commentAvatar, styles.defaultProfileImageZoom]} resizeMode="cover" />
                          </View>
                        )}
                      </Pressable>
                    )}
                    <View style={styles.commentBody}>
                      {c.deleted ? (
                        <Text style={styles.deletedCommentText}>(삭제된 댓글)</Text>
                      ) : (
                        <>
                          <View style={styles.commentHeader}>
                            <Pressable onPress={() => c.authorId && handleProfilePress(c.authorId)}>
                              <Text style={styles.commentAuthor}>{c.author}</Text>
                            </Pressable>
                            <Text style={styles.commentTime}>{c.time}</Text>
                            {isEdited && <Text style={styles.commentEdited}>(수정됨)</Text>}
                            {isMine && (
                              <Pressable
                                style={styles.commentMenuBtn}
                                onPress={() => setCommentMenuId(commentMenuId === c.id ? null : c.id)}
                              >
                                <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
                              </Pressable>
                            )}
                          </View>
                          <Text style={styles.commentContent}>{c.content}</Text>
                          <Pressable style={styles.replyBtn} onPress={() => handleReply(c.id, c.author ?? "")}>
                            <Text style={styles.replyBtnText}>답글</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                    {!c.deleted && (
                      <View style={styles.commentRight}>
                        {commentMenuId === c.id && (
                          <View style={styles.commentDropdown}>
                            <Pressable style={styles.commentDropdownItem} onPress={() => handleDeleteComment(c.id)}>
                              <Text style={[styles.commentDropdownText, styles.commentDropdownTextDanger]}>삭제</Text>
                            </Pressable>
                          </View>
                        )}
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
                    )}
                  </View>
                  {/* 대댓글 렌더링 */}
                  {c.replies.map((reply) => {
                    const replyLiked = likedCommentIds.has(reply.id);
                    const replyLikeCount = reply.likes + (replyLiked ? 1 : 0);
                    const isMyReply = !reply.deleted && isMyComment(reply.id);
                    const hasReplyPhoto = !reply.deleted && reply.authorProfileImageUrl?.trim();
                    const isReplyEdited = !reply.deleted && new Date(reply.updatedAt) > new Date(reply.createdAt);
                    return (
                      <View key={reply.id} style={styles.replyRow}>
                        {reply.deleted ? (
                          <View style={styles.deletedReplyAvatar} />
                        ) : (
                          <Pressable onPress={() => reply.authorId && handleProfilePress(reply.authorId)}>
                            {hasReplyPhoto ? (
                              <Image source={{ uri: reply.authorProfileImageUrl! }} style={styles.replyAvatar} resizeMode="cover" />
                            ) : (
                              <View style={styles.replyAvatar}>
                                <Image source={DEFAULT_PROFILE_IMAGE} style={[styles.replyAvatar, styles.defaultProfileImageZoom]} resizeMode="cover" />
                              </View>
                            )}
                          </Pressable>
                        )}
                        <View style={styles.commentBody}>
                          {reply.deleted ? (
                            <Text style={styles.deletedCommentText}>(삭제된 댓글)</Text>
                          ) : (
                            <>
                              <View style={styles.commentHeader}>
                                <Pressable onPress={() => reply.authorId && handleProfilePress(reply.authorId)}>
                                  <Text style={styles.commentAuthor}>{reply.author}</Text>
                                </Pressable>
                                <Text style={styles.commentTime}>{reply.time}</Text>
                                {isReplyEdited && <Text style={styles.commentEdited}>(수정됨)</Text>}
                                {isMyReply && (
                                  <Pressable
                                    style={styles.commentMenuBtn}
                                    onPress={() => setCommentMenuId(commentMenuId === reply.id ? null : reply.id)}
                                  >
                                    <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
                                  </Pressable>
                                )}
                              </View>
                              <Text style={styles.commentContent}>{reply.content}</Text>
                            </>
                          )}
                        </View>
                        {!reply.deleted && (
                          <View style={styles.commentRight}>
                            {commentMenuId === reply.id && (
                              <View style={styles.commentDropdown}>
                                <Pressable style={styles.commentDropdownItem} onPress={() => handleDeleteComment(reply.id)}>
                                  <Text style={[styles.commentDropdownText, styles.commentDropdownTextDanger]}>삭제</Text>
                                </Pressable>
                              </View>
                            )}
                            <Pressable style={styles.commentLikeWrap} onPress={() => toggleCommentLike(reply.id)}>
                              <Ionicons
                                name={replyLiked ? "heart" : "heart-outline"}
                                size={16}
                                color={replyLiked ? "#EF4444" : "#9CA3AF"}
                              />
                              <Text style={[styles.commentLikeCount, replyLiked && styles.commentLikeCountLiked]}>
                                {replyLikeCount}
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
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
        <View>
          {replyingToCommentId && (
            <View style={styles.replyingIndicator}>
              <Text style={styles.replyingText}>
                {replyingToAuthor}님에게 답글 작성 중
              </Text>
              <Pressable onPress={handleCancelReply} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#6B7280" />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>{isLoggedIn && user?.name ? user.name : "Me"}</Text>
            <TextInput
              style={styles.input}
              placeholder={replyingToCommentId ? "답글을 입력하세요" : "댓글을 입력하세요"}
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
        </View>
        )}
      </KeyboardAvoidingView>

      {/* 더보기 메뉴: 본인글 → 저장, 수정, 삭제(빨간색) / 타인글 → 저장, 신고, 차단 (저장은 로그인 시에만) */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Pressable
              style={[styles.menuItem, !isLoggedIn && styles.menuItemDisabled]}
              onPress={handleSavePost}
            >
              <Text style={[styles.menuText, !isLoggedIn && styles.menuTextMuted]}>
                {isSavedPost ? "저장 해제" : "저장"}
              </Text>
            </Pressable>
            {isMyPost ? (
              <>
                <Pressable style={styles.menuItem} onPress={handleEditPost}>
                  <Text style={styles.menuText}>수정</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={handleDeletePost}>
                  <Text style={[styles.menuText, styles.menuTextDanger]}>삭제</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.menuItem} onPress={handleSendChat}>
                  <Text style={styles.menuText}>채팅하기</Text>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={handleReport}>
                  <Text style={styles.menuText}>신고</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={blockCheck?.iBlockedThem ? () => setMenuVisible(false) : handleBlock}
                  disabled={blockCheck?.iBlockedThem}
                >
                  <Text
                    style={[
                      styles.menuText,
                      blockCheck?.iBlockedThem ? styles.menuTextMuted : styles.menuTextDanger,
                    ]}
                  >
                    {blockCheck?.iBlockedThem ? "이미 차단한 사용자" : "차단하기"}
                  </Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 이미지 확대 뷰어 */}
      <ImageViewing
        images={(() => {
          const urls = post?.imageUrls ?? (post as Record<string, unknown> | null)?.image_urls as string[] | undefined;
          const list = Array.isArray(urls) ? urls : [];
          return list.map((uri) => ({ uri }));
        })()}
        imageIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginLeft: 20 },
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
    overflow: "hidden",
  },
  postMeta: { marginLeft: 10 },
  author: { fontSize: 15, fontWeight: "600", color: "#111827" },
  timeText: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  postTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginBottom: 8 },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  eventBadgeText: { fontSize: 13, fontWeight: "500", color: "#1D4ED8" },
  postImagesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  postImage: { borderRadius: 8, backgroundColor: "#F3F4F6" },
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
    overflow: "hidden",
  },
  defaultProfileImageZoom: {
    position: "absolute",
    transform: [{ scale: 1.35 }],
  },
  commentBody: { flex: 1, marginLeft: 10 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: "#111827" },
  commentTime: { fontSize: 11, color: "#9CA3AF" },
  commentContent: { fontSize: 13, color: "#374151", lineHeight: 18 },
  commentRight: { alignItems: "flex-end", gap: 4 },
  commentMenuBtn: { padding: 4, marginLeft: 4 },
  commentDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  commentDropdownItem: { paddingVertical: 10, paddingHorizontal: 14 },
  commentDropdownText: { fontSize: 14, color: "#111827" },
  commentDropdownTextDanger: { color: "#DC2626" },
  commentLikeWrap: { alignItems: "center", padding: 4, minWidth: 28 },
  commentLikeCount: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  commentLikeCountLiked: { color: "#EF4444" },
  commentEdited: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },
  replyBtn: { marginTop: 4 },
  replyBtnText: { fontSize: 12, color: "#6B7280" },
  replyRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
    paddingLeft: 42, // 댓글 아바타(32) + 마진(10) = 42
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  deletedCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  deletedReplyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  deletedCommentText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    paddingVertical: 4,
  },
  replyingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  replyingText: { fontSize: 13, color: "#6B7280" },
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
  postBtnText: { fontSize: 14, fontWeight: "600", color: "#4C8BF5" },
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
  menuItemDisabled: { opacity: 0.6 },
  menuText: { fontSize: 15, color: "#111827" },
  menuTextDanger: { color: "#DC2626" },
  menuTextMuted: { color: "#9CA3AF" },
  loadingWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
