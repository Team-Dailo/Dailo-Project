// 관리자 - 대시보드 (GET /api/admin/dashboard)
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color: string;
};

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconWrapper, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const [data, setData] = useState<adminService.DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboard();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '대시보드 조회 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !data) {
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

  if (!data) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
      }
    >
      <Text style={styles.sectionTitle}>오늘의 활동</Text>
      <View style={styles.row}>
        <StatCard icon="person-add-outline" label="오늘 가입" value={data.todaySignups} color="#10B981" />
        <StatCard icon="create-outline" label="오늘 게시글" value={data.todayPosts} color="#3B82F6" />
      </View>

      <Text style={styles.sectionTitle}>전체 통계</Text>
      <View style={styles.row}>
        <StatCard icon="people-outline" label="전체 회원" value={data.totalMembers} color="#6366F1" />
        <StatCard icon="newspaper-outline" label="전체 게시글" value={data.totalPosts} color="#8B5CF6" />
      </View>
      <View style={styles.row}>
        <StatCard icon="chatbubble-outline" label="전체 댓글" value={data.totalComments} color="#EC4899" />
        <StatCard icon="calendar-outline" label="전체 행사" value={data.totalEvents} color="#F59E0B" />
      </View>

      <Text style={styles.sectionTitle}>처리 대기</Text>
      <View style={styles.row}>
        <StatCard icon="flag-outline" label="대기 신고" value={data.pendingReports} color="#EF4444" />
        <StatCard icon="mail-outline" label="대기 문의" value={data.pendingInquiries} color="#F97316" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
});
