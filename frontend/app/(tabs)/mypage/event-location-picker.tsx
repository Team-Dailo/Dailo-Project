import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  NaverMapView,
  NaverMapMarkerOverlay,
} from "@mj-studio/react-native-naver-map";
import { setPickedLocation } from "../../../services/eventLocationPickStore";
import { setDemoLocation } from "../../../services/demoLocationStorage";

const DEFAULT_LAT = 36.991;
const DEFAULT_LNG = 127.926;

export default function EventLocationPickerScreen() {
  const params = useLocalSearchParams<{
    initialLat?: string;
    initialLng?: string;
    for?: string;
  }>();
  const isDemoLocation = params.for === "demolocation";
  const initialLat = params.initialLat != null ? Number(params.initialLat) : DEFAULT_LAT;
  const initialLng = params.initialLng != null ? Number(params.initialLng) : DEFAULT_LNG;

  const [lat, setLat] = useState(() =>
    Number.isFinite(initialLat) ? initialLat : DEFAULT_LAT
  );
  const [lng, setLng] = useState(() =>
    Number.isFinite(initialLng) ? initialLng : DEFAULT_LNG
  );

  const initialCamera = useMemo(
    () => ({
      latitude: Number.isFinite(initialLat) ? initialLat : DEFAULT_LAT,
      longitude: Number.isFinite(initialLng) ? initialLng : DEFAULT_LNG,
      zoom: 15,
    }),
    []
  );

  const handleTapMap = (e: { latitude: number; longitude: number }) => {
    setLat(e.latitude);
    setLng(e.longitude);
  };

  const handleConfirm = async () => {
    if (isDemoLocation) {
      await setDemoLocation(lat, lng);
      router.back();
      return;
    }
    setPickedLocation(lat, lng);
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
      <View style={styles.mapWrap}>
        <NaverMapView
          style={styles.map}
          mapType="Basic"
          isShowScaleBar={false}
          isShowZoomControls={true}
          isShowLocationButton={false}
          initialCamera={initialCamera}
          onTapMap={handleTapMap}
        >
          <NaverMapMarkerOverlay
            key="picker-marker"
            latitude={lat}
            longitude={lng}
            image={{ symbol: "red" }}
            anchor={{ x: 0.5, y: 1 }}
          />
        </NaverMapView>
      </View>
      <View style={styles.footer}>
        <Text style={styles.coordsText}>
          위도 {lat.toFixed(6)} / 경도 {lng.toFixed(6)}
        </Text>
        <Text style={styles.hint}>지도를 탭하면 마커 위치가 바뀝니다</Text>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBtnText}>
          {isDemoLocation ? "시범용 현재위치로 저장" : "이 위치로 설정"}
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
  coordsText: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  confirmBtn: {
    backgroundColor: "#2563EB",
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
