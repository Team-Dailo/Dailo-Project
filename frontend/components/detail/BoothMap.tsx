// frontend/components/detail/BoothMap.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BoothMap() {
  return (
    <View style={styles.container}>
      {/* 여기 나중에 실제 지도/캠퍼스 이미지/부스 영역 넣으면 됨 */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>지도 영역 (BoothMap)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mapPlaceholder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f7f7f7",
    height: 360, // 적당한 높이, 필요하면 조절
    alignItems: "center",
    justifyContent: "center",
  },
  mapText: {
    color: "#777",
    fontSize: 14,
  },
});
