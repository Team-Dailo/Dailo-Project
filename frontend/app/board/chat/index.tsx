import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as chatService from "../../../services/chat.service";

type ChatRoom = chatService.ChatRoom;

function hashColor(seed: string) {
  const colors = ["#E0E7FF", "#FCE7F3", "#D1FAE5", "#FEF3C7", "#E5E7EB", "#F3E8FF", "#DBEAFE"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

export default function ChatListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [myUserId, setMyUserId] = useState<string>("");

  // ✅ 중복 네비게이션 방지
  const navigatingRef = useRef(false);

  const ensureUserId = useCallback(async () => {
    let uid = (await chatService.getUserId()) ?? "";
    console.log("[ChatList] stored userId =", uid || "(empty)");

    // 🔥 테스트용: 비어있으면 임시로 1 넣어보기 (서버에 존재하는 유저 id여야 함)
    if (!uid) {
      const temp = "1";
      await chatService.setUserId(temp);
      uid = temp;
      console.log("[ChatList] userId was empty -> set temp userId =", temp);
    }

    setMyUserId(uid);
    return uid;
  }, []);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const uid = await ensureUserId();
      console.log("[ChatList] loadRooms with uid=", uid);

      const data = await chatService.getChatRooms();
      console.log("[ChatList] rooms count=", Array.isArray(data) ? data.length : "not array");

      setRooms(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.log("[ChatList] loadRooms error =", e?.message, e?.response?.status, e?.response?.data);

      if (e?.response?.status === 403) {
        Alert.alert(
          "403 발생",
          "서버가 채팅방 목록을 막고 있어요.\n1) X-User-Id가 서버에서 존재하는 유저인지\n2) 토큰 없으면 막는지\n확인 필요"
        );
      }

      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [ensureUserId]);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((room) => {
      const title = chatService.getRoomTitle(room, myUserId).toLowerCase();
      const last = String(room.lastMessage ?? "").toLowerCase();
      return title.includes(q) || last.includes(q);
    });
  }, [rooms, search, myUserId]);

  const openRoom = useCallback(
    (room: ChatRoom) => {
      const roomId = room?.id;
      if (!roomId) {
        Alert.alert("오류", "채팅방 ID가 없습니다.");
        return;
      }

      if (navigatingRef.current) return; // ✅ 연속 클릭/중복 실행 방지
      navigatingRef.current = true;

      const title = chatService.getRoomTitle(room, myUserId);
      console.log("[ChatList] go roomId=", roomId, "title=", title);

      // ✅ 정답: app/board/chat/[id].tsx 로 이동
      router.push({
        pathname: "/board/chat/[id]",
        params: { id: String(roomId), name: title },
      });

      // ✅ 네비게이션 완료될 시간 준 후 해제
      setTimeout(() => {
        navigatingRef.current = false;
      }, 600);
    },
    [router, myUserId]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#1F2937" />
        </Pressable>

        <Text style={styles.headerTitle}>채팅</Text>

        <Pressable style={styles.headerBtn} hitSlop={12} onPress={loadRooms}>
          <Ionicons name="refresh" size={20} color="#1F2937" />
        </Pressable>
      </View>

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
          {!!search && (
            <Pressable hitSlop={10} onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const avatarSeed = chatService.getRoomAvatarSeed(item, myUserId);
            const avatarColor = hashColor(avatarSeed);

            const title = chatService.getRoomTitle(item, myUserId);
            const preview = item.lastMessage ?? "";
            const timeText = chatService.formatKoreanTime(item.lastMessageAt);

            return (
              <Pressable
                style={({ pressed }) => [styles.chatCard, pressed && styles.chatCardPressed]}
                onPress={() => openRoom(item)}
              >
                <View style={[styles.avatar, { backgroundColor: avatarColor }]} />

                <View style={styles.chatBody}>
                  <View style={styles.chatRowTop}>
                    <Text style={styles.chatName} numberOfLines={1}>
                      {title}
                    </Text>
                    {!!timeText && <Text style={styles.chatTime}> · {timeText}</Text>}
                  </View>

                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>

                {item.unreadCount != null && item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {item.unreadCount > 99 ? "99+" : String(item.unreadCount)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: "#6B7280" }}>채팅방이 없습니다.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadRooms}
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

  searchSection: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12 },
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

  avatar: { width: 48, height: 48, borderRadius: 24 },

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
  unreadText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  chatRowTop: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 4 },
  chatName: { fontSize: 16, fontWeight: "600", color: "#111827", maxWidth: "80%" },
  chatTime: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },

  chatPreview: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
