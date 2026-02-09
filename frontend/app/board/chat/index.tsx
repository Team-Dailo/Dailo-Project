// app/board/chat/index.tsx - 채팅방 목록 (백엔드 연동)
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as chatService from "../../../services/chat.service";
import * as authService from "../../../services/auth.service";

const AVATAR_COLORS = ["#E0E7FF", "#FCE7F3", "#D1FAE5", "#FEF3C7", "#E5E7EB", "#F3E8FF", "#DBEAFE"];

function formatRoomTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "방금 전";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 172800000) return "어제";
    return `${Math.floor(diff / 86400000)}일 전`;
  } catch {
    return "";
  }
}

export default function ChatListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rooms, setRooms] = useState<chatService.ChatRoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState<number | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const list = await chatService.getMyRooms();
      setRooms(list);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      authService.getStoredUserId().then((id) => setMyUserId(id ?? null));
      fetchRooms();
    }, [fetchRooms])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const getPartner = (room: chatService.ChatRoomResponse) => {
    const other = room.members?.find((m) => m.userId !== myUserId);
    return other ? `user_${other.userId}` : "알 수 없음";
  };

  const filtered = search.trim()
    ? rooms.filter(
        (r) =>
          getPartner(r).toLowerCase().includes(search.toLowerCase())
      )
    : rooms;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>채팅</Text>
        <Pressable style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#1F2937" />
        </Pressable>
      </View>

      {/* 검색 */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="검색"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>채팅방이 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const partnerName = getPartner(item);
            const timeStr = item.updatedAt ? formatRoomTime(item.updatedAt) : "";
            const colorIndex = item.id % AVATAR_COLORS.length;
            return (
              <Pressable
                style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
                onPress={() => router.push(`/board/chat/${item.id}`)}
              >
                <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[colorIndex] }]} />
                <View style={styles.chatBody}>
                  <View style={styles.chatRowTop}>
                    <Text style={styles.chatName} numberOfLines={1}>{partnerName}</Text>
                    {timeStr ? <Text style={styles.chatTime}>  ·  {timeStr}</Text> : null}
                  </View>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    대화를 시작해 보세요
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111827", padding: 0 },
  list: { flex: 1, backgroundColor: "#FFFFFF" },
  listContent: { paddingTop: 8, paddingBottom: 24 },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chatCardPressed: { backgroundColor: "#F9FAFB" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatRowTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  chatTime: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  chatPreview: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
  emptyWrap: { paddingVertical: 48, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
});
