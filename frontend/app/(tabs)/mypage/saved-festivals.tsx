import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as scrapService from "../../../services/scrap.service";
import { formatDate } from "../../../utils/formatDate";

function formatPeriod(startAt: string, endAt: string): string {
  try {
    return `${formatDate(startAt)} ~ ${formatDate(endAt)}`;
  } catch {
    return "";
  }
}

export default function SavedFestivalsScreen() {
  const [list, setList] = useState<scrapService.ScrapEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { list: data } = await scrapService.getMyScraps({ page: 0, size: 50 });
      setList(data);
    } catch (e) {
      setList([]);
      setError(e instanceof Error ? e.message : "저장한 축제를 불러오지 못했습니다.");
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

  const handleRemoveScrap = useCallback(
    (item: scrapService.ScrapEventItem) => {
      Alert.alert(
        "찜 해제",
        `"${item.title}"을(를) 저장 목록에서 제거할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "제거",
            style: "destructive",
            onPress: async () => {
              try {
                await scrapService.toggleScrap(item.id);
                setList((prev) => prev.filter((e) => e.id !== item.id));
              } catch (e) {
                Alert.alert(
                  "오류",
                  e instanceof Error ? e.message : "찜 해제에 실패했습니다."
                );
              }
            },
          },
        ]
      );
    },
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>저장한 축제</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="bookmark-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>저장한 축제가 없습니다</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.contents}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {list.map((item) => (
              <View key={item.id} style={styles.card}>
                <Pressable
                  style={styles.cardMain}
                  onPress={() => {
                    const eventId = item?.id ?? 0;
                    if (!eventId) return;
                    router.push(
                      `/event/${String(eventId)}?source=list` as import("expo-router").Href
                    );
                  }}
                >
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>
                    {[item.placeName, formatPeriod(item.startAt, item.endAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.unscrapButton}
                  onPress={() => handleRemoveScrap(item)}
                >
                  <Ionicons name="bookmark" size={20} color="#2563EB" />
                  <Text style={styles.unscrapText}>찜 해제</Text>
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
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#9CA3AF",
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
  unscrapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unscrapText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
  },
});
