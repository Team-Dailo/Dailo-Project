// 관리자 - 행사별 좋아요 수 (GET /api/admin/events/like-counts)
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminEventLikesScreen() {
  const router = useRouter();
  const [list, setList] = useState<adminService.AdminEventLikeCountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminEventLikeCounts();
      setList(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "조회 실패";
      const is403 = msg.includes("403") || msg.includes("관리자");
      setError(is403 ? "관리자 권한이 필요합니다." : msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : list.length === 0 ? (
        <Text style={styles.empty}>좋아요가 누적된 행사가 없습니다.</Text>
      ) : (
        <>
          <Text style={styles.summary}>
            행사별 좋아요 수 (총 {list.length}건, 좋아요 많은 순)
          </Text>
          {list.map((item) => (
            <Pressable
              key={item.eventId}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/mypage/admin-event-detail",
                  params: { eventId: String(item.eventId) },
                })
              }
            >
              <View style={styles.cardRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>♥ {item.likeCount}</Text>
                </View>
              </View>
              <Text style={styles.eventId}>행사 ID: {item.eventId}</Text>
            </Pressable>
          ))}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#DC2626", marginBottom: 12, fontSize: 14 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 24 },
  summary: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  eventId: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },
});
