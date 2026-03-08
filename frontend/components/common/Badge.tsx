// components/map/FilterChips.tsx (새 폴더 map)
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

type FilterChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

function Chip({ label, active, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FilterChips() {
  // TODO: 실제 필터 상태/클릭 핸들러는 props로 뺄 수도 있음
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Chip label="날짜" />
      <Chip label="카테고리" />
      <Chip label="인기/추천" />
      <Chip label="지역" />
      <Chip label="규모" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: '#fff' },
});
