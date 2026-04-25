// frontend/components/detail/EventBoothTab.tsx

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ToastAndroid, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BoothMap from "./BoothMap";
import BoothDetailModal from "./BoothDetailModal";
import BoothLayoutMap from "./BoothLayoutMap";
import type { EventBoothItem } from "../../types/event";
import * as boothFavoriteService from "../../services/boothFavorite.service";

export type BoothType = "food" | "experience";
type Mode = "list" | "map" | "layout";

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
  /** 행사 장소 위도 (위치 보기 지도 중심 fallback) */
  eventLatitude?: number | null;
  /** 행사 장소 경도 (위치 보기 지도 중심 fallback) */
  eventLongitude?: number | null;
  /** 푸드트럭 영역 위치 (관리자 설정, 위치 보기 시 사용) */
  foodArea?: { latitude: number; longitude: number } | null;
  /** 체험부스 영역 위치 (관리자 설정, 위치 보기 시 사용) */
  experienceArea?: { latitude: number; longitude: number } | null;
}

export default function EventBoothTab({
  eventId,
  eventTitle = "",
  foodBooths,
  experienceBooths,
  eventLatitude = null,
  eventLongitude = null,
  foodArea = null,
  experienceArea = null,
}: EventBoothTabProps = {}) {
  const [boothType, setBoothType] = useState<BoothType>("food");
  const [mode, setMode] = useState<Mode>("list");
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());

  const food = foodBooths && foodBooths.length > 0 ? foodBooths : [];
  const experience = experienceBooths && experienceBooths.length > 0 ? experienceBooths : [];
  const booths = (boothType === "food" ? food : experience) as Booth[];

  /** 위치 보기 지도 중심: 선택한 타입(푸드/체험) 영역 위치 또는 행사 장소 */
  const mapCenter =
    mode === "map"
      ? boothType === "food"
        ? foodArea ?? (eventLatitude != null && eventLongitude != null ? { latitude: eventLatitude, longitude: eventLongitude } : null)
        : experienceArea ?? (eventLatitude != null && eventLongitude != null ? { latitude: eventLatitude, longitude: eventLongitude } : null)
      : null;

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

  return (
    <View>
      {/* 모드 토글 (배치도 / 목록) — 배치도 모드에서는 푸드트럭/체험부스 세그먼트 숨김 */}
      <View style={styles.modeToggleRow}>
        <Pressable
          style={[styles.modeToggleBtn, mode === "layout" && styles.modeToggleBtnActive]}
          onPress={() => setMode("layout")}
        >
          <Text style={[styles.modeToggleText, mode === "layout" && styles.modeToggleTextActive]}>배치도</Text>
        </Pressable>
        <Pressable
          style={[styles.modeToggleBtn, mode === "list" && styles.modeToggleBtnActive]}
          onPress={() => setMode("list")}
        >
          <Text style={[styles.modeToggleText, mode === "list" && styles.modeToggleTextActive]}>목록</Text>
        </Pressable>
        <Pressable
          style={[styles.modeToggleBtn, mode === "map" && styles.modeToggleBtnActive]}
          onPress={() => setMode("map")}
        >
          <Text style={[styles.modeToggleText, mode === "map" && styles.modeToggleTextActive]}>위치</Text>
        </Pressable>
      </View>

      {/* 배치도 모드 */}
      {mode === "layout" && (
        <BoothLayoutMap
          foodBooths={foodBooths}
          experienceBooths={experienceBooths}
          eventId={eventId}
          eventTitle={eventTitle}
        />
      )}

      {/* 위치 모드 */}
      {mode === "map" && (
        <>
          {/* 푸드트럭/체험부스 세그먼트 */}
          <View style={styles.segmentContainer}>
            <Pressable
              style={[styles.segmentItem, boothType === "food" && styles.segmentItemActive]}
              onPress={() => setBoothType("food")}
            >
              <Text style={[styles.segmentText, boothType === "food" && styles.segmentTextActive]}>푸드트럭</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentItem, boothType === "experience" && styles.segmentItemActive]}
              onPress={() => setBoothType("experience")}
            >
              <Text style={[styles.segmentText, boothType === "experience" && styles.segmentTextActive]}>체험부스</Text>
            </Pressable>
          </View>
          <BoothMap
            centerLatitude={mapCenter?.latitude}
            centerLongitude={mapCenter?.longitude}
          />
        </>
      )}

      {/* 목록 모드 */}
      {mode === "list" && (
        <>
          {/* 푸드트럭/체험부스 세그먼트 */}
          <View style={styles.segmentContainer}>
            <Pressable
              style={[styles.segmentItem, boothType === "food" && styles.segmentItemActive]}
              onPress={() => setBoothType("food")}
            >
              <Text style={[styles.segmentText, boothType === "food" && styles.segmentTextActive]}>푸드트럭</Text>
            </Pressable>
            <Pressable
              style={[styles.segmentItem, boothType === "experience" && styles.segmentItemActive]}
              onPress={() => setBoothType("experience")}
            >
              <Text style={[styles.segmentText, boothType === "experience" && styles.segmentTextActive]}>체험부스</Text>
            </Pressable>
          </View>
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
                  <View style={[
                    styles.iconPlaceholder,
                    boothType === "food"
                      ? { backgroundColor: "#FEF0E6" }
                      : { backgroundColor: "#EBF3FB" },
                  ]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.boothName}>{booth.name}</Text>
                    <Text style={styles.boothLocation}>{booth.locationLabel ?? ""}</Text>
                  </View>
                  {eventId != null ? (
                    <Pressable
                      hitSlop={8}
                      onPress={(e) => { e.stopPropagation?.(); handleToggleFavorite(booth); }}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={isFavorite(booth) ? "star" : "star-outline"}
                        size={24}
                        color={isFavorite(booth) ? "#EAB308" : "#D1D5DB"}
                      />
                    </Pressable>
                  ) : (
                    <Ionicons name="star-outline" size={24} color="#D1D5DB" />
                  )}
                </Pressable>
              ))
            )}
          </View>
        </>
      )}

      {/* 상세 모달 (목록 모드용) */}
      <BoothDetailModal
        visible={!!selectedBooth}
        booth={selectedBooth}
        eventId={eventId}
        isFavorite={selectedBooth ? isFavorite(selectedBooth) : false}
        onToggleFavorite={selectedBooth ? () => handleToggleFavorite(selectedBooth) : undefined}
        onClose={() => setSelectedBooth(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modeToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modeToggleBtnActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeToggleTextActive: {
    color: "#FFFFFF",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    borderRadius: 999,
    padding: 4,
    marginTop: 12,
    marginBottom: 20,
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
  starButton: {
    marginLeft: 8,
    padding: 4,
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
