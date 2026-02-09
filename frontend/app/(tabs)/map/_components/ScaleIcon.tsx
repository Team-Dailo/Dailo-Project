import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * 규모(레이어 스택) 아이콘
 * - 6개의 가로 막대가 위→아래로 쌓인 형태
 * - 버튼용 18x18dp, 막대 높이 2.5dp, 간격 1.5dp, radius 2dp
 * - 레퍼런스 색상 (플랫, 투명 배경)
 */
const BAR_COLORS = [
  '#22C55E', // green
  '#2DD4BF', // mint
  '#60A5FA', // blue
  '#A78BFA', // purple
  '#F472B6', // pink
  '#FB7185', // coral
] as const;

// 버튼용: 막대 가로 길이 조금 더 길게, 막대 2.5dp, 간격 1.5dp
const BAR_HEIGHT = 2.5;
const BAR_GAP = 1.5;
const BAR_RADIUS = 2;
const ICON_SIZE = 18;
const BAR_WIDTH = 28; // 가로선 길이
const TOTAL_HEIGHT = 6 * BAR_HEIGHT + 5 * BAR_GAP;
const PADDING_V = (ICON_SIZE - TOTAL_HEIGHT) / 2;

export function ScaleIcon() {
  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        {BAR_COLORS.map((color, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: color },
              i < BAR_COLORS.length - 1 && { marginBottom: BAR_GAP },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/** 필터 칩용 규모 아이콘: 16x16dp, 단색 #3B82F6, 6막대 구조 동일 */
const CHIP_ICON_SIZE = 16;
const CHIP_BAR_HEIGHT = 1.5;
const CHIP_BAR_GAP = 1;
const CHIP_BAR_RADIUS = 1;
const CHIP_TOTAL_HEIGHT = 6 * CHIP_BAR_HEIGHT + 5 * CHIP_BAR_GAP;
const CHIP_PADDING_V = (CHIP_ICON_SIZE - CHIP_TOTAL_HEIGHT) / 2;

export function ScaleIconChip({ color = '#3B82F6' }: { color?: string }) {
  return (
    <View style={chipStyles.container}>
      <View style={chipStyles.stack}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              chipStyles.bar,
              { backgroundColor: color },
              i < 5 && { marginBottom: CHIP_BAR_GAP },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: BAR_WIDTH,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: PADDING_V,
  },
  stack: {
    width: BAR_WIDTH,
    height: TOTAL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
  },
});

const chipStyles = StyleSheet.create({
  container: {
    width: CHIP_ICON_SIZE,
    height: CHIP_ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: CHIP_PADDING_V,
  },
  stack: {
    width: CHIP_ICON_SIZE,
    height: CHIP_TOTAL_HEIGHT,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bar: {
    width: CHIP_ICON_SIZE,
    height: CHIP_BAR_HEIGHT,
    borderRadius: CHIP_BAR_RADIUS,
  },
});
