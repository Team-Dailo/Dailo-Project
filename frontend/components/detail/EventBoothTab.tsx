// frontend/components/detail/EventBoothTab.tsx

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ToastAndroid, Alert } from "react-native";
import BoothMap from "./BoothMap";
import BoothDetailModal from "./BoothDetailModal";
import type { EventBoothItem } from "../../types/event";
import * as boothFavoriteService from "../../services/boothFavorite.service";

export type BoothType = "food" | "experience";
type Mode = "list" | "map";

export type Booth = EventBoothItem & { locationLabel?: string };

interface EventBoothTabProps {
  /** 행사 ID (부스 즐겨찾기 연동용) */
  eventId?: number;
  /** 행사 제목 (부스 즐겨찾기 표시용) */
  eventTitle?: string;
  /** 저장된 푸드트럭 목록 */
  foodBooths?: EventBoothItem[] | null;
  /** 저장된 체험부스 목록 */
  experienceBooths?: EventBoothItem[] | null;
}

export default function EventBoothTab({
  eventId,
  eventTitle = "",
  foodBooths,
  experienceBooths,
}: EventBoothTabProps = {}) {
  const [boothType, setBoothType] = useState<BoothType>("food");
  const [mode, setMode] = useState<Mode>("list");
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());

  const food = foodBooths && foodBooths.length > 0 ? foodBooths : [];
  const experience = experienceBooths && experienceBooths.length > 0 ? experienceBooths : [];
  const booths = (boothType === "food" ? food : experience) as Booth[];

  const loadFavorites = useCallback(async () => {
    if (eventId == null) return;
    const list = await boothFavoriteService.getBoothFavorites();
    const set = new Set(
      list.filter((x) => x.eventId === eventId).map((x) => x.boothName)
    );
    setFavoriteSet(set);
  }, [eventId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (booth: Booth) => eventId != null && favoriteSet.has(booth.name),
    [eventId, favoriteSet]
  );

  const handleToggleFavorite = useCallback(
    async (booth: Booth) => {
      if (eventId == null) return;
      const item: boothFavoriteService.BoothFavoriteItem = {
        eventId,
        eventTitle,
        boothName: booth.name,
        boothType: booth.type,
      };
      const added = await boothFavoriteService.toggleBoothFavorite(item);
      await loadFavorites();
      if (Platform.OS === "android") {
        ToastAndroid.show(
          added ? "부스를 즐겨찾기에 추가했어요" : "즐겨찾기를 해제했어요",
          ToastAndroid.SHORT
        );
      } else {
        Alert.alert(added ? "부스를 즐겨찾기에 추가했어요" : "즐겨찾기를 해제했어요");
      }
    },
    [eventId, eventTitle, loadFavorites]
  );

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
        {booths.length === 0 ? (
          <Text style={styles.emptyText}>등록된 부스가 없습니다.</Text>
        ) : (
          booths.map((booth) => (
            <Pressable
              key={booth.id}
              style={styles.boothCard}
              onPress={() => setSelectedBooth(booth)}
            >
              <View style={styles.iconPlaceholder} />
              <View style={{ flex: 1 }}>
                <Text style={styles.boothName}>{booth.name}</Text>
                <Text style={styles.boothLocation}>{booth.locationLabel ?? ""}</Text>
              </View>
              <Text style={styles.star}>★</Text>
            </Pressable>
          ))
        )}
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
        eventId={eventId}
        isFavorite={selectedBooth ? isFavorite(selectedBooth) : false}
        onToggleFavorite={
          selectedBooth
            ? () => handleToggleFavorite(selectedBooth)
            : undefined
        }
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
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
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
