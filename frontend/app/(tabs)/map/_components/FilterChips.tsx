// app/(tabs)/map/_components/FilterChips.tsx
import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScaleIconChip } from './ScaleIcon';
import { EventStatusSliderIcon } from '../../../../components/common/EventStatusSliderIcon';

type Props = {
  /** 홈 목록 등: 맨 왼쪽 행사 상태(전체·진행중·예정·종료). 없으면 칩 미표시 */
  onPressStatus?: () => void;
  onPressDate: () => void;
  onPressCategory: () => void;
  onPressPopular: () => void;
  onPressDistance: () => void;
  onPressScale: () => void;
  /** 'all'이면 요약 없음 → 칩에 "전체" 표시 */
  selectedStatusSummary?: string | null;
  selectedDateSummary?: string | null;
  selectedCategorySummary?: string | null;
  selectedPopularSummary?: string | null;
  selectedDistanceSummary?: string | null;
  selectedScaleSummary?: string | null;
};

type FilterChipProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  selected?: boolean;
};

function Chip({ label, icon, onPress, selected }: FilterChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
        selected && styles.chipSelected,
      ]}
      onPress={onPress}
    >
      <View style={styles.chipContent}>
        {!selected && icon}
        <Text
          style={[
            styles.chipText,
            selected && styles.chipTextSelected,
          ]}
        >
          {label}
        </Text>
        {selected && (
          <Ionicons
            name="chevron-down"
            size={14}
            color="#2563EB"
            style={styles.chipSelectedIcon}
          />
        )}
      </View>
    </Pressable>
  );
}

// 아이콘: 윤곽선 흰색(IconWrap), 내부는 지정 색상. 카테고리·별·위치는 채움(filled)
const ICON_SIZE = 16;
const ICON_GAP = 6;
const CHIP_COLORS = {
  status: '#A855F7',    // 진행 상태 퍼플
  date: '#EF4444',      // 날짜 레드
  category: '#F59E0B',  // 카테고리 오렌지
  popular: '#FACC15',    // 인기/추천 옐로우
  distance: '#22C55E',   // 거리 그린
  scale: '#3B82F6',    // 규모 블루
} as const;

function IconWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconWrap}>{children}</View>;
}

export function FilterChips({
  onPressStatus,
  onPressDate,
  onPressCategory,
  onPressPopular,
  onPressDistance,
  onPressScale,
  selectedStatusSummary,
  selectedDateSummary,
  selectedCategorySummary,
  selectedPopularSummary,
  selectedDistanceSummary,
  selectedScaleSummary,
}: Props) {
  const statusLabel = selectedStatusSummary || '전체';
  const dateLabel = selectedDateSummary || '날짜';
  const categoryLabel = selectedCategorySummary || '카테고리';
  const popularLabel = selectedPopularSummary || '인기/추천';
  const distanceLabel = selectedDistanceSummary || '거리';
  const scaleLabel = selectedScaleSummary || '규모';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scrollView}
      >
        {onPressStatus != null ? (
          <Chip
            label={statusLabel}
            icon={
              <IconWrap>
                {selectedStatusSummary === '진행중' ? (
                  <EventStatusSliderIcon
                    variant="ongoing"
                    size={14}
                    color={CHIP_COLORS.status}
                    fillColor="#FFFFFF"
                  />
                ) : selectedStatusSummary === '종료' ? (
                  <EventStatusSliderIcon
                    variant="ended"
                    size={14}
                    color="#6B7280"
                    fillColor="#FFFFFF"
                  />
                ) : selectedStatusSummary === '예정' ? (
                  <EventStatusSliderIcon
                    variant="ongoing"
                    size={14}
                    color={CHIP_COLORS.category}
                    fillColor="#FFFFFF"
                  />
                ) : (
                  <EventStatusSliderIcon
                    variant="ended"
                    size={14}
                    color="#9CA3AF"
                    fillColor="#FFFFFF"
                  />
                )}
              </IconWrap>
            }
            onPress={onPressStatus}
            selected={!!selectedStatusSummary}
          />
        ) : null}
        <Chip
          label={dateLabel}
          icon={
            <IconWrap>
              <Ionicons name="calendar" size={ICON_SIZE} color={CHIP_COLORS.date} />
            </IconWrap>
          }
          onPress={onPressDate}
          selected={!!selectedDateSummary}
        />
        <Chip
          label={categoryLabel}
          icon={
            <IconWrap>
              <Ionicons name="grid" size={ICON_SIZE} color={CHIP_COLORS.category} />
            </IconWrap>
          }
          onPress={onPressCategory}
          selected={!!selectedCategorySummary}
        />
        <Chip
          label={popularLabel}
          icon={
            <IconWrap>
              <Ionicons name="star" size={ICON_SIZE} color={CHIP_COLORS.popular} />
            </IconWrap>
          }
          onPress={onPressPopular}
          selected={!!selectedPopularSummary}
        />
        <Chip
          label={distanceLabel}
          icon={
            <IconWrap>
              <Ionicons name="resize-outline" size={ICON_SIZE} color={CHIP_COLORS.distance} />
            </IconWrap>
          }
          onPress={onPressDistance}
          selected={!!selectedDistanceSummary}
        />
        <Chip
          label={scaleLabel}
          icon={
            <IconWrap>
              <ScaleIconChip color={CHIP_COLORS.scale} />
            </IconWrap>
          }
          onPress={onPressScale}
          selected={!!selectedScaleSummary}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { zIndex: 2, backgroundColor: 'transparent' },
  scrollView: { backgroundColor: 'transparent' },
  iconWrap: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 9,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconCenterWhite: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 6,
    gap: 6,
  },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
    shadowOpacity: 1,
  },
  chipPressed: {
    backgroundColor: '#F3F4F6',
  },
  chipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    marginLeft: ICON_GAP,
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  chipTextSelected: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  chipSelectedIcon: {
    marginLeft: 4,
    marginTop: 0,
  },
});
