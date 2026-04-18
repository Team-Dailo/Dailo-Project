// 관리자 - 댓글 관리 (GET /api/admin/comments)
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

const STATUS_LABELS: Record<string, string> = {
  VISIBLE: '공개',
  HIDDEN: '숨김',
  DELETED: '삭제됨',
};

const STATUS_COLORS: Record<string, string> = {
  VISIBLE: '#10B981',
  HIDDEN: '#F59E0B',
  DELETED: '#EF4444',
};

type FilterType = 'all' | 'reported';

export default function AdminCommentsScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [list, setList] = useState<adminService.AdminCommentItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false, nextPage?: number, newFilter?: FilterType) => {
    if (refresh) setRefreshing(true);
    else if (nextPage == null) setLoading(true);
    setError(null);
    try {
      const p = nextPage ?? (refresh ? 0 : page);
      const currentFilter = newFilter ?? filter;
      const res = currentFilter === 'reported'
        ? await adminService.getAdminReportedComments({ page: p, size: 20 })
        : await adminService.getAdminComments({ page: p, size: 20 });
      const newContent = res.content ?? [];
      setList((prev) => (refresh || p === 0 ? newContent : [...prev, ...newContent]));
      setTotalPages(res.totalPages ?? 0);
      setPage(res.number ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '댓글 목록 조회 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filter]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [filter])
  );

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setList([]);
      load(true, 0, newFilter);
    }
  };

  const handleHide = async (item: adminService.AdminCommentItem) => {
    try {
      await adminService.hideComment(item.id);
      load(true);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '숨김 처리 실패');
    }
  };

  const handleRestore = async (item: adminService.AdminCommentItem) => {
    try {
      await adminService.restoreComment(item.id);
      load(true);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '복원 실패');
    }
  };

  const handleDelete = (item: adminService.AdminCommentItem) => {
    Alert.alert('삭제 확인', '이 댓글을 삭제할까요? 이 작업은 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteAdminComment(item.id);
            load(true);
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제 실패');
          }
        },
      },
    ]);
  };

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            전체
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, filter === 'reported' && styles.filterChipActive]}
          onPress={() => handleFilterChange('reported')}
        >
          <Text style={[styles.filterChipText, filter === 'reported' && styles.filterChipTextActive]}>
            신고된 댓글
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
          }
        >
          {list.length === 0 ? (
            <Text style={styles.empty}>댓글이 없습니다.</Text>
          ) : (
            list.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' }]}>
                    <Text style={styles.badgeText}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                  </View>
                  {item.reportCount > 0 && (
                    <View style={styles.reportBadge}>
                      <Ionicons name="flag" size={12} color="#EF4444" />
                      <Text style={styles.reportBadgeText}>{item.reportCount}</Text>
                    </View>
                  )}
                  <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>
                    {item.authorNickname ?? `회원 #${item.authorId}`} · 게시글 #{item.postId}
                  </Text>
                </View>
                {item.status !== 'DELETED' && (
                  <View style={styles.actions}>
                    {item.status === 'VISIBLE' ? (
                      <Pressable style={styles.actionBtn} onPress={() => handleHide(item)}>
                        <Ionicons name="eye-off-outline" size={18} color="#F59E0B" />
                        <Text style={[styles.actionText, { color: '#F59E0B' }]}>숨김</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.actionBtn} onPress={() => handleRestore(item)}>
                        <Ionicons name="eye-outline" size={18} color="#10B981" />
                        <Text style={[styles.actionText, { color: '#10B981' }]}>복원</Text>
                      </Pressable>
                    )}
                    <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={[styles.actionText, { color: '#EF4444' }]}>삭제</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
          {list.length > 0 && page < totalPages - 1 && (
            <Pressable style={styles.moreButton} onPress={() => load(false, page + 1)}>
              <Text style={styles.moreButtonText}>더 보기</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  empty: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reportBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  meta: {
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  moreButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
});
