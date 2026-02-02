import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { BoardSort } from "../../../../types/board";

type Props = {
  value: BoardSort;
  onChange: (v: BoardSort) => void;
};

const SORTS: BoardSort[] = ["최신글", "인기글"];

export default function BoardSortTabs({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {SORTS.map((s) => {
        const active = value === s;
        return (
          <Pressable key={s} onPress={() => onChange(s)} style={styles.tab}>
            <Text style={[styles.text, active && styles.textActive]}>{s}</Text>
            {active && <View style={styles.underline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, marginTop: 6, marginBottom: 6 },
  tab: { paddingVertical: 8 },
  text: { fontSize: 13, color: "#777", fontWeight: "700" },
  textActive: { color: "#111" },
  underline: { marginTop: 6, height: 2, borderRadius: 2, backgroundColor: "#111" },
});
