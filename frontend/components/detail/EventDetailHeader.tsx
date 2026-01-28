// frontend/components/detail/EventDetailHeader.tsx

import { View, Image, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";

const posterUri =
  "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800"; // 임시 포스터

interface Props {
  id?: string;
}

export default function EventDetailHeader({ id }: Props) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* 포스터 이미지 */}
      <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />

      {/* 🔹 뒤로가기 / 공유 / 스크랩 버튼 */}
      <View style={styles.iconRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>

        <View style={styles.rightGroup}>
          <Pressable onPress={() => {}} style={styles.iconButton}>
            <Text style={styles.iconText}>⤴</Text>
          </Pressable>
          <Pressable onPress={() => {}} style={styles.iconButton}>
            <Text style={styles.iconText}>★</Text>
          </Pressable>
        </View>
      </View>

      {/* 정보 카드 */}
      <View style={styles.infoCard}>
        <Text style={styles.dateText}>2025.11.18 TUE</Text>
        <Text style={styles.titleText}>입동 - 시작과 끝</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.infoLine}>🕒 19:00 ~</Text>
          <Text style={styles.infoLine}>📍 한국교통대 국원문화관</Text>
          <Text style={styles.infoLine}>👤 신문고 동아리</Text>
        </View>
      </View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  poster: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },

  /* 🔹 상단 버튼 레이아웃 */
  iconRow: {
    position: "absolute",
    top: 40, // 상태바랑 겹치지 않게 여백
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rightGroup: {
    flexDirection: "row",
    gap: 12,
  },

  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  infoCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoLine: {
    fontSize: 14,
    marginBottom: 4,
    color: "#444",
  },
});
