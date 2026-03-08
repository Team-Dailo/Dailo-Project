import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import { setPickedLocation } from "../../../services/eventLocationPickStore";
import { setDemoLocation } from "../../../services/demoLocationStorage";
import { geocodeAddress } from "../../../services/geocoding.service";

const DEFAULT_LAT = 36.991;
const DEFAULT_LNG = 127.926;
const MAP_MIN_HEIGHT = Dimensions.get("window").height * 0.5;
const PICKER_CIRCLE_RADIUS_M = 80;
const PICKER_CIRCLE_COLOR = "rgba(76, 139, 245, 0.25)";
const PICKER_CIRCLE_OUTLINE = 2;
const PICKER_CIRCLE_OUTLINE_COLOR = "rgba(76, 139, 245, 0.7)";

export default function EventLocationPickerScreen() {
  const params = useLocalSearchParams<{
    initialLat?: string;
    initialLng?: string;
    for?: string;
    forBoothId?: string;
    forBoothType?: "food" | "experience";
    forArea?: "food" | "experience";
  }>();
  const isDemoLocation = params.for === "demolocation";
  const forBoothId = params.forBoothId ?? undefined;
  const forBoothType = params.forBoothType as "food" | "experience" | undefined;
  const forArea = params.forArea as "food" | "experience" | undefined;
  const initialLat = params.initialLat != null ? Number(params.initialLat) : DEFAULT_LAT;
  const initialLng = params.initialLng != null ? Number(params.initialLng) : DEFAULT_LNG;

  const mapRef = useRef<NaverMapViewRef>(null);
  const [lat, setLat] = useState(() =>
    Number.isFinite(initialLat) ? initialLat : DEFAULT_LAT
  );
  const [lng, setLng] = useState(() =>
    Number.isFinite(initialLng) ? initialLng : DEFAULT_LNG
  );
  const [addressQuery, setAddressQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const initialCamera = useMemo(
    () => ({
      latitude: Number.isFinite(initialLat) ? initialLat : DEFAULT_LAT,
      longitude: Number.isFinite(initialLng) ? initialLng : DEFAULT_LNG,
      zoom: 15,
    }),
    []
  );

  const handleTapMap = useCallback((e: { latitude: number; longitude: number }) => {
    setLat(e.latitude);
    setLng(e.longitude);
  }, []);

  const handleAddressSearch = useCallback(async () => {
    const q = addressQuery.trim();
    if (!q) return;
    Keyboard.dismiss();
    setSearching(true);
    try {
      const result = await geocodeAddress(q);
      if (result) {
        setLat(result.latitude);
        setLng(result.longitude);
        mapRef.current?.animateCameraTo({
          latitude: result.latitude,
          longitude: result.longitude,
          zoom: 16,
          duration: 400,
          easing: "EaseOut",
        });
      } else {
        Alert.alert("검색 실패", "해당 주소를 찾을 수 없어요. 다른 주소로 검색해 보세요.");
      }
    } catch {
      Alert.alert("검색 실패", "주소 검색 중 오류가 났어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSearching(false);
    }
  }, [addressQuery]);

  const handleConfirm = async () => {
    if (isDemoLocation) {
      await setDemoLocation(lat, lng);
      router.back();
      return;
    }
    setPickedLocation(lat, lng, forBoothId, forBoothType, forArea);
    router.back();
  };

  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return (
      <View style={styles.centered}>
        <Text style={styles.fallbackText}>
          지도는 Android / iOS 앱에서만 사용할 수 있습니다.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 주소 검색창: 입력 후 검색 시 해당 위치로 카메라 이동 + 마커 표시 */}
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="주소 입력 후 검색 (예: 충주시립미술관, 서울시청)"
          placeholderTextColor="#9CA3AF"
          value={addressQuery}
          onChangeText={setAddressQuery}
          onSubmitEditing={handleAddressSearch}
          returnKeyType="search"
          editable={!searching}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleAddressSearch}
          disabled={searching || !addressQuery.trim()}
          activeOpacity={0.8}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.mapWrap, { minHeight: MAP_MIN_HEIGHT }]}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          mapType="Basic"
          isShowScaleBar={false}
          isShowZoomControls={true}
          isShowLocationButton={false}
          initialCamera={initialCamera}
          camera={{ latitude: lat, longitude: lng, zoom: 16 }}
          onTapMap={handleTapMap}
        >
          <NaverMapMarkerOverlay
            key="picker-marker"
            latitude={lat}
            longitude={lng}
            image={{ symbol: "red" }}
            anchor={{ x: 0.5, y: 1 }}
          />
          <NaverMapCircleOverlay
            key="picker-area-circle"
            latitude={lat}
            longitude={lng}
            radius={PICKER_CIRCLE_RADIUS_M}
            color={PICKER_CIRCLE_COLOR}
            outlineWidth={PICKER_CIRCLE_OUTLINE}
            outlineColor={PICKER_CIRCLE_OUTLINE_COLOR}
            zIndex={5}
          />
        </NaverMapView>
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>
          주소 검색으로 이동하거나, 지도를 탭해서 마커 위치를 조정한 뒤 아래 버튼을 눌러 주세요
        </Text>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
          {isDemoLocation ? "시범용 현재위치로 저장" : forArea === "food" ? "푸드트럭 영역으로 설정" : forArea === "experience" ? "체험부스 영역으로 설정" : forBoothId ? "이 위치로 부스 설정" : "이 위치로 설정"}
        </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#4C8BF5",
    alignItems: "center",
    justifyContent: "center",
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  confirmBtn: {
    backgroundColor: "#4C8BF5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  fallbackText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
