import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL } from "../../constants/api";

// ✅ mock은 fallback 용으로만 남겨둠(원하면 제거 가능)
import { mockChats } from "../../constants/mockChats";

type ChatRoomRow = {
  roomId: string;
  name: string;
  lastMessage: string;
  updatedAt: string; // ISO or string
  avatarUrl?: string | null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return ""; // 서버가 다른 포맷 주면 빈칸 처리
  const diff = Date.now() - t;
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}

// ✅ 서버 응답 방어적으로 정규화
function normalizeRoom(raw: any): ChatRoomRow {
  const roomId = String(raw?.roomId ?? raw?.id ?? raw?.chatRoomId ?? "");
  const name = String(raw?.name ?? raw?.title ?? raw?.partnerName ?? raw?.otherUserName ?? "채팅");
  const lastMessage = String(raw?.lastMessage ?? raw?.lastContent ?? raw?.recentMessage ?? "");
  const updatedAt = String(raw?.updatedAt ?? raw?.lastMessageAt ?? raw?.time ?? new Date().toISOString());
  const avatarUrl = raw?.avatarUrl ?? raw?.profileImageUrl ?? raw?.imageUrl ?? null;

  return { roomId, name, lastMessage, updatedAt, avatarUrl };
}

export default function BoardChatListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  // ✅ 채팅목록도 userId가 있어야 X-User-Id 넣고 /api/chat/rooms 호출 가능
  const myId = String(params?.userId ?? "").trim();

  const [q, setQ] = useState("");
  const [rooms, setRooms] = useState<ChatRoomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(false); // 서버 실패 시 mock fallback

  const headers = useMemo(() => (myId ? { "X-User-Id": myId } : {}), [myId]);

  const loadRooms = useCallback(async () => {
    if (!myId) {
      Alert.alert("오류", "userId가 없어요. 이 화면으로 올 때 params에 userId를 넘겨야 해요.");
      setUseMock(true);
      setRooms(
        (mockChats ?? []).map((c: any) => ({
          roomId: String(c?.roomId ?? c?.id ?? ""),
          name: String(c?.name ?? "채팅"),
          lastMessage: String(c?.lastMessage ?? ""),
          updatedAt: String(c?.updatedAt ?? new Date().toISOString()),
          avatarUrl: c?.avatarUrl ?? null,
        }))
      );
      return;
    }

    try {
      setLoading(true);
      setUseMock(false);

      // ✅ 문서: GET /api/chat/rooms (최신순)
      const res = await api.get("/api/chat/rooms", { headers });

      const data = res.data;
      const list = Array.isArray(data) ? data : data?.content ?? data?.rooms ?? [];
      const normalized = (Array.isArray(list) ? list : []).map(normalizeRoom);

      const nonEmpty = normalized.filter((r) => r.roomId && r.roomId !== "undefined" && r.roomId !== "null");
      const uniq = Array.from(new Map(nonEmpty.map((r) => [r.roomId, r])).values());

      setRooms(uniq);
    } catch (e: any) {
      console.log("❌ LOAD ROOMS ERROR", e?.response?.status, e?.response?.data, e?.message);

      // 서버가 안 되면 mock으로라도 화면은 보이게
      setUseMock(true);
      setRooms(
        (mockChats ?? []).map((c: any) => ({
          roomId: String(c?.roomId ?? c?.id ?? ""),
          name: String(c?.name ?? "채팅"),
          lastMessage: String(c?.lastMessage ?? ""),
          updatedAt: String(c?.updatedAt ?? new Date().toISOString()),
          avatarUrl: c?.avatarUrl ?? null,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [myId, headers]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return rooms;
    return rooms.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        (c.lastMessage ?? "").toLowerCase().includes(keyword)
    );
  }, [q, rooms]);

  const goRoom = useCallback(
    (room: ChatRoomRow) => {
      if (!myId) {
        Alert.alert("오류", "userId가 없어서 채팅방에 들어갈 수 없어요.");
        return;
      }
      if (!room.roomId) {
        Alert.alert("오류", "roomId가 없어서 채팅방에 들어갈 수 없어요.");
        return;
      }

      // ✅ object push로 이동 + roomId/userId/name 확실히 전달
      router.push({
        pathname: "/board/chat-room",
        params: {
          roomId: room.roomId,
          userId: myId,
          name: room.name,
        },
      });
    },
    [router, myId]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <Text style={styles.headerTitle}>{myId ? `내 ID: ${myId}` : "채팅 목록"}</Text>

        <Pressable hitSlop={10} onPress={loadRooms}>
          <Ionicons name="refresh" size={20} color="#111" />
        </Pressable>
      </View>

      {useMock ? <Text style={styles.banner}>서버 연결 실패로 mockChats를 표시 중</Text> : null}
      {loading ? <Text style={styles.banner}>불러오는 중...</Text> : null}

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
        data={filtered}
        keyExtractor={(item) => item.roomId}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<Text style={styles.sectionTitle}>메시지</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => goRoom(item)}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]} />
            )}

            <View style={styles.textBox}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.msg} numberOfLines={1}>
                {item.lastMessage || "최근 메시지가 없어요."}
              </Text>
            </View>

            <Text style={styles.time}>{timeAgo(item.updatedAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <Text style={{ color: "#999", fontWeight: "700" }}>채팅이 없습니다.</Text>
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

  banner: {
    paddingHorizontal: 16,
    paddingTop: 10,
    color: "#666",
    fontWeight: "700",
  },

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