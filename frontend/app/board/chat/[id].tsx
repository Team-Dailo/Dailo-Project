// app/board/chat/[id].tsx - 채팅화면 (1:1 대화)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  id: string;
  isMe: boolean;
  text: string;
  time?: string;
};

function formatMessageTime(date?: Date): string {
  const d = date ?? new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${m.toString().padStart(2, "0")}`;
}

const MOCK_PARTNER = { id: "1", name: "민수", subId: "@minsu_daily" };
const MOCK_MESSAGES: Message[] = [
  { id: "m1", isMe: true, text: "안녕하세요! 축제 후기 글 보고 연락드렸어요.", time: "오전 10:12" },
  { id: "m2", isMe: false, text: "네 안녕하세요 ㅎㅎ", time: "오전 10:14" },
  { id: "m3", isMe: false, text: "다음 주 축제 같이 갈래요?", time: "오전 10:15" },
  { id: "m4", isMe: true, text: "좋아요! 몇 시쯤 만날까요?", time: "오전 10:16" },
];

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `m${Date.now()}`, isMe: true, text: input.trim(), time: formatMessageTime() },
    ]);
    setInput("");
  };

  const handleToggleNotification = () => {
    setNotificationsOn((prev) => !prev);
    setMenuVisible(false);
  };

  const handleBlock = () => {
    setMenuVisible(false);
    Alert.alert("차단하기", `${MOCK_PARTNER.name}님을 차단하시겠어요?`, [
      { text: "취소", style: "cancel" },
      { text: "차단", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const handleLeaveChat = () => {
    setMenuVisible(false);
    Alert.alert("채팅방 나가기", "채팅방을 나가시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "나가기", style: "destructive", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* 헤더: 뒤로가기 | 프로필 | 닉네임 / 아이디 | ⋯ */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <View style={styles.profileCircle} />
          <View style={styles.headerCenter}>
            <Text style={styles.partnerName}>{MOCK_PARTNER.name}님</Text>
            <Text style={styles.partnerId}>{MOCK_PARTNER.subId}</Text>
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

        {/* 날짜 구분 */}
        <View style={styles.dateWrap}>
          <Text style={styles.dateText}>오늘</Text>
        </View>

        {/* 메시지 목록 */}
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

        {/* 입력 영역: 사진 | 메시지 보내기.. | 마이크 | 전송 */}
        <View style={styles.inputRow}>
          <Pressable style={styles.inputIcon}>
            <Ionicons name="image-outline" size={24} color="#2563EB" />
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
              color={input.trim() ? "#2563EB" : "#9CA3AF"}
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
    backgroundColor: "#2563EB",
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
});
