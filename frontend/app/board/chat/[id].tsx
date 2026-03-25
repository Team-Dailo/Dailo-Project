// app/board/chat/[id].tsx - 채팅화면 (1:1 대화, 백엔드 메시지 히스토리 연동)
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as chatService from "../../../services/chat.service";
import * as blockService from "../../../services/block.service";
import * as authService from "../../../services/auth.service";

type Message = {
  id: string;
  isMe: boolean;
  text: string;
  time?: string;
};

function formatMessageTime(iso?: string): string {
  try {
    const d = iso ? new Date(iso) : new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h % 12 || 12;
    return `${ampm} ${h12}:${m.toString().padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const roomId = id ? Number(id) : 0;
  const [input, setInput] = useState("");
  const [room, setRoom] = useState<chatService.ChatRoomResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const partner = room?.members?.find((m) => m.userId !== myUserId);
  const partnerNick = partner ? ((partner as { nickname?: string; nick_name?: string }).nickname ?? (partner as { nick_name?: string }).nick_name ?? "").trim() : "";
  const partnerName = partner ? (partnerNick || `user_${partner.userId}`) : "대화 상대";
  const partnerUserId = partner?.userId ?? 0;

  useEffect(() => {
    authService.getStoredUserId().then((uid) => setMyUserId(uid ?? null));
  }, []);

  const fetchRoomAndMessages = useCallback(async () => {
    if (!roomId || !Number.isFinite(roomId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const uid = await authService.getStoredUserId();
      setMyUserId(uid ?? null);
      const [roomData, msgData, notifStatus] = await Promise.all([
        chatService.getRoom(roomId),
        chatService.getMessages(roomId),
        chatService.getNotificationStatus(roomId).catch(() => ({ notificationOn: true })),
      ]);
      setRoom(roomData);
      setNotificationsOn(notifStatus.notificationOn);
      const myId = uid ?? 0;
      // API는 최신순(Desc)이므로 채팅은 과거→최신 순으로 보이도록 뒤집기
      const raw = (msgData.content ?? []).map((m) => ({
        id: String(m.id),
        isMe: m.senderId === myId,
        text: m.content ?? "",
        time: formatMessageTime(m.createdAt),
      }));
      setMessages([...raw].reverse());
      await chatService.markRoomAsRead(roomId);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomAndMessages();
  }, [fetchRoomAndMessages]);

  // 앱 재진입·다시 들어올 때마다 서버에서 메시지 다시 로드 (채팅 기록 유지)
  useFocusEffect(
    useCallback(() => {
      if (roomId && Number.isFinite(roomId)) fetchRoomAndMessages();
    }, [roomId, fetchRoomAndMessages])
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !roomId) return;
    setInput("");
    const optimisticId = `m${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, isMe: true, text, time: formatMessageTime() },
    ]);
    try {
      const sent = await chatService.sendMessage(roomId, text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? {
                id: String(sent.id),
                isMe: true,
                text: sent.content ?? text,
                time: formatMessageTime(sent.createdAt),
              }
            : m
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      Alert.alert("오류", "메시지 전송에 실패했습니다.");
    }
  };

  const handleToggleNotification = async () => {
    setMenuVisible(false);
    if (!roomId) return;
    // 낙관적 업데이트
    setNotificationsOn((prev) => !prev);
    try {
      const result = await chatService.toggleNotification(roomId);
      setNotificationsOn(result.notificationOn);
    } catch {
      // 실패 시 롤백
      setNotificationsOn((prev) => !prev);
      Alert.alert("오류", "알림 설정 변경에 실패했습니다.");
    }
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (!partnerUserId) return;
    Alert.alert("차단하기", `${partnerName}님을 차단하시겠어요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            await blockService.blockUser(partnerUserId);
            Alert.alert("차단됨", "사용자를 차단했습니다.");
            router.back();
          } catch {
            Alert.alert("오류", "차단에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleLeaveChat = () => {
    setMenuVisible(false);
    Alert.alert("채팅방 나가기", "채팅방을 나가시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.leaveRoom(roomId);
            router.back();
          } catch {
            Alert.alert("오류", "나가기에 실패했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <View style={styles.profileCircle} />
          <View style={styles.headerCenter}>
            <Text style={styles.partnerName}>{partnerName}님</Text>
            <Text style={styles.partnerId}>@{partnerUserId || "—"}</Text>
          </View>
          <Pressable hitSlop={12} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
          </Pressable>
        </View>

        {/* 더보기 메뉴 */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
            <View style={styles.menuCard}>
              <Pressable style={styles.menuItem} onPress={handleToggleNotification}>
                <Ionicons
                  name={notificationsOn ? "notifications" : "notifications-off"}
                  size={20}
                  color="#374151"
                />
                <Text style={styles.menuItemText}>
                  {notificationsOn ? "알림 끄기" : "알림 켜기"}
                </Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={handleBlock}>
                <Ionicons name="ban" size={20} color="#374151" />
                <Text style={styles.menuItemText}>차단하기</Text>
              </Pressable>
              <Pressable style={[styles.menuItem, styles.menuItemDanger]} onPress={handleLeaveChat}>
                <Ionicons name="exit-outline" size={20} color="#DC2626" />
                <Text style={styles.menuItemTextDanger}>채팅방 나가기</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <View style={styles.dateWrap}>
          <Text style={styles.dateText}>오늘</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => {
            const isLastOtherInRow =
              !msg.isMe &&
              (index === messages.length - 1 || messages[index + 1].isMe);
            const hasNextOther =
              !msg.isMe && index < messages.length - 1 && !messages[index + 1].isMe;
            return msg.isMe ? (
              <View key={msg.id} style={styles.myRow}>
                {msg.time ? <Text style={styles.messageTime}>{msg.time}</Text> : null}
                <View style={styles.myBubble}>
                  <Text style={styles.myText}>{msg.text}</Text>
                </View>
              </View>
            ) : (
              <View
                key={msg.id}
                style={[styles.otherRow, hasNextOther && styles.otherRowTight]}
              >
                {isLastOtherInRow ? (
                  <View style={styles.otherAvatar} />
                ) : (
                  <View style={styles.otherAvatarPlaceholder} />
                )}
                <View style={styles.otherBubble}>
                  <Text style={styles.otherText}>{msg.text}</Text>
                </View>
                {msg.time ? <Text style={styles.messageTime}>{msg.time}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
        )}

        {/* 입력 영역 */}
        <View style={styles.inputRow}>
          <Pressable style={styles.inputIcon}>
            <Ionicons name="image-outline" size={24} color="#4C8BF5" />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="메시지 보내기.."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Pressable style={styles.inputIcon}>
            <Ionicons name="mic-outline" size={22} color="#6B7280" />
          </Pressable>
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            disabled={!input.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={input.trim() ? "#4C8BF5" : "#9CA3AF"}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  headerCenter: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  partnerId: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  dateWrap: { alignItems: "center", paddingVertical: 12 },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  myRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-end", marginBottom: 10, gap: 6 },
  myBubble: {
    maxWidth: "80%",
    backgroundColor: "#4C8BF5",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomRightRadius: 4,
  },
  myText: { fontSize: 15, color: "#FFFFFF", lineHeight: 20 },
  otherRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 6 },
  otherRowTight: { marginBottom: 4 },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9A8D4",
    marginRight: 8,
  },
  otherAvatarPlaceholder: { width: 32, height: 32, marginRight: 8 },
  otherBubble: {
    maxWidth: "80%",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
  },
  otherText: { fontSize: 15, color: "#111827", lineHeight: 20 },
  messageTime: { fontSize: 11, color: "#9CA3AF", marginBottom: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  inputIcon: { padding: 4, marginBottom: 4 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    fontSize: 15,
    color: "#111827",
  },
  sendBtn: { padding: 4, marginBottom: 4 },
  sendBtnDisabled: { opacity: 0.6 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 12,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: { fontSize: 15, color: "#111827" },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  menuItemTextDanger: { fontSize: 15, color: "#DC2626", fontWeight: "500" },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
});
