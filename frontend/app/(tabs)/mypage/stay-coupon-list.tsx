// app/(tabs)/mypage/stay-coupon-list.tsx
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

export default function StayCouponListScreen() {
  const dummyData = [
    { id: 1, name: "푸드트럭 2,000원 할인쿠폰", expire: "2024-12-31", used: false },
    { id: 2, name: "굿즈샵 10% 할인쿠폰", expire: "2024-06-30", used: true },
  ];

  return (
    <SafeAreaView
    style={styles.safeArea}
    edges={["top", "left", "right", "bottom"]}
  >
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerTitleWrap} pointerEvents="box-none">
          <Text style={styles.headerTitle}>체류 이벤트 쿠폰 리스트</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.contents}>
        {dummyData.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={[styles.badge, item.used && styles.badgeUsed]}>
                {item.used ? "사용완료" : "사용가능"}
              </Text>
            </View>
            <Text style={styles.cardSub}>유효기간 {item.expire}</Text>
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
  headerBack: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 56,
  },
  headerTitle: {
    fontSize: 15,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    color: "#065F46",
    backgroundColor: "#D1FAE5",
  },
  badgeUsed: {
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
  },
});
