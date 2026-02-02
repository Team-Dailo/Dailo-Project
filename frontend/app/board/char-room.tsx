import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Msg = { id: string; mine: boolean; text: string };

export default function ChatRoomScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const title = name ? `${name}님` : "dog_dog님";

  // ✅ 예시 대화 포함
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m1", mine: true, text: "안녕하세요 게시글 보고 연락드려요." },
    { id: "m2", mine: false, text: "네 안녕하세요!" },
    { id: "m3", mine: true, text: "푸드존 어디가 제일 맛있었어요?" },
    { id: "m4", mine: false, text: "감자버터구이랑 타코야끼 추천이요 😆" },
  ]);

  const [text, setText] = useState("");

  const onSend = () => {
    const t = text.trim();
    if (!t) return;
    setMessages((prev) => [{ id: String(Date.now()), mine: true, text: t }, ...prev]);
    setText("");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#111" />
        </Pressable>

        <View style={styles.titleBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>your_id</Text>
        </View>

        <Pressable hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#111" />
        </Pressable>
      </View>

      <Text style={styles.date}>2025년 12월 9일</Text>

      {/* 메시지 */}
      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.mine ? styles.right : styles.left]}>
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, item.mine ? styles.mineText : styles.theirsText]}>
                {item.text}
              </Text>
            </View>
          </View>
        )}
      />

      {/* 입력바 */}
      <View style={styles.inputBar}>
        <Pressable style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="image-outline" size={20} color="#3B82F6" />
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 보내기.."
            placeholderTextColor="#999"
            style={styles.input}
          />
          <Pressable style={styles.sendBtn} onPress={onSend} hitSlop={10}>
            <Ionicons name="paper-plane" size={18} color="#111" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleBox: { alignItems: "center" },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  sub: { marginTop: 2, fontSize: 12, color: "#999", fontWeight: "700" },

  date: { textAlign: "center", marginTop: 10, fontSize: 12, color: "#AAA", fontWeight: "700" },

  bubbleRow: { marginTop: 10, flexDirection: "row" },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },

  bubble: { maxWidth: "76%", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16 },
  mine: { backgroundColor: "#3B82F6", borderTopRightRadius: 6 },
  theirs: { backgroundColor: "#F2F2F2", borderTopLeftRadius: 6 },

  bubbleText: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  mineText: { color: "#fff" },
  theirsText: { color: "#111" },

  inputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
