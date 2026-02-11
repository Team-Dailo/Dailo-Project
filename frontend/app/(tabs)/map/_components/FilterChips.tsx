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

type Props = {
  onPressDate: () => void;
  onPressCategory: () => void;
  onPressPopular: () => void;
  onPressRegion: () => void;
  onPressScale: () => void;
};

type FilterChipProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

function Chip({ label, icon, onPress }: FilterChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.chipContent}>
        {icon}
        <Text style={styles.chipText}>{label}</Text>
      </View>
    </Pressable>
  );
}

// 아이콘: 윤곽선 흰색(IconWrap), 내부는 지정 색상. 카테고리·별·위치는 채움(filled)
const ICON_SIZE = 16;
const ICON_GAP = 6;
const CHIP_COLORS = {
  date: '#EF4444',      // 날짜 레드
  category: '#F59E0B',  // 카테고리 오렌지
  popular: '#FACC15',    // 인기/추천 옐로우
  region: '#22C55E',    // 지역 그린
  scale: '#3B82F6',    // 규모 블루
} as const;

function IconWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.iconWrap}>{children}</View>;
}

export function FilterChips({
  onPressDate,
  onPressCategory,
  onPressPopular,
  onPressRegion,
  onPressScale,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Chip
          label="날짜"
          icon={
            <IconWrap>
              <Ionicons name="calendar" size={ICON_SIZE} color={CHIP_COLORS.date} />
            </IconWrap>
          }
          onPress={onPressDate}
        />
        <Chip
          label="카테고리"
          icon={
            <IconWrap>
              <Ionicons name="grid" size={ICON_SIZE} color={CHIP_COLORS.category} />
            </IconWrap>
          }
          onPress={onPressCategory}
        />
        <Chip
          label="인기/추천"
          icon={
            <IconWrap>
              <Ionicons name="star" size={ICON_SIZE} color={CHIP_COLORS.popular} />
            </IconWrap>
          }
          onPress={onPressPopular}
        />
        <Chip
          label="지역"
          icon={
            <IconWrap>
              <View style={styles.locationIconWrap}>
                <Ionicons name="location" size={ICON_SIZE} color={CHIP_COLORS.region} />
                <View style={styles.locationIconCenterWhite} />
              </View>
            </IconWrap>
          }
          onPress={onPressRegion}
        />
        <Chip
          label="규모"
          icon={
            <IconWrap>
              <ScaleIconChip color={CHIP_COLORS.scale} />
            </IconWrap>
          }
          onPress={onPressScale}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { zIndex: 2, backgroundColor: 'transparent' },
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
});
