// frontend/components/detail/EventBoothTab.tsx

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import BoothMap from "./BoothMap";
import BoothDetailModal from "./BoothDetailModal";

export type BoothType = "food" | "experience";
type Mode = "list" | "map";

export type Booth = {
  id: string;
  name: string;
  locationLabel: string;
  type: BoothType;
  time?: string;
  host?: string;
  menu?: string[];
  description?: string;
  rules?: string[];
  prizes?: string[];
};

const FOOD_BOOTH_MOCK: Booth[] = [
  {
    id: "1",
    name: "바삭한 타코야끼 트럭",
    locationLabel: "운동장 앞",
    type: "food",
    time: "11:00 ~ 15:00",
    host: "푸드트럭",
    menu: [
      "타코야끼(6pcs) - 5,000원",
      "타코야끼(10pcs) - 7,000원",
      "치즈타코야끼(6pcs) - 6,000원",
      "매콤타코야끼(6pcs) - 6,000원",
    ],
  },
  {
    id: "2",
    name: "핫도그 트럭",
    locationLabel: "운동장 앞",
    type: "food",
    time: "11:00 ~ 15:00",
    host: "푸드트럭",
    menu: ["클래식 핫도그 - 4,000원", "치즈 핫도그 - 4,500원"],
  },
  {
    id: "3",
    name: "버거 트럭",
    locationLabel: "테니스장 옆",
    type: "food",
    time: "12:00 ~ 18:00",
    host: "푸드트럭",
    menu: ["불고기 버거 - 6,000원", "치즈버거 - 6,500원"],
  },
  {
    id: "4",
    name: "디저트 트럭",
    locationLabel: "도서관 앞",
    type: "food",
    time: "13:00 ~ 18:00",
    host: "푸드트럭",
    menu: ["츄러스 - 3,500원", "아이스크림 - 3,500원"],
  },
];

const EXPERIENCE_BOOTH_MOCK: Booth[] = [
  {
    id: "5",
    name: "물풍선 터트리기",
    locationLabel: "테니스장 앞",
    type: "experience",
    time: "11:00 ~ 15:00",
    host: "총학생회 축제 부스",
    description: "참가자에게 제한 시간 1분이 주어지고, 목표 지점에 물풍선을 던져 점수를 경쟁하는 게임입니다.",
    rules: [
      "1인 1회 무료 참여, 이후 추가 참여는 쿠폰 사용",
      "안전상의 이유로 진행 요원의 안내에 반드시 따를 것",
    ],
    prizes: [
      "1등: 기프티콘 + 축제 굿즈 세트",
      "2등: 기프티콘",
      "참가상: 랜덤 스티커",
    ],
  },
  {
    id: "6",
    name: "보드게임 존",
    locationLabel: "테니스장 앞",
    type: "experience",
    time: "13:00 ~ 18:00",
    host: "보드게임 동아리",
    description: "간단한 파티게임부터 전략게임까지 즐길 수 있는 자유 체험 부스입니다.",
  },
  {
    id: "7",
    name: "포토존 & 폴라로이드",
    locationLabel: "도서관 앞",
    type: "experience",
    time: "13:00 ~ 20:00",
    host: "홍보국",
    description: "축제 컨셉에 맞는 포토존에서 사진을 찍고 인화해 가져갈 수 있습니다.",
  },
  {
    id: "8",
    name: "굿즈 판매 부스",
    locationLabel: "체육관 입구",
    type: "experience",
    time: "10:00 ~ 18:00",
    host: "총학생회",
    description: "학교 로고와 축제 일러스트가 들어간 한정 굿즈를 판매합니다.",
  },
];

export default function EventBoothTab() {
  const [boothType, setBoothType] = useState<BoothType>("food");
  const [mode, setMode] = useState<Mode>("list");
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);

  const booths =
    boothType === "food" ? FOOD_BOOTH_MOCK : EXPERIENCE_BOOTH_MOCK;

  // 지도 모드
  if (mode === "map") {
    return (
      <View style={styles.mapContainer}>
        <BoothMap />

        <Pressable
          style={[styles.bottomButton, { alignSelf: "center", marginTop: 16 }]}
          onPress={() => setMode("list")}
        >
          <Text style={styles.bottomButtonText}>부스 목록 보기</Text>
        </Pressable>
      </View>
    );
  }

  // 리스트 모드
  return (
    <View style={{ flex: 1 }}>
      {/* 상단 토글 */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[
            styles.segmentItem,
            boothType === "food" && styles.segmentItemActive,
          ]}
          onPress={() => setBoothType("food")}
        >
          <Text
            style={[
              styles.segmentText,
              boothType === "food" && styles.segmentTextActive,
            ]}
          >
            푸드트럭
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.segmentItem,
            boothType === "experience" && styles.segmentItemActive,
          ]}
          onPress={() => setBoothType("experience")}
        >
          <Text
            style={[
              styles.segmentText,
              boothType === "experience" && styles.segmentTextActive,
            ]}
          >
            체험부스
          </Text>
        </Pressable>
      </View>

      {/* 부스 리스트 */}
      <View style={styles.listWrapper}>
        {booths.map((booth) => (
          <Pressable
            key={booth.id}
            style={styles.boothCard}
            onPress={() => setSelectedBooth(booth)}
          >
            <View style={styles.iconPlaceholder} />

            <View style={{ flex: 1 }}>
              <Text style={styles.boothName}>{booth.name}</Text>
              <Text style={styles.boothLocation}>{booth.locationLabel}</Text>
            </View>

            <Text style={styles.star}>★</Text>
          </Pressable>
        ))}
      </View>

      {/* 하단 위치 보기 버튼 */}
      <Pressable
        style={[styles.bottomButton, { alignSelf: "center", marginTop: 16 }]}
        onPress={() => setMode("map")}
      >
        <Text style={styles.bottomButtonText}>위치 보기</Text>
      </Pressable>

      {/* 상세 모달 */}
      <BoothDetailModal
        visible={!!selectedBooth}
        booth={selectedBooth}
        onClose={() => setSelectedBooth(null)}
        onPressLocation={() => {
          setSelectedBooth(null);
          setMode("map");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    color: "#777",
  },
  segmentTextActive: {
    fontWeight: "bold",
    color: "#111",
  },
  listWrapper: {
    gap: 8,
  },
  boothCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffe9c7",
    marginRight: 12,
  },
  boothName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  boothLocation: {
    fontSize: 12,
    color: "#777",
  },
  star: {
    fontSize: 18,
    color: "#ffcc00",
    marginLeft: 8,
  },
  bottomButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  bottomButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  mapContainer: {
    flex: 1,
  },
});
