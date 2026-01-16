// app/(tabs)/home/index.tsx

import React from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      {/* 상단 배너 */}
      <View style={styles.bannerWrapper}>
        <View style={styles.banner}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>D-5</Text>
          </View>
          <Image
            source={{ uri: "https://via.placeholder.com/350x180" }}
            style={styles.bannerImage}
          />
          <View style={styles.bannerTextWrapper}>
            <Text style={styles.bannerTitle}>Lucide Dream</Text>
            <Text style={styles.bannerSub}>한국교통대학교</Text>
            <Text style={styles.bannerDate}>2025.9.23 ~ 9.24</Text>
          </View>
        </View>
      </View>

      {/* 인기 게시물 섹션 (모양만) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>인기 게시물</Text>
          <Text style={styles.sectionMore}>더 보기 &gt;</Text>
        </View>
        <View style={styles.postList}>
          <Text style={styles.postItem}>
            <Text style={styles.postType}>자유 </Text>아니 근데 쿠션도 드림
          </Text>
          <Text style={styles.postItem}>
            <Text style={styles.postType}>질문 </Text>총학생회 플랜샵 언제열려요?
          </Text>
          <Text style={styles.postItem}>
            <Text style={styles.postType}>친구 </Text>혹시 소리담 공연 같이 보러
            가실 분 있으신가요?
          </Text>
        </View>
      </View>

      {/* 행사 리스트 섹션 (모양만) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>행사 리스트</Text>
          <Text style={styles.sectionMore}>더 보기 &gt;</Text>
        </View>

        {/* 카드 1 */}
        <View style={styles.eventCard}>
          <Image
            source={{ uri: "https://via.placeholder.com/80x120" }}
            style={styles.eventImage}
          />
          <View style={styles.eventInfo}>
            <Text style={styles.eventCategory}>공연</Text>
            <Text style={styles.eventTitle}>소리담 2학기 정기공연</Text>
            <Text style={styles.eventDate}>2025.11.20 목요일</Text>
            <Text style={styles.eventTime}>19:00 ~ 21:00</Text>
            <Pressable
              style={styles.detailButton}
              onPress={() => router.push("/event/1")} // ✅ 여기서 상세보기로 이동
            >
              <Text style={styles.detailButtonText}>자세히 보기</Text>
            </Pressable>
          </View>
        </View>

        {/* 카드 2 (예시용) */}
        <View style={styles.eventCard}>
          <Image
            source={{ uri: "https://via.placeholder.com/80x120" }}
            style={styles.eventImage}
          />
          <View style={styles.eventInfo}>
            <Text style={styles.eventCategory}>공연</Text>
            <Text style={styles.eventTitle}>식스라인 2학기 정기공연</Text>
            <Text style={styles.eventDate}>2025.11.17 월요일</Text>
            <Text style={styles.eventTime}>19:00 ~ 21:00</Text>
            <Pressable
              style={styles.detailButton}
              onPress={() => router.push("/event/2")}
            >
              <Text style={styles.detailButtonText}>자세히 보기</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 👇 임시 테스트용 단일 버튼 (원하면 이거만 써도 됨) */}
      <Pressable
        style={styles.tempButton}
        onPress={() => router.push("/event/1")}
      >
        <Text style={styles.tempButtonText}>임시 행사 상세보기 열기</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  bannerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  banner: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ddd",
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#315ef6",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  bannerImage: {
    width: "100%",
    height: 180,
  },
  bannerTextWrapper: {
    position: "absolute",
    left: 16,
    bottom: 16,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  bannerSub: {
    color: "#fff",
    marginTop: 4,
  },
  bannerDate: {
    color: "#fff",
    marginTop: 2,
    fontSize: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionMore: {
    fontSize: 12,
    color: "#888",
  },
  postList: {
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postItem: {
    fontSize: 14,
    marginBottom: 6,
  },
  postType: {
    fontWeight: "bold",
  },
  eventCard: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#f7f7f7",
    padding: 12,
  },
  eventImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#ccc",
  },
  eventInfo: {
    flex: 1,
  },
  eventCategory: {
    fontSize: 12,
    color: "#888",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 4,
  },
  eventDate: {
    fontSize: 13,
    marginTop: 4,
  },
  eventTime: {
    fontSize: 13,
    marginTop: 2,
  },
  detailButton: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#3178f6",
    alignItems: "center",
  },
  detailButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  tempButton: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ff7b54",
    alignItems: "center",
  },
  tempButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
