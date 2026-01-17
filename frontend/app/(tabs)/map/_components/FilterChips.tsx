// app/(tabs)/map/_components/FilterChips.tsx
import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPressDate: () => void;
  onPressCategory: () => void;
  onPressPopular: () => void;
  onPressRegion: () => void;
  onPressScale: () => void;
};

type FilterChipProps = {
  label: string;
  icon: string;
  onPress: () => void;
};

function Chip({ label, icon, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.chipContent}>
        <Ionicons name={icon as any} size={14} color="#6b7280" />
        <Text style={styles.chipText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
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
        <Chip label="날짜" icon="calendar-outline" onPress={onPressDate} />
        <Chip label="카테고리" icon="grid-outline" onPress={onPressCategory} />
        <Chip
          label="인기/추천"
          icon="star-outline"
          onPress={onPressPopular}
        />
        <Chip label="지역" icon="location-outline" onPress={onPressRegion} />
        <Chip
          label="규모"
          icon="analytics-outline"
          onPress={onPressScale}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { zIndex: 2 },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#374151',
  },
});
