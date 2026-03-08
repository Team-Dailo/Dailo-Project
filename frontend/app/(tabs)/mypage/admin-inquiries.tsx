// 관리자 - 문의 목록 (GET /api/admin/inquiries)
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as inquiryService from '../../../services/inquiry.service';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

export default function AdminInquiriesScreen() {
  const router = useRouter();
  const [list, setList] = useState<inquiryService.InquiryItem[]>([]);
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
      const res = await inquiryService.getInquiries({ page: p, size: 20 });
      const newContent = res.content ?? [];
      setList((prev) => (refresh || p === 0 ? newContent : [...prev, ...newContent]));
      setTotalPages(res.totalPages ?? 0);
      setPage(res.number ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록 조회 실패');
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
        <Text style={styles.empty}>접수된 문의가 없습니다.</Text>
      ) : (
        list.map((item) => (
          <Pressable
            key={item.id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/(tabs)/mypage/admin-inquiry-detail', params: { id: String(item.id) } })}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.email} · {formatDate(item.createdAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        ))
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowMain: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  rowMeta: { fontSize: 12, color: '#6B7280' },
  moreButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
});
