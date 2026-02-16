// app/(tabs)/mypage/guide.tsx - 이용 안내 (사이드메뉴 > 이용 안내)
// 흐름: 지도 SideMenu "이용 안내" 또는 마이페이지에서 진입 → getUsageGuide() (GET /api/content/usage-guide) → 마크다운(##/###/문단) 렌더링
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as contentService from '../../../services/content.service';

function renderLine(line: string, index: number): React.ReactNode {
  const t = line.trim();
  if (!t) return <Text key={index} style={styles.paragraph} />;
  if (t.startsWith('### ')) {
    return (
      <Text key={index} style={[styles.sectionSubtitle, { marginTop: 16 }]}>
        {t.slice(4)}
      </Text>
    );
  }
  if (t.startsWith('## ')) {
    return (
      <Text key={index} style={[styles.sectionTitle, { marginTop: index === 0 ? 0 : 24 }]}>
        {t.slice(3)}
      </Text>
    );
  }
  return (
    <Text key={index} style={styles.body}>
      {t}
    </Text>
  );
}

export default function GuideScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const text = await contentService.getUsageGuide();
      setContent(text ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lines = content.split(/\n/);

  return (
    <>
      <Stack.Screen
        options={{
          title: '이용 안내',
          headerShown: true,
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable
              onPress={() => router.replace('/(tabs)/mypage')}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => load()}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
            }
          >
            {content ? (
              lines.map((line, i) => renderLine(line, i))
            ) : (
              <Text style={styles.empty}>등록된 이용 안내가 없습니다.</Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 6,
  },
  paragraph: { height: 8 },
  errorText: { fontSize: 14, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#6366F1', borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 24 },
});
