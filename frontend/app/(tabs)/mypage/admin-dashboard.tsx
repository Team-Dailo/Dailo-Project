// 관리자 - 대시보드 (GET /api/admin/dashboard)
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
      <Text style={styles.statValue}>{(value ?? 0).toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

export default function AdminDashboardScreen() {
  const [data, setData] = useState<adminService.DashboardResponse | null>(null);
  const [activityData, setActivityData] = useState<adminService.DailyActivityResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [dashboardRes, activityRes] = await Promise.all([
        adminService.getDashboard(),
        adminService.getDailyActivity(selectedDate),
      ]);
      setData(dashboardRes);
      setActivityData(activityRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : '대시보드 조회 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  const loadActivity = useCallback(async (date: string) => {
    try {
      const res = await adminService.getDailyActivity(date);
      setActivityData(res);
    } catch (e) {
      // 에러 무시
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeDate = (delta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + delta);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setSelectedDate(newDate);
    loadActivity(newDate);
  };

  const getMaxCount = (hourlyCounts: adminService.HourlyCount[]): number => {
    const max = Math.max(...hourlyCounts.map((h) => h.count));
    return max > 0 ? max : 1;
  };

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
        <Text style={styles.errorText}>{error && !error.includes("<html") && !error.includes("<!DOCTYPE") ? error : null}</Text>
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

      {/* 시간대별 사용자 활동 */}
      <Text style={styles.sectionTitle}>시간대별 사용자 활동</Text>
      <View style={styles.activityCard}>
        {/* 날짜 선택 */}
        <View style={styles.datePicker}>
          <Pressable style={styles.dateArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={20} color="#6B7280" />
          </Pressable>
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
          <Pressable style={styles.dateArrow} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </Pressable>
        </View>

        {/* 총 조회수 */}
        {activityData && (
          <View style={styles.totalRow}>
            <Ionicons name="eye-outline" size={18} color="#6366F1" />
            <Text style={styles.totalLabel}>총 조회수</Text>
            <Text style={styles.totalValue}>{(activityData.totalClicks ?? 0).toLocaleString()}회</Text>
          </View>
        )}

        {/* 시간대별 차트 */}
        {activityData && activityData.hourlyCounts && (
          <View style={styles.chart}>
            {activityData.hourlyCounts.map((item) => {
              const maxCount = getMaxCount(activityData.hourlyCounts);
              const heightPercent = (item.count / maxCount) * 100;
              return (
                <View key={item.hour} style={styles.barContainer}>
                  <Text style={styles.barCount}>
                    {item.count > 0 ? item.count : ''}
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(heightPercent, 3)}%`,
                        backgroundColor: item.count > 0 ? '#6366F1' : '#E5E7EB',
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>
                    {item.hour % 6 === 0 ? `${item.hour}시` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {!activityData && (
          <View style={styles.noActivity}>
            <Ionicons name="bar-chart-outline" size={32} color="#9CA3AF" />
            <Text style={styles.noActivityText}>활동 데이터 없음</Text>
          </View>
        )}
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
  // 시간대별 활동 스타일
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dateArrow: {
    padding: 8,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 1,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCount: {
    fontSize: 7,
    color: '#6B7280',
    marginBottom: 2,
  },
  bar: {
    width: '70%',
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
    height: 12,
  },
  noActivity: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noActivityText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
