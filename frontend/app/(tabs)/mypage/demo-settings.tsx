import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getDemoLocation, clearDemoLocation } from "../../../services/demoLocationStorage";

export default function DemoSettingsScreen() {
  const [demoLocation, setDemoLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      getDemoLocation().then((loc) => {
        if (!cancelled) setDemoLocation(loc);
      });
      return () => { cancelled = true; };
    }, [])
  );

  const openPicker = () => {
    const initialLat = demoLocation ? String(demoLocation.latitude) : "36.991";
    const initialLng = demoLocation ? String(demoLocation.longitude) : "127.926";
    router.push({
      pathname: "/(tabs)/mypage/event-location-picker",
      params: { initialLat, initialLng, for: "demolocation" },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        시범 운영 시 지도 탭의 "현재위치" 버튼이 이 좌표로 이동합니다. 나중에는 실제 GPS로 전환할 예정입니다.
      </Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={openPicker}>
          <Ionicons name="locate-outline" size={20} color="#6B7280" />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>현재위치 (시범용)</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {demoLocation
                ? `위도 ${demoLocation.latitude.toFixed(5)} / 경도 ${demoLocation.longitude.toFixed(5)}`
                : "미설정 (탭하여 지도에서 선택)"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>
        {demoLocation && (
          <Pressable
            style={styles.resetRow}
            onPress={async () => {
              await clearDemoLocation();
              setDemoLocation(null);
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#6B7280" />
            <Text style={styles.resetText}>시범용 위치 해제하고 실제 현재 위치 사용</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16, paddingBottom: 32 },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "500" },
  rowValue: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  resetText: {
    fontSize: 13,
    color: "#4B5563",
  },
});
