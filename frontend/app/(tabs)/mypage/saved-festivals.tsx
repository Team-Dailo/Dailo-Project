import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mockEvents } from '../../../constants/mockEvents';
import type { Event } from '../../../types/event';
import { formatDate } from '../../../utils/formatDate';
import { formatTimeRange } from '../../../utils/formatTime';

export default function SavedFestivalsScreen() {
  const router = useRouter();

  const data = useMemo(() => mockEvents as Event[], []);

  const renderItem = ({ item }: { item: Event }) => {
    const dateText = formatDate(item.startAt);
    const timeText = formatTimeRange(item.startAt, item.endAt);
    const categoryText = (item as any).category ?? '공연';

    return (
      <View style={styles.card}>
        <View style={styles.posterWrap}>
          <Image
            source={{
              uri: (item as any).posterUrl ?? 'https://picsum.photos/200/280',
            }}
            style={styles.poster}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>{categoryText}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          <Text style={styles.meta}>{dateText}</Text>
          <Text style={styles.meta}>{timeText}</Text>

          <Pressable
            style={styles.detailBtn}
            onPress={() => router.push(`/event/${item.id}`)}
          >
            <Text style={styles.detailBtnText}>자세히 보기</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    // ✅ 상단 겹침 방지 핵심
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.page}>
        {/* 상단바 */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </Pressable>

          <Text style={styles.headerTitle}>저장한 축제</Text>

          {/* 오른쪽 균형 맞추기 */}
          <View style={styles.rightSpace} />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ SafeArea 전체 배경
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  page: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  rightSpace: {
    width: 40,
    height: 40,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },

  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },

  posterWrap: {
    width: 80,
    height: 105,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  poster: { width: '100%', height: '100%' },

  content: { flex: 1, justifyContent: 'space-between' },
  category: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  title: { fontSize: 14, color: '#111827', fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 12, color: '#374151', marginTop: 2 },

  detailBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
  },
  detailBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
