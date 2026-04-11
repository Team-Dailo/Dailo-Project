// 관리자 - 활동 로그 (GET /api/admin/logs)
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
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

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#10B981',
  UPDATE: '#3B82F6',
  DELETE: '#EF4444',
  HIDE: '#F59E0B',
  RESTORE: '#8B5CF6',
  ANSWER: '#6366F1',
  SEND_PUSH: '#EC4899',
};

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  CREATE: 'add-circle-outline',
  UPDATE: 'pencil-outline',
  DELETE: 'trash-outline',
  HIDE: 'eye-off-outline',
  RESTORE: 'refresh-outline',
  ANSWER: 'chatbubble-outline',
  SEND_PUSH: 'notifications-outline',
};

export default function AdminLogsScreen() {
  const [list, setList] = useState<adminService.AdminLogItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false, nextPage?: number) => {
    if (refresh) setRefreshing(true);
    else if (nextPage == null) setLoading(true);
    setError(null);
    try {
      const p = nextPage ?? (refresh ? 0 : page);
      const res = await adminService.getAdminLogs({ page: p, size: 30 });
      const newContent = res.content ?? [];
      setList((prev) => (refresh || p === 0 ? newContent : [...prev, ...newContent]));
      setTotalPages(res.totalPages ?? 0);
      setPage(res.number ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그 조회 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [])
  );

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
      }
    >
      {list.length === 0 ? (
        <Text style={styles.empty}>활동 로그가 없습니다.</Text>
      ) : (
        list.map((item) => {
          const actionColor = ACTION_COLORS[item.action] ?? '#6B7280';
          const actionIcon = ACTION_ICONS[item.action] ?? 'ellipse-outline';
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: actionColor + '20' }]}>
                  <Ionicons name={actionIcon} size={18} color={actionColor} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.action}>{item.action}</Text>
                  <Text style={styles.target}>{item.targetType} #{item.targetId ?? '-'}</Text>
                </View>
                <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
              </View>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={styles.meta}>
                <Text style={styles.metaText}>{item.adminEmail}</Text>
                {item.ipAddress && (
                  <Text style={styles.metaText}> · {item.ipAddress}</Text>
                )}
              </View>
            </View>
          );
        })
      )}
      {list.length > 0 && page < totalPages - 1 && (
        <Pressable style={styles.moreButton} onPress={() => load(false, page + 1)}>
          <Text style={styles.moreButtonText}>더 보기</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  empty: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  target: {
    fontSize: 12,
    color: '#6B7280',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  description: {
    fontSize: 13,
    color: '#374151',
    marginTop: 8,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  moreButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
});
