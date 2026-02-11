// app/(tabs)/mypage/stay-mission-history.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getCompletedStaySessions, type StaySessionResponseDto } from "../../../services/location.service";

function formatDateTime(isoOrArray: string | number[] | null): string {
  if (!isoOrArray) return "-";
  if (typeof isoOrArray === "string") {
    const d = new Date(isoOrArray);
    return Number.isFinite(d.getTime()) ? d.toLocaleString("ko-KR") : "-";
  }
  if (Array.isArray(isoOrArray) && isoOrArray.length >= 6) {
    const [y, mo, d, h, min] = isoOrArray;
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(min ?? 0));
    return Number.isFinite(date.getTime()) ? date.toLocaleString("ko-KR") : "-";
  }
  return "-";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

export default function StayMissionHistoryScreen() {
  const [list, setList] = useState<StaySessionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompletedStaySessions();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>체류 미션 기록</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.contents}>
            {list.length === 0 ? (
              <Text style={styles.empty}>체류 기록이 없습니다.</Text>
            ) : (
              list.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.eventTitle}</Text>
                  <Text style={styles.cardSub}>
                    진입 {formatDateTime(item.startTime)} · 체류 {formatDuration(item.durationMinutes)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

/** 스타일 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  contents: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
  },
  empty: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});
