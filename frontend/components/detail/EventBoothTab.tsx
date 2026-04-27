// frontend/components/detail/EventBoothTab.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ToastAndroid,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BoothMap from "./BoothMap";
import BoothDetailModal from "./BoothDetailModal";
import BoothLayoutMap from "./BoothLayoutMap";
import type { EventBoothItem } from "../../types/event";
import { getBoothVisual } from "../../utils/boothVisual";
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
  const [mode, setMode] = useState<Mode>("layout");
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(new Set());

  const food = foodBooths && foodBooths.length > 0 ? foodBooths : [];
  const experience =
    experienceBooths && experienceBooths.length > 0 ? experienceBooths : [];
  const booths = (boothType === "food" ? food : experience) as Booth[];

  /** 위치 보기 지도 중심: 선택한 타입(푸드/체험) 영역 위치 또는 행사 장소 */
  const mapCenter =
    mode === "map"
      ? boothType === "food"
        ? foodArea ??
          (eventLatitude != null && eventLongitude != null
            ? { latitude: eventLatitude, longitude: eventLongitude }
            : null)
        : experienceArea ??
          (eventLatitude != null && eventLongitude != null
            ? { latitude: eventLatitude, longitude: eventLongitude }
            : null)
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
        Alert.alert(
          added ? "부스를 즐겨찾기에 추가했어요" : "즐겨찾기를 해제했어요"
        );
      }
    },
    [eventId, eventTitle, loadFavorites]
  );

  return (
    <View style={styles.container}>
      {/* 모드 토글 */}
      <View style={styles.modeToggleWrap}>
        <Pressable
          style={[
            styles.modeToggleBtn,
            mode === "layout" && styles.modeToggleBtnActive,
          ]}
          onPress={() => setMode("layout")}
        >
          <Ionicons
            name="grid-outline"
            size={15}
            color={mode === "layout" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.modeToggleText,
              mode === "layout" && styles.modeToggleTextActive,
            ]}
          >
            배치도
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeToggleBtn,
            mode === "list" && styles.modeToggleBtnActive,
          ]}
          onPress={() => setMode("list")}
        >
          <Ionicons
            name="list-outline"
            size={15}
            color={mode === "list" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.modeToggleText,
              mode === "list" && styles.modeToggleTextActive,
            ]}
          >
            목록
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.modeToggleBtn,
            mode === "map" && styles.modeToggleBtnActive,
          ]}
          onPress={() => setMode("map")}
        >
          <Ionicons
            name="location-outline"
            size={15}
            color={mode === "map" ? "#FFFFFF" : "#6B7280"}
          />
          <Text
            style={[
              styles.modeToggleText,
              mode === "map" && styles.modeToggleTextActive,
            ]}
          >
            위치
          </Text>
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

          <BoothMap
            centerLatitude={mapCenter?.latitude}
            centerLongitude={mapCenter?.longitude}
          />
        </>
      )}

      {/* 목록 모드 */}
      {mode === "list" && (
        <>
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

          <View style={styles.listWrapper}>
            {booths.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyText}>등록된 부스가 없습니다.</Text>
              </View>
            ) : (
              booths.map((booth) => {
                const visual = getBoothVisual(booth, boothType);
                const isFood = boothType === "food";

                return (
                  <Pressable
                    key={booth.id}
                    style={styles.boothCard}
                    onPress={() => setSelectedBooth(booth)}
                  >
                    <View
                      style={[
                        styles.iconPlaceholder,
                        isFood
                          ? styles.foodIconPlaceholder
                          : styles.expIconPlaceholder,
                      ]}
                    >
                      <Ionicons
                        name={visual.icon}
                        size={22}
                        color={isFood ? "#B85721" : "#2F63A7"}
                      />
                    </View>

                    <View style={styles.boothTextArea}>
                      <Text style={styles.boothName} numberOfLines={1}>
                        {booth.name}
                      </Text>

                      <View style={styles.boothMetaRow}>
                        <Text
                          style={[
                            styles.categoryChip,
                            isFood
                              ? styles.foodCategoryChip
                              : styles.expCategoryChip,
                          ]}
                          numberOfLines={1}
                        >
                          {visual.label}
                        </Text>

                        {!!booth.locationLabel && (
                          <Text style={styles.boothLocation} numberOfLines={1}>
                            {booth.locationLabel}
                          </Text>
                        )}
                      </View>
                    </View>

                    {eventId != null ? (
                      <Pressable
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleToggleFavorite(booth);
                        }}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={isFavorite(booth) ? "star" : "star-outline"}
                          size={22}
                          color={isFavorite(booth) ? "#EAB308" : "#D1D5DB"}
                        />
                      </Pressable>
                    ) : (
                      <Ionicons
                        name="star-outline"
                        size={22}
                        color="#D1D5DB"
                      />
                    )}
                  </Pressable>
                );
              })
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
        onToggleFavorite={
          selectedBooth ? () => handleToggleFavorite(selectedBooth) : undefined
        }
        onClose={() => setSelectedBooth(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },

  modeToggleWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
  },
  modeToggleBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: "#111827",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },
  modeToggleTextActive: {
    color: "#FFFFFF",
  },

  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
    marginTop: 4,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#111827",
  },

  listWrapper: {
    gap: 10,
  },
  boothCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  foodIconPlaceholder: {
    backgroundColor: "#FFF2EA",
    borderColor: "#FFD6BE",
  },
  expIconPlaceholder: {
    backgroundColor: "#EEF5FF",
    borderColor: "#CFE1FA",
  },
  boothTextArea: {
    flex: 1,
    minWidth: 0,
  },
  boothName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  boothMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  categoryChip: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 104,
  },
  foodCategoryChip: {
    backgroundColor: "#FFE7D8",
    color: "#B85721",
  },
  expCategoryChip: {
    backgroundColor: "#E8F1FD",
    color: "#2F63A7",
  },
  boothLocation: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
  },
  starButton: {
    marginLeft: 8,
    padding: 4,
  },

  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});