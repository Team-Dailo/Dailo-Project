// components/map/FilterChips.tsx
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

type Props = {
  onPressDate: () => void;
  onPressCategory: () => void;
  onPressPopular: () => void;
  onPressDistance?: () => void;
  onPressScale: () => void;

  selectedDateSummary?: string | null;
  selectedCategorySummary?: string | null;
  selectedPopularSummary?: string | null;
  selectedDistanceSummary?: string | null;
  selectedScaleSummary?: string | null;

  // index.tsx에서 쓰는 값도 호환
  popularValueLabel?: string;
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
          numberOfLines={1}
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

const ICON_SIZE = 16;
const ICON_GAP = 6;

const CHIP_COLORS = {
  date: '#EF4444',
  category: '#F59E0B',
  popular: '#FACC15',
  distance: '#22C55E',
  scale: '#3B82F6',
} as const;

function IconWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconWrap}>{children}</View>;
}

export function FilterChips({
  onPressDate,
  onPressCategory,
  onPressPopular,
  onPressDistance,
  onPressScale,
  selectedDateSummary,
  selectedCategorySummary,
  selectedPopularSummary,
  selectedDistanceSummary,
  selectedScaleSummary,
  popularValueLabel,
}: Props) {
  const dateLabel = selectedDateSummary || '날짜';
  const categoryLabel = selectedCategorySummary || '카테고리';
  const popularLabel =
    selectedPopularSummary || popularValueLabel || '인기/추천';
  const distanceLabel = selectedDistanceSummary || '거리';
  const scaleLabel = selectedScaleSummary || '규모';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Chip
          label={dateLabel}
          icon={
            <IconWrap>
              <Ionicons
                name="calendar"
                size={ICON_SIZE}
                color={CHIP_COLORS.date}
              />
            </IconWrap>
          }
          onPress={onPressDate}
          selected={!!selectedDateSummary}
        />

        <Chip
          label={categoryLabel}
          icon={
            <IconWrap>
              <Ionicons
                name="grid"
                size={ICON_SIZE}
                color={CHIP_COLORS.category}
              />
            </IconWrap>
          }
          onPress={onPressCategory}
          selected={!!selectedCategorySummary}
        />

        <Chip
          label={popularLabel}
          icon={
            <IconWrap>
              <Ionicons
                name="star"
                size={ICON_SIZE}
                color={CHIP_COLORS.popular}
              />
            </IconWrap>
          }
          onPress={onPressPopular}
          selected={!!selectedPopularSummary || !!popularValueLabel}
        />

        {onPressDistance ? (
          <Chip
            label={distanceLabel}
            icon={
              <IconWrap>
                <Ionicons
                  name="resize-outline"
                  size={ICON_SIZE}
                  color={CHIP_COLORS.distance}
                />
              </IconWrap>
            }
            onPress={onPressDistance}
            selected={!!selectedDistanceSummary}
          />
        ) : null}

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
  wrapper: {
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  iconWrap: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 9,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxWidth: 180,
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