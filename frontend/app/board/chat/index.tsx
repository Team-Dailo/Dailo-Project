// app/board/chat/index.tsx - 채팅 사람 목록
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type ChatRoom = {
  id: string;
  name: string;
  lastMessage: string;
  avatarColor: string;
  time?: string;
  unreadCount?: number;
};

const MOCK_CHATS: ChatRoom[] = [
  { id: "1", name: "민수", lastMessage: "다음 주 축제 같이 갈래요?", avatarColor: "#E0E7FF", time: "15분 전", unreadCount: 2 },
  { id: "2", name: "지은", lastMessage: "사진 보내주셔서 감사해요!", avatarColor: "#FCE7F3", time: "1시간 전", unreadCount: 1 },
  { id: "3", name: "준호", lastMessage: "네, 그때 봐요", avatarColor: "#D1FAE5", time: "2시간 전" },
  { id: "4", name: "수진", lastMessage: "맛집 추천해주세요 ㅎㅎ", avatarColor: "#FEF3C7", time: "어제" },
  { id: "5", name: "태영", lastMessage: "공연 몇 시에 시작하나요?", avatarColor: "#E5E7EB", time: "어제", unreadCount: 3 },
  { id: "6", name: "예린", lastMessage: "주차장 정보 알려주실 수 있나요?", avatarColor: "#F3E8FF", time: "2일 전" },
  { id: "7", name: "현우", lastMessage: "좋은 하루 되세요!", avatarColor: "#DBEAFE", time: "3일 전" },
];

export default function ChatListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? MOCK_CHATS.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(search.toLowerCase())
      )
    : MOCK_CHATS;

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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
            onPress={() => router.push(`/board/chat/${item.id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: item.avatarColor }]} />
            <View style={styles.chatBody}>
              <View style={styles.chatRowTop}>
                <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                {item.time ? (
                  <Text style={styles.chatTime}>  ·  {item.time}</Text>
                ) : null}
              </View>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            {item.unreadCount != null && item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      />
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
});
