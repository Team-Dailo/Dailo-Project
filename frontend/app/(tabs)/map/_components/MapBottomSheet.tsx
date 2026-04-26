// app/(tabs)/map/_components/MapBottomSheet.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { Event, EventCategory, EventDetail } from '../../../../types/event';
import { formatDate, formatDateTimeRange } from '../../../../utils/formatDate';
import { formatTime, formatTimeRange } from '../../../../utils/formatTime';
import { getEventDetail } from '../../../../services/event.service';
import { toggleScrap } from '../../../../services/scrap.service';
import { useAuth } from '../../../../hooks/useAuth';
/** 상세 화면 EventDetailHeader와 동일 — 이미지 없을 때만 사용 */
const DEFAULT_POSTER_URI =
  'https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800';

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
  filterBottomY: number; // 카테고리 칩 영역의 아래 y좌표
  onClose: () => void;
  onPressMore: () => void;
  onPressDirection: () => void;
  onPressBack: () => void; // 한 단계씩 뒤로 (expanded→collapsed, collapsed→닫기)
  onCollapsedHeightChange?: (height: number) => void; // 작은 카드 영역 높이 (현재 위치 버튼 위치용)
  renderRightButton?: () => React.ReactNode; // 작은 카드 시 축제 목록 보기와 같은 줄 오른쪽 (현재 위치 등)
  onPressCurrentLocation?: () => void; // 현재 위치 버튼 직접 콜백 (터치 보장용)
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
  onPressCurrentLocation,
}: Props) {
  const router = useRouter();

  const { isLoggedIn } = useAuth();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  // expanded 모드 진입 시 상세 데이터 fetch + 북마크 초기화
  useEffect(() => {
    if (!visible || !event || mode !== 'expanded') return;
    setDetail(null);
    setIsBookmarked(event.isBookmarked ?? false);
    setDetailLoading(true);
    getEventDetail(event.id)
      .then((d) => {
        setDetail(d);
        setIsBookmarked(d.isBookmarked ?? event.isBookmarked ?? false);
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [visible, event?.id, mode]);

  const handleToggleBookmark = async () => {
    if (!event) return;
    if (!isLoggedIn) {
      Alert.alert('로그인 필요', '로그인 후 저장할 수 있습니다.');
      return;
    }
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const saved = await toggleScrap(Number(event.id));
      setIsBookmarked(saved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '저장에 실패했습니다.';
      Alert.alert('알림', msg);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const posterUri = useMemo(() => {
    const fromDetail =
      (detail?.thumbnailUrl as string | null | undefined)?.trim() ||
      detail?.posterUrls?.[0];
    if (fromDetail) return fromDetail;
    const fromEvent = (event?.thumbnailUrl ?? '').trim();
    return fromEvent.length > 0 ? fromEvent : null;
  }, [detail?.thumbnailUrl, detail?.posterUrls, event?.thumbnailUrl]);

  if (!visible || !event) return null;

  const isCollapsed = mode === 'collapsed';

  const handlePressDetail = () => {
    const thumb = (event.thumbnailUrl ?? '').trim();
    // 지도 → 상세 이동 시, 등록 시 선택한 대표 썸네일(thumbnailUrl)을 함께 전달해
    // 상세 상단 이미지가 큰 카드와 항상 일치하도록 함
    router.push({
      pathname: `/event/${event.id}`,
      params: {
        source: 'map',
        ...(thumb ? { thumb } : {}),
      },
    } as never);
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
  // 큰 카드 상단 위치: 필터 칩 아래 + 8px 정도 여백
  const expandedTop = filterBottomY + 8;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {isCollapsed ? (
        // 🔹 작은 카드 모드 (축제목록 버튼 + 작은 카드 세트)
        <View
          style={[
            styles.collapsedContainer,
            { marginBottom: 12 }, // ✅ 기존 paddingBottom: insets.bottom
          ]}
          onLayout={(e) =>
            onCollapsedHeightChange?.(e.nativeEvent.layout.height)
          }
        >
          {/* 축제 목록 보기·현재위치·확대축소는 지도 오버레이에서 카드 위로 올려서 표시 → 여기서는 작은 카드만 */}
          {/* 작은 카드 */}
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
              <Text style={styles.metaText} numberOfLines={2}>{placeText}</Text>
            </View>

            <View style={styles.smallBottomRow}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.moreButton}
                activeOpacity={0.85}
                onPress={onPressMore}
              >
                <Ionicons
                  name="chevron-up-outline"
                  size={16}
                  color="#4C8BF5"
                />
                <Text style={styles.moreButtonText}>더보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // 🔹 큰 카드 모드 (카테고리 칩 바로 아래부터 시작)
        <View
          style={[
            styles.largeContainer,
            {
              position: 'absolute',
              left: 16,
              right: 16,
              top: expandedTop,
              bottom: 12,
            },
          ]}
        >
          {/* 고정 헤더: 카테고리, 제목, 메타 정보, 설명 */}
          <View style={styles.largeHeader}>
            {/* 카테고리 + 북마크/닫기 버튼 행 */}
            <View style={styles.headerTopRow}>
              <Text style={styles.category}>{categoryLabel}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleToggleBookmark}
                  activeOpacity={0.8}
                  disabled={bookmarkLoading}
                >
                  <Ionicons
                    name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={isBookmarked ? '#4C8BF5' : '#6B7280'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.title}>{event.title}</Text>
            {placeText !== '위치 없음' ? (
              <Text style={styles.subtitle} numberOfLines={1}>{placeText}</Text>
            ) : null}
            <View style={[styles.metaRow, { marginTop: 8 }]}>
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
            {detail?.description ? (
              <Text style={styles.description} numberOfLines={3}>
                {detail.description}
              </Text>
            ) : null}
          </View>

          {/* 미리보기: 행사 대표 포스터(상세 화면 헤더와 동일 우선순위) */}
          <View style={styles.previewBox}>
            {detailLoading && !posterUri ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color="#4C8BF5" />
              </View>
            ) : (
              <Image
                source={{ uri: posterUri ?? DEFAULT_POSTER_URI }}
                style={styles.posterImage}
                resizeMode="cover"
              />
            )}
          </View>

          {/* 하단 버튼 (길찾기 / 상세보기) */}
          <View style={styles.largeButtonRow}>
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
  // 전체 오버레이 (지도 위에 겹치는 영역)
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },

  // 큰 카드 우상단 닫기 버튼
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10,
  },

  // 공통 텍스트 스타일
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
  },

  // 🔹 작은 카드 모드
  collapsedContainer: {
    marginHorizontal: 16,
  },
  listButtonRowOnSheet: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // 파란 버튼과 카드 사이 간격
  },
  listButtonCenterOnSheet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationButtonInSheet: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5EDFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  listButton: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButtonText: {
    color: '#ffffff',
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 34,
    backgroundColor: '#E5EDFF',
  },
  moreButtonText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#4C8BF5',
    fontWeight: '600',
  },

  // 🔹 큰 카드 모드
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
    paddingHorizontal: 18, // 좌우 여백
    paddingTop: 14,        // 위쪽 여백
    paddingBottom: 16,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 10,
  },
  bulletTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginTop: 4,
  },
  bulletText: {
    fontSize: 12,
    color: '#4B5563',
  },
  loadingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeHeader: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  description: {
    fontSize: 13,
    color: '#374151',
    marginTop: 10,
    lineHeight: 19,
  },
  previewBox: {
    flex: 1,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  largeButtonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  directionBtn: {
    backgroundColor: '#E5EDFF',
    marginRight: 8,
  },
  detailBtn: {
    backgroundColor: '#4C8BF5',
    marginLeft: 8,
  },
  directionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4C8BF5',
    fontWeight: '600',
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
