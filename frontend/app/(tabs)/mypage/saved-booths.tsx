// app/(tabs)/mypage/saved-booths.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as boothFavoriteService from "../../../services/boothFavorite.service";

export default function SavedBoothsScreen() {
  const [list, setList] = useState<boothFavoriteService.BoothFavoriteItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await boothFavoriteService.getBoothFavorites();
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleRemove = useCallback(
    (item: boothFavoriteService.BoothFavoriteItem) => {
      Alert.alert(
        "즐겨찾기 해제",
        `"${item.boothName}"을(를) 즐겨찾기에서 제거할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "제거",
            style: "destructive",
            onPress: async () => {
              await boothFavoriteService.removeBoothFavorite(
                item.eventId,
                item.boothName
              );
              setList((prev) =>
                prev.filter(
                  (x) =>
                    !(x.eventId === item.eventId && x.boothName === item.boothName)
                )
              );
            },
          },
        ]
      );
    },
    []
  );

  const goToEvent = useCallback((eventId: number) => {
    router.push(
      `/event/${eventId}?source=list&tab=booths` as import("expo-router").Href
    );
  }, []);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>부스 즐겨찾기</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>저장한 부스가 없습니다</Text>
            <Text style={styles.emptySub}>
              행사 상세 → 축제부스 탭에서 부스를 눌러 즐겨찾기에 추가할 수 있어요
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.contents}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {list.map((item, index) => (
              <View
                key={`${item.eventId}-${item.boothName}-${index}`}
                style={styles.card}
              >
                <Pressable
                  style={styles.cardMain}
                  onPress={() => goToEvent(item.eventId)}
                >
                  <Text style={styles.cardTitle}>{item.boothName}</Text>
                  <Text style={styles.cardSub}>
                    {item.eventTitle}
                    {item.boothType === "food" ? " · 푸드트럭" : " · 체험부스"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.unfavButton}
                  onPress={() => handleRemove(item)}
                >
                  <Ionicons name="bookmark" size={20} color="#2563EB" />
                  <Text style={styles.unfavText}>찜 해제</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

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
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#9CA3AF",
  },
  emptySub: {
    marginTop: 8,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  contents: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardMain: {
    flex: 1,
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
  unfavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unfavText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
  },
});
