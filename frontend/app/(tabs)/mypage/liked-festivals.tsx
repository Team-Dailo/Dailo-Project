// app/(tabs)/mypage/liked-festivals.tsx - 좋아요 누른 축제 목록
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../hooks/useAuth";
import * as eventService from "../../../services/event.service";
import type { Event } from "../../../types/event";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function formatTimeRange(startIso: string, endIso?: string): string {
  try {
    const start = new Date(startIso);
    const startStr = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    if (endIso) {
      const end = new Date(endIso);
      const endStr = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
      return `${startStr} ~ ${endStr}`;
    }
    return `${startStr} ~`;
  } catch {
    return "";
  }
}

export default function LikedFestivalsScreen() {
  const { isLoggedIn } = useAuth();
  const [list, setList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLoggedIn) {
      setList([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await eventService.getLikedEvents();
      setList(data ?? []);
    } catch (e) {
      setList([]);
      setError(e instanceof Error ? e.message : "좋아요 누른 축제를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoggedIn]);

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

  const renderItem = ({ item }: { item: Event }) => {
    const dateStr = formatDate(item.startAt ?? "");
    const timeStr = formatTimeRange(item.startAt ?? "", item.endAt);
    return (
      <Pressable
        style={styles.row}
        onPress={() => router.push(`/event/${item.id}` as import("expo-router").Href)}
      >
        <Image
          source={{
            uri: item.thumbnailUrl ?? "https://via.placeholder.com/80x80.png?text=+",
          }}
          style={styles.thumb}
        />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {dateStr ? <Text style={styles.meta}>{dateStr}</Text> : null}
          {timeStr ? <Text style={styles.meta}>{timeStr}</Text> : null}
          {item.placeName ? (
            <Text style={styles.place} numberOfLines={1}>
              {item.placeName}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerTitleWrap} pointerEvents="box-none">
          <Text style={styles.headerTitle}>좋아요 누른 축제</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {!isLoggedIn ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>로그인하면 좋아요 누른 축제가 표시됩니다.</Text>
          <Pressable style={styles.loginBtn} onPress={() => router.push("/login")}>
            <Text style={styles.loginBtnText}>로그인</Text>
          </Pressable>
        </View>
      ) : loading && list.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4C8BF5" />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>아직 좋아요 누른 축제가 없습니다.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerBack: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: { position: "absolute", right: 0, width: 44, height: 56 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#6B7280", marginBottom: 16, textAlign: "center" },
  loginBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  loginBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  retryBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#4C8BF5", borderRadius: 8 },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#E5E7EB" },
  body: { flex: 1, minWidth: 0, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 4 },
  meta: { fontSize: 12, color: "#6B7280", marginBottom: 2 },
  place: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
