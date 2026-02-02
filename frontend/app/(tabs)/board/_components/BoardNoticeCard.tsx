import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  title: string;
  preview: string;
  onPress?: () => void;
};

export default function BoardNoticeCard({ title, preview, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#777" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flex: 1, paddingRight: 10 },
  title: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  preview: { fontSize: 12, color: "#666" },
});
