// 관리자 - 앱 버전 관리 (GET /api/admin/app-version)
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

export default function AdminAppVersionsScreen() {
  const router = useRouter();
  const [list, setList] = useState<adminService.AppVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminAppVersionList();
      setList(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '앱 버전 목록 조회 실패');
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

  const handleDelete = (item: adminService.AppVersionItem) => {
    Alert.alert('삭제 확인', `${item.platform} 버전 정보를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteAppVersion(item.id);
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
        <Text style={styles.errorText}>{error && !error.includes("<html") && !error.includes("<!DOCTYPE") ? error : null}</Text>
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
          <Text style={styles.empty}>등록된 앱 버전 정보가 없습니다.</Text>
        ) : (
          list.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.platformBadge}>
                  <Ionicons
                    name={item.platform === 'IOS' ? 'logo-apple' : 'logo-android'}
                    size={20}
                    color={item.platform === 'IOS' ? '#000000' : '#3DDC84'}
                  />
                  <Text style={styles.platformText}>{item.platform}</Text>
                </View>
                {item.forceUpdate && (
                  <View style={styles.forceBadge}>
                    <Text style={styles.forceBadgeText}>강제 업데이트</Text>
                  </View>
                )}
              </View>

              <View style={styles.versionRow}>
                <View style={styles.versionItem}>
                  <Text style={styles.versionLabel}>최소 버전</Text>
                  <Text style={styles.versionValue}>{item.minimumVersion}</Text>
                </View>
                <View style={styles.versionItem}>
                  <Text style={styles.versionLabel}>최신 버전</Text>
                  <Text style={styles.versionValue}>{item.latestVersion}</Text>
                </View>
              </View>

              {item.storeUrl && (
                <Text style={styles.storeUrl} numberOfLines={1}>
                  {item.storeUrl}
                </Text>
              )}

              <View style={styles.actions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/(tabs)/mypage/admin-app-version-edit' as any, params: { id: String(item.id) } })}
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
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(tabs)/mypage/admin-app-version-edit' as any)}
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
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  platformText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  forceBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  forceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  versionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  versionItem: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  versionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  storeUrl: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  actionBtn: {
    padding: 6,
  },
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
