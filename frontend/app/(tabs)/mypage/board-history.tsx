// app/(tabs)/mypage/board-history.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";


export default function BoardHistoryScreen() {
  const dummyData = [
    { id: 1, title: "축제 라인업 질문있습니다", likes: 12, comments: 5 },
    { id: 2, title: "푸드트럭 추천해주세요", likes: 9, comments: 2 },
    { id: 3, title: "오늘 공연 후기 남겨요!", likes: 21, comments: 7 },
  ];

  return (
    <SafeAreaView
    style={styles.safeArea}
    edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.container}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>게시판 기록</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.contents}>
          {dummyData.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardSub}>
                👍 {item.likes} · 💬 {item.comments}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/** 스타일 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  contents: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
  },
});
