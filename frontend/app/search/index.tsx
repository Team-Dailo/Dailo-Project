// app/search/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as logService from '../../services/log.service';
import { searchEventsForMap, getEventList } from '../../services/event.service';
import type { Event } from '../../types/event';

/** 지역명 → 지도 중심 좌표 (지역 검색용) */
const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  충주: { latitude: 36.9910, longitude: 127.9260 },
  충주시: { latitude: 36.9910, longitude: 127.9260 },
  충북: { latitude: 36.6357, longitude: 127.4912 },
  충청북도: { latitude: 36.6357, longitude: 127.4912 },
  서울: { latitude: 37.5665, longitude: 126.978 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  한국: { latitude: 36.3504, longitude: 127.3845 },
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromMap = params.from === 'map';
  const placeholder = fromMap
    ? '지역 축제 / 대학교 행사 / 장소 입력'
    : '행사명, 내용, 키워드 검색';

  const [keyword, setKeyword] = useState('');
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [topLoading, setTopLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  /** 홈에서 검색 시 행사 검색 결과 (null = 아직 검색 안 함) */
  const [eventResults, setEventResults] = useState<Event[] | null>(null);

  useEffect(() => {
    logService.getTopSearchKeywords(10).then(setTopKeywords).catch(() => {}).finally(() => setTopLoading(false));
  }, []);

  const handleSubmit = async () => {
    const k = keyword.trim();
    if (!k) return;

    if (fromMap) {
      setSearching(true);
      try {
        const events = await searchEventsForMap(k, 10);
        if (events.length > 0) {
          const first = events[0];
          const lat = first.latitude!;
          const lng = first.longitude!;
          router.replace({
            pathname: '/(tabs)/map',
            params: { moveToLat: String(lat), moveToLng: String(lng) },
          });
          return;
        }
        const regionKey = Object.keys(REGION_CENTERS).find(
          (r) => r === k || k.includes(r) || r.includes(k)
        );
        if (regionKey) {
          const { latitude, longitude } = REGION_CENTERS[regionKey];
          router.replace({
            pathname: '/(tabs)/map',
            params: {
              moveToLat: String(latitude),
              moveToLng: String(longitude),
            },
          });
          return;
        }
        Alert.alert('검색 결과 없음', '해당하는 행사나 지역을 찾지 못했어요.');
      } catch {
        Alert.alert('검색 실패', '잠시 후 다시 시도해 주세요.');
      } finally {
        setSearching(false);
      }
      return;
    }

    setSearching(true);
    setEventResults(null);
    try {
      const events = await getEventList({ keyword: k, size: 30 });
      setEventResults(events);
      try {
        await logService.logSearch({ keyword: k, resultCount: events.length });
      } catch {
        // ignore
      }
    } catch {
      setEventResults([]);
    } finally {
      setSearching(false);
    }
  };

  const categoryLabel = (cat: string | undefined) =>
    ({ FESTIVAL: '축제', EXHIBITION: '전시', PERFORMANCE: '공연', EXPERIENCE_BOOTH: '체험부스', FOOD_TRUCK: '푸드트럭', ETC: '기타' }[cat ?? ''] ?? '기타');
  const formatEventDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
              autoFocus
              editable={!searching}
            />
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {searching && (
            <ActivityIndicator size="small" color="#6366F1" style={styles.searchingIndicator} />
          )}

          {/* 홈에서 검색 시: 행사 검색 결과 */}
          {!fromMap && eventResults !== null && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>
                행사 검색 결과 {eventResults.length > 0 ? `(${eventResults.length}건)` : ''}
              </Text>
              {eventResults.length === 0 ? (
                <Text style={styles.emptyText}>행사명·내용에 맞는 행사가 없어요.</Text>
              ) : (
                <View style={styles.eventList}>
                  {eventResults.map((ev) => (
                    <Pressable
                      key={ev.id}
                      style={styles.eventRow}
                      onPress={() => router.push(`/event/${ev.id}`)}
                    >
                      {ev.thumbnailUrl ? (
                        <Image source={{ uri: ev.thumbnailUrl }} style={styles.eventThumb} />
                      ) : (
                        <View style={[styles.eventThumb, styles.eventThumbPlaceholder]}>
                          <Ionicons name="calendar-outline" size={24} color="#9ca3af" />
                        </View>
                      )}
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle} numberOfLines={1}>{ev.title}</Text>
                        <Text style={styles.eventMeta}>
                          {ev.placeName ? `${ev.placeName} · ` : ''}
                          {formatEventDate(ev.startAt)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={[styles.sectionTitle, !fromMap && eventResults !== null && { marginTop: 24 }]}>
            인기 검색어
          </Text>
          {topLoading ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 8 }} />
          ) : topKeywords.length === 0 ? (
            <Text style={styles.emptyText}>인기 검색어가 없습니다.</Text>
          ) : (
            <View style={styles.chipRow}>
              {topKeywords.map((k) => (
                <Pressable key={k} style={styles.chip} onPress={() => setKeyword(k)}>
                  <Text style={styles.chipText}>{k}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    height: 40,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
  },
  searchingIndicator: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
  resultSection: {
    marginBottom: 8,
  },
  eventList: {
    gap: 0,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  eventThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  eventMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});
