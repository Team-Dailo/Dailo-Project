import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { BoardCategory } from "../../../../types/board";

type Props = {
  value: BoardCategory;
  onChange: (v: BoardCategory) => void;
};

const CATEGORIES: BoardCategory[] = ["전체", "후기", "질문", "자유"];

export default function BoardCategoryChips({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {CATEGORIES.map((c) => {
        const active = value === c;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
          >
            <Text
              style={[
                styles.chipText,
                active ? styles.chipTextActive : styles.chipTextIdle,
              ]}
            >
              {c}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  chipIdle: { backgroundColor: "#fff", borderColor: "#E5E5E5" },
  chipText: { fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  chipTextIdle: { color: "#111" },
});
