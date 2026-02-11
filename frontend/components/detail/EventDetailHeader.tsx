// frontend/components/detail/EventDetailHeader.tsx

import React from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Share,
  Platform,
  ToastAndroid,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";

const posterUri =
  "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800"; // 임시 포스터

interface Props {
  id?: string;

  // ✅ 바깥(상세 페이지)에서 넘겨줄 수도 있고, 없으면 헤더에서 기본 동작 수행
  onShare?: () => void;
  onSave?: () => void;
}

export default function EventDetailHeader({ id, onShare, onSave }: Props) {
  const router = useRouter();

  // ✅ 기본 공유 동작(부모에서 onShare 안 넘기면 이걸로 실행)
  const defaultShare = async () => {
    try {
      // TODO: 실제 링크로 교체 (딥링크/웹 링크)
      const url = `https://www.naver.com/`;

      await Share.share({
        message: url, // Android는 message 중심
        url,          // iOS 대응
        title: "축제 공유하기",
      });
    } catch (e) {
      console.log(e);
    }
  };

  // ✅ 기본 저장 동작(부모에서 onSave 안 넘기면 이걸로 실행)
  const defaultSave = () => {
    // TODO: 실제 저장 로직(API/상태관리)은 나중에 여기 또는 부모에서 처리
    if (Platform.OS === "android") {
      ToastAndroid.show("저장되었습니다", ToastAndroid.SHORT);
    } else {
      Alert.alert("저장되었습니다");
    }
  };

  const handlePressShare = () => {
    if (onShare) return onShare();
    return defaultShare();
  };

  const handlePressSave = () => {
    if (onSave) return onSave();
    return defaultSave();
  };

  return (
    <View style={styles.container}>
      {/* 포스터 이미지 */}
      <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />

      {/* 🔹 뒤로가기 / 공유 / 저장 버튼 */}
      <View style={styles.iconRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>

        <View style={styles.rightGroup}>
          {/* ✅ 공유하기 */}
          <Pressable onPress={handlePressShare} style={styles.iconButton} hitSlop={10}>
            <Text style={styles.iconText}>⤴</Text>
          </Pressable>

          {/* ✅ 저장하기 */}
          <Pressable onPress={handlePressSave} style={styles.iconButton} hitSlop={10}>
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
