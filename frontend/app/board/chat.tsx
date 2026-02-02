import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { mockChats } from "../../constants/mockChats";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}

export default function BoardChatListScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const data = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return mockChats;
    return mockChats.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.lastMessage.toLowerCase().includes(keyword)
    );
  }, [q]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>My_id</Text>
        <Pressable hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#111" />
        </Pressable>
      </View>

      {/* 검색 */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="검색"
          placeholderTextColor="#999"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>메시지</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push(
                `/board/chat-room?name=${encodeURIComponent(item.name)}`
              )
            }
          >
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]} />
            )}

            <View style={styles.textBox}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.msg} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>

            <Text style={styles.time}>{timeAgo(item.updatedAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ color: "#999", fontWeight: "700" }}>
              채팅이 없습니다.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 52,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#111" },

  searchWrap: {
    marginTop: 10,
    marginHorizontal: 16,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: 10,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EEE" },
  avatarFallback: { backgroundColor: "#E7E7E7" },

  textBox: { flex: 1 },
  name: { fontSize: 14, fontWeight: "800", color: "#111" },
  msg: { marginTop: 4, fontSize: 13, color: "#777" },

  time: { fontSize: 12, color: "#999", fontWeight: "700" },
});
