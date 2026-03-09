// app/(tabs)/map/_components/MapBottomSheet.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { Event, EventCategory } from '../../types/event';
import { formatDate, formatDateTimeRange } from '../../utils/formatDate';
import { formatTime, formatTimeRange } from '../../utils/formatTime';

const CATEGORY_LABEL: Record<EventCategory, string> = {
  FESTIVAL: '축제',
  EXHIBITION: '전시',
  PERFORMANCE: '공연',
  EXPERIENCE_BOOTH: '체험부스',
  FOOD_TRUCK: '푸드트럭',
  TRAFFIC: '교통',
  CONSTRUCTION: '공사',
  ETC: '기타',
};

type SheetMode = 'collapsed' | 'expanded';

type Props = {
  visible: boolean;
  event: Event | null;
  mode: SheetMode;
  filterBottomY: number;
  onClose: () => void;
  onPressMore: () => void;
  onPressDirection: () => void;
  onPressBack: () => void;
  onCollapsedHeightChange?: (height: number) => void;
  renderRightButton?: () => React.ReactNode;
  onPressCurrentLocation?: () => void;
};

export function MapBottomSheet({
  visible,
  event,
  mode,
  filterBottomY,
  onClose,
  onPressMore,
  onPressDirection,
  onPressBack,
  onCollapsedHeightChange,
  renderRightButton,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!visible || !event) return null;

  const isCollapsed = mode === 'collapsed';

  const handlePressDetail = () => {
    router.push(`/event/${event.id}?source=map`);
    onClose();
  };

  const hasStart = event.startAt && !Number.isNaN(new Date(event.startAt).getTime());
  const hasEnd = event.endAt && !Number.isNaN(new Date(event.endAt).getTime());

  const dateText =
    hasStart && hasEnd
      ? formatDateTimeRange(event.startAt, event.endAt)
      : hasStart
        ? formatDate(event.startAt)
        : '날짜 없음';

  const timeText =
    hasStart && hasEnd
      ? formatTimeRange(event.startAt, event.endAt)
      : hasStart
        ? formatTime(event.startAt)
        : '시간 없음';

  const placeText = event.address || event.placeName || '위치 없음';
  const categoryLabel =
    (event.category && CATEGORY_LABEL[event.category as EventCategory]) ?? '기타';

  const posterUri =
    event.thumbnailUrl ??
    'https://via.placeholder.com/700x380.png?text=Poster';

  const expandedTop = filterBottomY + 8;

  // 너무 큰 하단 여백 방지
  const collapsedBottomSpacing = Math.min(insets.bottom, 10);

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {isCollapsed ? (
        <View
          style={[
            styles.collapsedContainer,
            { paddingBottom: collapsedBottomSpacing },
          ]}
          onLayout={(e) =>
            onCollapsedHeightChange?.(e.nativeEvent.layout.height)
          }
        >
          {/* 필요하면 여기 안에 '축제 목록 보기' 버튼을 같이 넣는 게 제일 안정적 */}
          {/* 
          <View style={styles.listButtonRowOnSheet}>
            <View style={styles.listButtonCenterOnSheet}>
              <TouchableOpacity
                style={styles.listButton}
                activeOpacity={0.85}
                onPress={onPressBack}
              >
                <Text style={styles.listButtonText}>축제 목록 보기</Text>
              </TouchableOpacity>
            </View>

            {renderRightButton?.()}
          </View>
          */}

          <View style={styles.cardSmall}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{categoryLabel}</Text>
            </View>

            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{dateText}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText} numberOfLines={2}>
                {placeText}
              </Text>
            </View>

            <View style={styles.smallBottomRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.moreButton}
                activeOpacity={0.85}
                onPress={onPressMore}
              >
                <Text style={styles.moreButtonText}>더보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.largeContainer,
            {
              position: 'absolute',
              left: 16,
              right: 16,
              top: expandedTop,
              bottom: 8,
            },
          ]}
        >
          <ScrollView
            style={styles.largeScroll}
            contentContainerStyle={styles.largeContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.category}>{categoryLabel}</Text>
            </View>

            <Text style={styles.title}>{event.title}</Text>

            {placeText !== '위치 없음' ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {placeText}
              </Text>
            ) : null}

            <View style={[styles.metaRow, { marginTop: 12 }]}>
              <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{dateText}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{placeText}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                자세한 일정과 소개는 아래 상세보기에서 확인할 수 있습니다.
              </Text>
            </View>

            <View style={styles.posterPlaceholder}>
              <Image
                source={{ uri: posterUri }}
                style={styles.posterImage}
                resizeMode="cover"
              />
            </View>
          </ScrollView>

          <View
            style={[
              styles.largeButtonRow,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <TouchableOpacity
              style={[styles.bottomBtn, styles.directionBtn]}
              onPress={onPressDirection}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={16} color="#4C8BF5" />
              <Text style={styles.directionText}>길찾기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomBtn, styles.detailBtn]}
              onPress={handlePressDetail}
              activeOpacity={0.85}
            >
              <Text style={styles.detailText}>상세보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },

  category: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4B5563',
    flexShrink: 1,
  },

  collapsedContainer: {
    marginHorizontal: 16,
  },

  listButtonRowOnSheet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listButtonCenterOnSheet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },

  cardSmall: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5EDFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 13,
    color: '#4C8BF5',
    fontWeight: '600',
    lineHeight: 16,
  },

  largeContainer: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  largeScroll: {
    flex: 1,
  },
  largeContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 10,
    lineHeight: 19,
  },
  posterPlaceholder: {
    marginTop: 18,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  posterImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  largeButtonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  bottomBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  directionBtn: {
    backgroundColor: '#E5EDFF',
    marginRight: 6,
  },
  detailBtn: {
    backgroundColor: '#4C8BF5',
    marginLeft: 6,
  },
  directionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4C8BF5',
    fontWeight: '600',
    lineHeight: 18,
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 18,
  },
});