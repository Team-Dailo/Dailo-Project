import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE_URL } from "../../constants/api";

import { Client, IMessage } from "@stomp/stompjs";

type Msg = {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
  senderId?: string;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function getMessagesUrl(roomId: string) {
  return `/api/chat/rooms/${roomId}/messages`;
}
function postReadUrl(roomId: string) {
  return `/api/chat/rooms/${roomId}/read`;
}

const WS_PATH = "/ws";

function toWsBaseUrl(httpBaseUrl: string) {
  if (httpBaseUrl.startsWith("https://")) return httpBaseUrl.replace("https://", "wss://");
  if (httpBaseUrl.startsWith("http://")) return httpBaseUrl.replace("http://", "ws://");
  return httpBaseUrl;
}

function normalizeMsg(raw: any, myId: string): Msg {
  const senderId = String(raw?.senderId ?? raw?.userId ?? raw?.authorId ?? "");
  const id = String(raw?.id ?? raw?.messageId ?? `${Date.now()}_${Math.random()}`);
  const text = String(raw?.content ?? raw?.text ?? "");
  const createdAt = String(raw?.createdAt ?? raw?.time ?? raw?.sentAt ?? new Date().toISOString());
  return { id, senderId, text, createdAt, mine: senderId === String(myId) };
}

export default function ChatRoomScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    name?: string;
    roomId?: string;
    userId?: string;
  }>();

  const roomId = String(params?.roomId ?? "").trim();
  const myId = String(params?.userId ?? "").trim();
  const title = useMemo(() => (params?.name ? `${params.name}님` : "채팅"), [params?.name]);

  const listRef = useRef<FlatList<Msg>>(null);
  const stompRef = useRef<Client | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [page, setPage] = useState(0);
  const size = 20;
  const [hasMore, setHasMore] = useState(true);

  const ensureBasicsOrAlert = useCallback(() => {
    if (!roomId) {
      Alert.alert("오류", "roomId가 없어요. 라우팅 params에 roomId가 필요해요.");
      return false;
    }
    if (!myId) {
      Alert.alert("오류", "서버가 X-User-Id 헤더를 요구해요.\n이 화면으로 올 때 params에 userId가 필요해요.");
      return false;
    }
    return true;
  }, [roomId, myId]);

  // ✅ REST 헤더 고정
  useEffect(() => {
    if (!myId) return;
    api.defaults.headers.common["X-User-Id"] = myId;
  }, [myId]);

  const loadMessagesPage = useCallback(
    async (targetPage: number, replace = false) => {
      if (!ensureBasicsOrAlert()) return;
      try {
        setLoading(true);

        const res = await api.get(getMessagesUrl(roomId), {
          params: { page: targetPage, size },
        });

        const data = res.data;
        const list = data?.content ?? data?.messages ?? [];
        const normalized = (Array.isArray(list) ? list : []).map((m: any) => normalizeMsg(m, myId));

        setMessages((prev) => (replace ? normalized : [...normalized, ...prev]));
        setPage(targetPage);

        const isLast = Boolean(data?.last);
        const totalPages = typeof data?.totalPages === "number" ? data.totalPages : null;

        if (isLast) setHasMore(false);
        else if (totalPages !== null && targetPage >= totalPages - 1) setHasMore(false);
        else if (normalized.length < size) setHasMore(false);
        else setHasMore(true);
      } catch (e: any) {
        console.log("❌ LOAD MESSAGES ERROR", e?.response?.status, e?.response?.data);
        Alert.alert(
          "채팅 불러오기 실패",
          typeof e?.response?.data === "string" ? e.response.data : e?.message ?? "알 수 없는 오류"
        );
      } finally {
        setLoading(false);
      }
    },
    [roomId, myId, ensureBasicsOrAlert]
  );

  const markRead = useCallback(async () => {
    if (!ensureBasicsOrAlert()) return;
    try {
      await api.post(postReadUrl(roomId), {});
    } catch (e: any) {
      console.log("❌ READ ERROR", e?.response?.status, e?.response?.data);
    }
  }, [roomId, ensureBasicsOrAlert]);

  const disconnectStomp = useCallback(() => {
    const c = stompRef.current;
    stompRef.current = null;
    if (c) c.deactivate();
  }, []);

  const connectStomp = useCallback(() => {
    if (!ensureBasicsOrAlert()) return;
    if (stompRef.current?.active) return;

    // ✅ 후보 2개: 서버가 SockJS를 썼을 때 실제 WS가 /ws/websocket인 경우가 흔함
    const wsBase = toWsBaseUrl(API_BASE_URL);
    const candidates = [`${wsBase}${WS_PATH}`, `${wsBase}${WS_PATH}/websocket`];

    const makeClient = (wsUrl: string, tag: string) =>
      new Client({
        // ✅ 핵심: 핸드셰이크 헤더로 X-User-Id 전달
        webSocketFactory: () =>
          new (global as any).WebSocket(wsUrl, undefined, {
            headers: { "X-User-Id": myId },
          }),

        reconnectDelay: 2000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        // STOMP CONNECT에도 넣어둠 (서버가 여기 보더라도 OK)
        connectHeaders: { "X-User-Id": myId },

        debug: (str) => console.log(`${tag}:`, str),

        onConnect: () => {
          console.log(`✅ ${tag} CONNECTED`);
          // 구독
          const sub = `/topic/chat/${roomId}`;
          console.log(`✅ subscribe -> ${sub}`);

          // @stomp/stompjs 타입 때문에 subscribe 결과 저장 안 해도 됨
          (stompRef.current as Client).subscribe(sub, (message: IMessage) => {
            try {
              const body = JSON.parse(message.body);
              const msg = normalizeMsg(body, myId);
              setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
              markRead();
            } catch (err) {
              console.log("❌ SUBSCRIBE PARSE ERROR", err);
            }
          });
        },

        onStompError: (frame) => {
          console.log(`❌ ${tag} STOMP ERROR`, frame.headers["message"], frame.body);
        },
        onWebSocketError: (evt) => {
          console.log(`❌ ${tag} WS ERROR`, evt);
        },
      });

    // 1차 시도
    const c1 = makeClient(candidates[0], "STOMP1");
    stompRef.current = c1;
    c1.activate();

    // 1차가 실패할 때를 대비해 3초 뒤에도 연결 안 됐으면 2차로 교체
    setTimeout(() => {
      const cur = stompRef.current;
      if (!cur) return;

      // 이미 연결 성공했으면 종료
      if ((cur as any).connected) return;

      console.log("↩️ retry websocket url:", candidates[1]);
      cur.deactivate();

      const c2 = makeClient(candidates[1], "STOMP2");
      stompRef.current = c2;
      c2.activate();
    }, 3000);
  }, [roomId, myId, ensureBasicsOrAlert, markRead]);

  useEffect(() => {
    console.log("✅ ChatRoom params =", params);
    console.log("ROOM ID =", roomId, "MY ID =", myId, "platform =", Platform.OS);

    if (!ensureBasicsOrAlert()) return;

    loadMessagesPage(0, true);
    markRead();
    connectStomp();

    return () => disconnectStomp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myId]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  const onLoadMore = useCallback(() => {
    if (loading) return;
    if (!hasMore) return;
    loadMessagesPage(page + 1, false);
  }, [loading, hasMore, loadMessagesPage, page]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    if (!ensureBasicsOrAlert()) return;
    if (sending) return;

    const client = stompRef.current;
    if (!client || !(client as any).connected) {
      Alert.alert("연결 안됨", "채팅 서버(WebSocket)에 연결되지 않았어요.");
      return;
    }

    setSending(true);

    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, mine: true, text: t, createdAt: new Date().toISOString(), senderId: myId },
    ]);
    setText("");

    try {
      client.publish({
        destination: `/app/chat/${roomId}`,
        body: JSON.stringify({ content: t, messageType: "TEXT" }),
      });
      markRead();
    } catch (e: any) {
      console.log("❌ SEND ERROR", e?.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("전송 실패", e?.message ?? "알 수 없는 오류");
    } finally {
      setSending(false);
    }
  }, [text, roomId, myId, ensureBasicsOrAlert, sending, markRead]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 6 : 0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={22} color="#111" />
          </Pressable>

          <View style={styles.titleBox}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>room: {roomId || "없음"} / me: {myId || "없음"} / {Platform.OS}</Text>
          </View>

          <Pressable
            onPress={() =>
              Alert.alert(
                "연결 정보",
                `REST: ${API_BASE_URL}\nWS: ${toWsBaseUrl(API_BASE_URL)}${WS_PATH}\nSUB: /topic/chat/${roomId}\nSEND: /app/chat/${roomId}\n\n핸드셰이크 헤더로 X-User-Id 전송 시도`
              )
            }
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{ padding: 8 }}
          >
            <Ionicons name="information-circle-outline" size={20} color="#111" />
          </Pressable>
        </View>

        <Text style={styles.date}>{loading ? "불러오는 중..." : "채팅"}</Text>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.mine ? styles.right : styles.left]}>
              <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, item.mine ? styles.mineText : styles.theirsText]}>{item.text}</Text>
              </View>
            </View>
          )}
          ListHeaderComponent={
            hasMore ? (
              <Pressable onPress={onLoadMore} style={styles.loadMoreBtn} disabled={loading}>
                <Text style={styles.loadMoreText}>{loading ? "불러오는 중..." : "이전 메시지 더 보기"}</Text>
              </Pressable>
            ) : (
              <Text style={styles.noMoreText}>더 이상 이전 메시지가 없어요.</Text>
            )
          }
          ListEmptyComponent={<Text style={{ paddingHorizontal: 16, color: "#999", fontWeight: "700" }}>아직 메시지가 없어요.</Text>}
        />

        <View style={styles.inputBar}>
          <Pressable style={styles.iconBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={() => Alert.alert("첨부", "이미지 첨부는 아직 연결되지 않았어요.")}>
            <Ionicons name="image-outline" size={20} color="#3B82F6" />
          </Pressable>

          <View style={styles.inputWrap}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="메시지 보내기.."
              placeholderTextColor="#999"
              style={styles.input}
              returnKeyType="send"
              onSubmitEditing={onSend}
              blurOnSubmit={false}
            />
            <Pressable style={styles.sendBtn} onPress={onSend} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} disabled={sending}>
              <Ionicons name="paper-plane" size={18} color={text.trim() ? "#111" : "#AAA"} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  screen: { flex: 1 },

  header: {
    height: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  titleBox: { alignItems: "center" },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  sub: { marginTop: 2, fontSize: 12, color: "#999", fontWeight: "700" },

  date: { textAlign: "center", marginTop: 10, marginBottom: 6, fontSize: 12, color: "#AAA", fontWeight: "700" },

  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  bubbleRow: { marginTop: 10, flexDirection: "row" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },

  bubble: { maxWidth: "76%", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  mine: { backgroundColor: "#3B82F6", borderTopRightRadius: 6 },
  theirs: { backgroundColor: "#F2F2F2", borderTopLeftRadius: 6 },

  bubbleText: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  mineText: { color: "#fff" },
  theirsText: { color: "#111" },

  loadMoreBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F4F4F4",
    marginTop: 8,
    marginBottom: 2,
  },
  loadMoreText: { color: "#111", fontWeight: "800", fontSize: 12 },
  noMoreText: { alignSelf: "center", marginTop: 8, color: "#AAA", fontWeight: "800", fontSize: 12 },

  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
  },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },

  inputWrap: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    paddingLeft: 14,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: { flex: 1, fontSize: 14, color: "#111" },
  sendBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
});
