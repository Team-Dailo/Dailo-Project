// 관리자 - 설문 응답 목록
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '-'; }
}

export default function AdminSurveysScreen() {
  const [list, setList] = useState<adminService.SurveyAdminItem[]>([]);
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
      const res = await adminService.getAdminSurveyList({ page: p, size: 20 });
      const newContent = res.content ?? [];
      setList((prev) => (refresh || p === 0 ? newContent : [...prev, ...newContent]));
      setTotalPages(res.totalPages ?? 0);
      setPage(res.number ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : '설문 목록 조회 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(useCallback(() => { load(true); }, []));

  if (loading && list.length === 0) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6366F1" /></View>;
  }
  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />}
    >
      <Text style={styles.count}>총 {list.length}건</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>설문 응답이 없습니다.</Text>
      ) : (
        list.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.eventTitle} numberOfLines={1}>{item.eventTitle ?? `행사 #${item.eventId}`}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={14} color="#6B7280" />
              <Text style={styles.value}>{item.name}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="call-outline" size={14} color="#6B7280" />
              <Text style={styles.value}>{item.phone}</Text>
            </View>
            {item.feedback ? (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackLabel}>피드백</Text>
                <Text style={styles.feedbackText}>{item.feedback}</Text>
              </View>
            ) : null}
          </View>
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
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  empty: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 24 },
  count: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  date: { fontSize: 11, color: '#9CA3AF' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  value: { fontSize: 14, color: '#374151' },
  feedbackBox: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  feedbackLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  feedbackText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  moreButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  moreButtonText: { fontSize: 14, color: '#6366F1', fontWeight: '500' },
});
