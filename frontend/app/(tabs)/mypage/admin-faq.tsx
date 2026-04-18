// 관리자 - FAQ 관리 (GET /api/admin/faq)
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
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

export default function AdminFaqScreen() {
  const router = useRouter();
  const [list, setList] = useState<adminService.FaqItem[]>([]);
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
      const res = await adminService.getAdminFaqList({ page: p, size: 20 });
      const newContent = res.content ?? [];
      setList((prev) => (refresh || p === 0 ? newContent : [...prev, ...newContent]));
      setTotalPages(res.totalPages ?? 0);
      setPage(res.number ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'FAQ 목록 조회 실패');
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

  const handleToggle = async (item: adminService.FaqItem) => {
    try {
      await adminService.toggleFaqActive(item.id);
      load(true);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  const handleDelete = (item: adminService.FaqItem) => {
    Alert.alert('삭제 확인', `"${item.question}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteFaq(item.id);
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

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
        }
      >
        {list.length === 0 ? (
          <Text style={styles.empty}>등록된 FAQ가 없습니다.</Text>
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: item.isActive ? '#10B981' : '#9CA3AF' }]}>
                  <Text style={styles.badgeText}>{item.isActive ? '활성' : '비활성'}</Text>
                </View>
                <Text style={styles.category}>{item.category}</Text>
              </View>
              <Text style={styles.question} numberOfLines={2}>{item.question}</Text>
              <Text style={styles.answer} numberOfLines={2}>{item.answer}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => handleToggle(item)}>
                  <Ionicons name={item.isActive ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6B7280" />
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/(tabs)/mypage/admin-faq-edit' as any, params: { id: String(item.id) } })}
                >
                  <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        )}
        {list.length > 0 && page < totalPages - 1 && (
          <Pressable style={styles.moreButton} onPress={() => load(false, page + 1)}>
            <Text style={styles.moreButtonText}>더 보기</Text>
          </Pressable>
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(tabs)/mypage/admin-faq-edit' as any)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 100 },
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
  category: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  answer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  actionBtn: {
    padding: 6,
  },
  moreButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
