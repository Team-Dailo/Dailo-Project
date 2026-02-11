import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import SockJS from "sockjs-client";
import { Client, IMessage } from "@stomp/stompjs";

import { API_BASE_URL } from "@/constants/api";
import * as chatService from "@/services/chat.service";

type UIMessage = {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
  senderId?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeMessage(m: any): { id: string; senderId?: string | number; text: string; createdAt: string } {
  return {
    id: String(m?.id ?? `${Date.now()}`),
    senderId: m?.senderId,
    text: String(m?.content ?? m?.text ?? ""),
    createdAt: String(m?.createdAt ?? m?.sentAt ?? nowIso()),
  };
}

// ✅ roomId 정규화: 배열/슬래시/공백 제거
function normalizeRoomId(param: unknown) {
  const raw = Array.isArray(param) ? param[0] : param;
  return String(raw ?? "")
    .replace(/\//g, "")
    .trim();
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // ✅ 타입 강제 안 함 (실제론 string | string[])
  const roomId = useMemo(() => normalizeRoomId(params.id), [params.id]);

  const [myUserId, setMyUserId] = useState<string>("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [text, setText] = useState("");
  const [connecting, setConnecting] = useState(false);

  const clientRef = useRef<Client | null>(null);
  const connectedRef = useRef(false);

  const wsUrl = `${API_BASE_URL}/ws`;

  useEffect(() => {
    console.log("✅ [ChatRoomScreen] entered, roomId(raw) =", params.id);
    console.log("✅ [ChatRoomScreen] roomId(normalized) =", roomId);
    console.log("✅ [ChatRoomScreen] wsUrl =", wsUrl);
  }, [params.id, roomId, wsUrl]);

  // 내 userId
  useEffect(() => {
    (async () => {
      const uid = (await chatService.getUserId()) ?? "";
      setMyUserId(uid);
      console.log("✅ [ChatRoomScreen] myUserId =", uid || "(empty)");
    })();
  }, []);

  const appendIncoming = useCallback(
    (payload: any) => {
      const m = normalizeMessage(payload);
      const ui: UIMessage = {
        id: m.id,
        mine: myUserId ? String(m.senderId) === String(myUserId) : false,
        text: m.text,
        createdAt: m.createdAt,
        senderId: m.senderId ? String(m.senderId) : undefined,
      };
      setMessages((prev) => [...prev, ui]);
    },
    [myUserId]
  );

  const loadHistory = useCallback(async () => {
    if (!roomId) return;
    try {
      console.log("✅ [ChatRoomScreen] loadHistory roomId =", roomId);

      const data: any = await chatService.getMessages(roomId);

      // Page<...> 가능성 처리
      const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];

      const ui: UIMessage[] = list.map((raw) => {
        const m = normalizeMessage(raw);
        return {
          id: m.id,
          mine: myUserId ? String(m.senderId) === String(myUserId) : false,
          text: m.text,
          createdAt: m.createdAt,
          senderId: m.senderId ? String(m.senderId) : undefined,
        };
      });

      setMessages(ui);
      console.log("✅ [ChatRoomScreen] history count =", ui.length);
    } catch (e: any) {
      console.log("❌ loadHistory error =", e?.response?.status, e?.response?.data ?? e?.message);
    }
  }, [roomId, myUserId]);

  const connectStomp = useCallback(async () => {
    if (!roomId) return;
    if (connectedRef.current || clientRef.current) return;

    setConnecting(true);

    const uid = (await chatService.getUserId()) ?? "";
    const token = (await chatService.getAuthToken()) ?? "";

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        "X-User-Id": uid,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (str) => console.log("STOMP:", str),

      onConnect: () => {
        connectedRef.current = true;
        setConnecting(false);
        console.log("✅ STOMP connected");

        client.subscribe(`/topic/chat/${roomId}`, (msg: IMessage) => {
          try {
            const payload = JSON.parse(msg.body);
            appendIncoming(payload);
          } catch (e) {
            console.log("❌ parse incoming msg error", e);
          }
        });
      },

      onStompError: (frame) => {
        console.log("❌ STOMP error", frame.headers, frame.body);
        setConnecting(false);
      },

      onWebSocketClose: (evt) => {
        connectedRef.current = false;
        setConnecting(false);
        console.log("⚠️ WS closed", evt?.code, evt?.reason);
      },

      onWebSocketError: (evt) => {
        setConnecting(false);
        console.log("❌ WS error", evt);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [roomId, wsUrl, appendIncoming]);

  useEffect(() => {
    if (!roomId) return;

    loadHistory();
    connectStomp();

    return () => {
      try {
        connectedRef.current = false;
        clientRef.current?.deactivate();
        clientRef.current = null;
      } catch {}
    };
  }, [roomId, loadHistory, connectStomp]);

  const onSend = useCallback(async () => {
    const t = text.trim();
    if (!t || !roomId) return;

    const client = clientRef.current;
    if (!client || !connectedRef.current) {
      Alert.alert("연결중", "채팅 서버에 연결중입니다. 잠시 후 다시 시도해줘.");
      return;
    }

    const uid = (await chatService.getUserId()) ?? "";

    const payload = {
      content: t,
      messageType: "TEXT",
    };

    try {
      client.publish({
        destination: `/app/chat/${roomId}`,
        body: JSON.stringify(payload),
        headers: {
          "X-User-Id": uid,
        },
      });

      setText("");
    } catch (e: any) {
      console.log("❌ publish error", e?.message ?? e);
      Alert.alert("전송 실패", "메시지 전송에 실패했어.");
    }
  }, [text, roomId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} />
        </Pressable>

        <Text style={styles.title}>채팅방 {roomId}</Text>

        <View style={{ width: 54, alignItems: "flex-end" }}>
          {connecting ? <Text style={styles.connecting}>연결중</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>메시지가 없습니다.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.other]}>
              <Text style={styles.msgText}>{item.text}</Text>
              <Text style={styles.timeText}>{item.createdAt}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 입력"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={onSend}
          />
          <Pressable onPress={onSend} style={styles.sendBtn}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingHorizontal: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "600" },
  connecting: { fontSize: 10, opacity: 0.6, textAlign: "right" },

  list: { padding: 12, gap: 10, flexGrow: 1 },
  empty: { paddingTop: 40, alignItems: "center" },
  emptyText: { color: "#6B7280" },

  bubble: { maxWidth: "80%", padding: 10, borderRadius: 12 },
  mine: { alignSelf: "flex-end", backgroundColor: "#DCF8C6" },
  other: { alignSelf: "flex-start", backgroundColor: "#F2F2F2" },
  msgText: { fontSize: 15 },
  timeText: { marginTop: 4, fontSize: 11, opacity: 0.6 },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
});
