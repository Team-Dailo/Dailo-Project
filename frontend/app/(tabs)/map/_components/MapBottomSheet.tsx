// app/(tabs)/map/_components/MapBottomSheet.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import type { Event } from '../../../../types/event';
import { formatDateTimeRange } from '../../../../utils/formatDate';
import { formatTimeRange } from '../../../../utils/formatTime';

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
    router.push(`/event/${event.id}`);
    onClose();
  };

  // ✅ ISO 문자열 그대로 출력하지 않도록 포맷 적용
  const dateText = formatDateTimeRange(event.startAt, event.endAt);

  // ✅ 하드코딩 제거: 실제 시간으로 표시
  const timeText = formatTimeRange(event.startAt, event.endAt);

  const placeText = event.address || event.placeName;

  // 큰 카드 상단 위치: 필터 칩 아래 + 8px 정도 여백
  const expandedTop = filterBottomY + 8;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {isCollapsed ? (
        // 🔹 작은 카드 모드 (축제목록 버튼 + 작은 카드 세트)
        <View
          style={[
            styles.collapsedContainer,
            { paddingBottom: insets.bottom },
          ]}
          onLayout={(e) =>
            onCollapsedHeightChange?.(e.nativeEvent.layout.height)
          }
        >
          {/* 축제 목록 보기(가운데) + 오른쪽 버튼(현재 위치 등) 같은 줄 */}
          <View style={styles.listButtonRowOnSheet}>
            <View style={styles.listButtonCenterOnSheet}>
              <TouchableOpacity style={styles.listButton} activeOpacity={0.85}>
                <Text style={styles.listButtonText}>축제 목록 보기</Text>
              </TouchableOpacity>
            </View>
            {renderRightButton?.()}
          </View>

          {/* 작은 카드 */}
          <View style={styles.cardSmall}>
            <View style={styles.cardHeader}>
              <Text style={styles.category}>공연</Text>
            </View>

            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              즐겁고 힐링할 수 있도록 준비한 공연
            </Text>

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
              <Text style={styles.metaText}>{placeText}</Text>
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
                  color="#2563EB"
                />
                <Text style={styles.moreButtonText}>더보기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // 🔹 큰 카드 모드 (카테고리 칩 바로 아래부터 시작, 내부 스크롤)
        <View
          style={[
            styles.largeContainer,
            {
              position: 'absolute',
              left: 16,
              right: 16,
              top: expandedTop,
              bottom: insets.bottom,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.largeContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.category}>공연</Text>
            </View>

            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.subtitle}>
              즐겁고 힐링할 수 있도록 준비한 공연
            </Text>

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

            {/* 본문 영역 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                총 90분간 진행되며, 중간에 관객 이벤트가 있습니다
              </Text>
              <Text style={styles.bulletTitle}>
                1부: 18:00 ~ 18:40 사랑이 시작될 때
              </Text>
              <Text style={styles.bulletText}>
                · 사랑을 전하는 다함께 떼창 - 10cm
              </Text>
              <Text style={styles.bulletText}>· 너의 의미 - 아이유</Text>

              <Text style={[styles.bulletTitle, { marginTop: 8 }]}>
                2부: 18:50 ~ 19:30 위로가 필요한 밤
              </Text>
              <Text style={styles.bulletText}>· 감성 발라드 공연</Text>
            </View>

            {/* 포스터 영역 */}
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterText}>포스터 이미지 영역</Text>
            </View>
          </ScrollView>

          {/* 하단 버튼 (길찾기 / 상세보기) */}
          <View style={styles.largeButtonRow}>
            <TouchableOpacity
              style={[styles.bottomBtn, styles.directionBtn]}
              onPress={onPressDirection}
              activeOpacity={0.85}
            >
              <Ionicons name="navigate-outline" size={16} color="#2563EB" />
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
    color: '#2563EB',
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
  posterPlaceholder: {
    marginTop: 18,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterText: {
    fontSize: 12,
    color: '#6B7280',
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
    backgroundColor: '#2563EB',
    marginLeft: 8,
  },
  directionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  detailText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
