// app/profile/[id].tsx - 타 사용자 프로필 화면
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/auth.service';
import * as chatService from '../../services/chat.service';
import * as blockService from '../../services/block.service';
import * as reportService from '../../services/report.service';
import * as boardService from '../../services/board.service';
import type { MemberCommentItem } from '../../services/board.service';
import { useAuth } from '../../hooks/useAuth';
import { useAuthContext } from '../../contexts/AuthContext';
import { formatRelativeTime } from '../../utils/formatDate';
import type { PostListItem } from '../../types/board';

type TabType = 'posts' | 'comments';

const DEFAULT_PROFILE_IMAGE = require('../../assets/images/default-profile.png');

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isLoggedIn, logout } = useAuthContext();
  const [profile, setProfile] = useState<authService.MemberProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 메뉴 모달
  const [menuVisible, setMenuVisible] = useState(false);
  const [blockCheck, setBlockCheck] = useState<{ iBlockedThem: boolean; theyBlockedMe: boolean } | null>(null);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  // 게시글 목록
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 댓글 목록
  const [comments, setComments] = useState<MemberCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);

  const memberId = Number(id);
  const isMyProfile = currentUser?.id != null && Number(currentUser.id) === memberId;

  // 프로필 로드
  useEffect(() => {
    if (!memberId || memberId <= 0) {
      setError(true);
      setLoading(false);
      return;
    }

    // 본인 프로필이면 /profile로 리다이렉트
    if (isMyProfile) {
      router.replace('/profile');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(false);
      const data = await authService.getMemberProfile(memberId);
      if (data) {
        setProfile(data);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [memberId, isMyProfile, router]);

  // 차단 상태 확인
  useEffect(() => {
    if (!profile || memberId <= 0 || isMyProfile || !isLoggedIn) {
      setBlockCheck(null);
      return;
    }
    blockService.checkBlock(memberId).then(setBlockCheck).catch(() => setBlockCheck(null));
  }, [profile, memberId, isMyProfile, isLoggedIn]);

  // 게시글 로드
  const loadPosts = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (postsLoading && !reset) return;
    setPostsLoading(true);
    try {
      const data = await boardService.getPostsByMemberId(memberId, { page, size: 10 });
      if (page === 0 || reset) {
        setPosts(data.content);
      } else {
        setPosts(prev => [...prev, ...data.content]);
      }
      setHasMorePosts(data.content.length === 10);
      setPostsPage(page);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setPostsLoading(false);
    }
  }, [memberId, postsLoading]);

  // 댓글 로드
  const loadComments = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (commentsLoading && !reset) return;
    setCommentsLoading(true);
    try {
      const data = await boardService.getCommentsByMemberId(memberId, { page, size: 10 });
      if (page === 0 || reset) {
        setComments(data.content);
      } else {
        setComments(prev => [...prev, ...data.content]);
      }
      setHasMoreComments(data.content.length === 10);
      setCommentsPage(page);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [memberId, commentsLoading]);

  // 프로필 로드 후 게시글과 댓글 로드
  useEffect(() => {
    if (profile && memberId > 0) {
      loadPosts(0, true);
      loadComments(0, true);
    }
  }, [profile, memberId]);

  // 새로고침
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const data = await authService.getMemberProfile(memberId);
      if (data) setProfile(data);
      await Promise.all([loadPosts(0, true), loadComments(0, true)]);
    } finally {
      setRefreshing(false);
    }
  }, [memberId, refreshing, loadPosts, loadComments]);

  // 채팅하기
  const handleSendChat = async () => {
    setMenuVisible(false);
    if (!isLoggedIn) {
      Alert.alert('로그인 필요', '채팅 기능은 로그인 후 사용할 수 있습니다.', [
        { text: '취소' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    try {
      const token = await authService.getAccessToken();
      if (!token?.trim()) {
        await logout();
        Alert.alert('로그인 필요', '로그인이 필요합니다.', [
          { text: '확인', onPress: () => router.push('/login') },
        ]);
        return;
      }
      const room = await chatService.createRoom(memberId);
      router.push(`/board/chat/${room.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '채팅방을 열 수 없습니다.';
      Alert.alert('오류', msg);
    }
  };

  // 차단하기
  const handleBlock = () => {
    setMenuVisible(false);
    if (!isLoggedIn) {
      Alert.alert('로그인 필요', '차단 기능은 로그인 후 사용할 수 있습니다.', [
        { text: '취소' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (blockCheck?.iBlockedThem) return;
    Alert.alert('차단', '이 사용자를 차단하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockService.blockUser(memberId);
            Alert.alert('차단됨', '사용자를 차단했습니다.');
            router.back();
          } catch {
            Alert.alert('오류', '차단에 실패했습니다.');
          }
        },
      },
    ]);
  };

  // 신고하기
  const handleReport = () => {
    setMenuVisible(false);
    if (!isLoggedIn) {
      Alert.alert('로그인 필요', '신고 기능은 로그인 후 사용할 수 있습니다.', [
        { text: '취소' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return;
    }
    const reasons: { title: string; reason: reportService.ReportReason }[] = [
      { title: '스팸', reason: 'SPAM' },
      { title: '욕설/혐오', reason: 'ABUSE' },
      { title: '부적절한 내용', reason: 'INAPPROPRIATE' },
      { title: '기타', reason: 'OTHER' },
    ];
    Alert.alert(
      '신고',
      '신고 사유를 선택해 주세요.',
      [
        { text: '취소', style: 'cancel' },
        ...reasons.map((r) => ({
          text: r.title,
          onPress: async () => {
            try {
              await reportService.createReport({
                targetType: 'USER',
                targetId: memberId,
                reason: r.reason,
              });
              Alert.alert('완료', '신고가 접수되었습니다.');
            } catch {
              Alert.alert('오류', '신고 접수에 실패했습니다.');
            }
          },
        })),
      ]
    );
  };

  // 게시글 클릭
  const handlePostPress = (postId: number) => {
    router.push(`/board/${postId}`);
  };

  // 더 불러오기
  const handleLoadMore = () => {
    if (activeTab === 'posts') {
      if (hasMorePosts && !postsLoading) {
        loadPosts(postsPage + 1);
      }
    } else {
      if (hasMoreComments && !commentsLoading) {
        loadComments(commentsPage + 1);
      }
    }
  };

  // 댓글 클릭 (해당 게시글로 이동)
  const handleCommentPress = (postId: number) => {
    router.push(`/board/${postId}`);
  };

  const profileImageUrl = profile?.profileImageUrl?.trim();
  const hasProfileImage = profileImageUrl && profileImageUrl.length > 0;

  // 게시글 아이템 렌더링
  const renderPostItem = ({ item }: { item: PostListItem }) => {
    const imageUrls = item.imageUrls ?? (item as Record<string, unknown>).image_urls as string[] | undefined;
    const hasImage = Array.isArray(imageUrls) && imageUrls.length > 0;
    return (
      <Pressable style={styles.postItem} onPress={() => handlePostPress(item.id)}>
        <View style={styles.postContent}>
          <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.postExcerpt} numberOfLines={2}>{item.content}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postTime}>{formatRelativeTime(item.createdAt)}</Text>
            <View style={styles.postStats}>
              <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
              <Text style={styles.postStatText}>{item.likeCount ?? 0}</Text>
              <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" style={{ marginLeft: 8 }} />
              <Text style={styles.postStatText}>{item.commentCount ?? 0}</Text>
            </View>
          </View>
        </View>
        {hasImage && (
          <Image source={{ uri: imageUrls[0] }} style={styles.postThumbnail} />
        )}
      </Pressable>
    );
  };

  // 댓글 아이템 렌더링
  const renderCommentItem = ({ item }: { item: MemberCommentItem }) => {
    return (
      <Pressable style={styles.commentItem} onPress={() => handleCommentPress(item.postId)}>
        <View style={styles.commentContent}>
          {item.postTitle && (
            <Text style={styles.commentPostTitle} numberOfLines={1}>
              {item.postTitle}
            </Text>
          )}
          <Text style={styles.commentText} numberOfLines={2}>{item.content}</Text>
          <View style={styles.postMeta}>
            <Text style={styles.postTime}>{formatRelativeTime(item.createdAt)}</Text>
            <View style={styles.postStats}>
              <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
              <Text style={styles.postStatText}>{item.likeCount ?? 0}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // 헤더 컴포넌트
  const renderHeader = () => (
    <View style={styles.profileSection}>
      {/* 아바타 */}
      <View style={styles.avatarSection}>
        {hasProfileImage ? (
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Image
              source={DEFAULT_PROFILE_IMAGE}
              style={[styles.avatar, styles.defaultProfileImageZoom]}
              resizeMode="cover"
            />
          </View>
        )}
      </View>

      {/* 닉네임 */}
      <Text style={styles.nickname}>{profile?.nickname}</Text>

      {/* 통계 정보 */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.postCount ?? 0}</Text>
          <Text style={styles.statLabel}>게시글</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.receivedLikeCount ?? 0}</Text>
          <Text style={styles.statLabel}>받은 좋아요</Text>
        </View>
      </View>

      {/* 채팅하기 버튼 */}
      <Pressable style={styles.chatButton} onPress={handleSendChat}>
        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
        <Text style={styles.chatButtonText}>채팅하기</Text>
      </Pressable>

      {/* 탭 버튼 */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'posts' && styles.tabButtonActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'posts' && styles.tabButtonTextActive]}>
            게시물
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'comments' && styles.tabButtonActive]}
          onPress={() => setActiveTab('comments')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'comments' && styles.tabButtonTextActive]}>
            댓글
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // 빈 목록 컴포넌트
  const renderEmpty = () => {
    const isLoading = activeTab === 'posts' ? postsLoading : commentsLoading;
    const emptyText = activeTab === 'posts' ? '작성한 게시글이 없습니다.' : '작성한 댓글이 없습니다.';
    return !isLoading ? (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    ) : null;
  };

  // 푸터 컴포넌트
  const renderFooter = () => {
    const isLoading = activeTab === 'posts' ? postsLoading : commentsLoading;
    const dataLength = activeTab === 'posts' ? posts.length : comments.length;
    return isLoading && dataLength > 0 ? (
      <ActivityIndicator size="small" color="#4C8BF5" style={{ paddingVertical: 16 }} />
    ) : null;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>프로필</Text>
        {profile && !error ? (
          <Pressable onPress={() => setMenuVisible(true)} hitSlop={12}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
          </Pressable>
        ) : (
          <View style={styles.headerRight} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4C8BF5" />
        </View>
      ) : error || !profile ? (
        <View style={styles.content}>
          <Text style={styles.errorText}>
            사용자를 찾을 수 없습니다.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'posts' ? posts : comments}
          keyExtractor={(item) => `${activeTab}-${item.id}`}
          renderItem={activeTab === 'posts'
            ? (props) => renderPostItem(props as { item: PostListItem })
            : (props) => renderCommentItem(props as { item: MemberCommentItem })
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 더보기 메뉴 모달 */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
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
                {blockCheck?.iBlockedThem ? '이미 차단한 사용자' : '차단하기'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 24,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  defaultProfileImageZoom: {
    position: 'absolute',
    transform: [{ scale: 1.35 }],
  },
  nickname: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 48,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4C8BF5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginBottom: 20,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4C8BF5',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabButtonTextActive: {
    color: '#4C8BF5',
    fontWeight: '600',
  },
  postItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postContent: {
    flex: 1,
    marginRight: 12,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  postExcerpt: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  postThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentContent: {
    flex: 1,
  },
  commentPostTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4C8BF5',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 16,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuText: {
    fontSize: 15,
    color: '#111827',
  },
  menuTextDanger: {
    color: '#DC2626',
  },
  menuTextMuted: {
    color: '#9CA3AF',
  },
});
