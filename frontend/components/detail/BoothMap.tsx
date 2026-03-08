// frontend/components/detail/BoothMap.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
} from "@mj-studio/react-native-naver-map";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
/** 지도 세로 비율 (화면 높이 대비). 세로로 길게 보이도록 60% 사용 */
const MAP_HEIGHT = Math.max(400, SCREEN_HEIGHT * 0.6);
const DEFAULT_LAT = 36.991;
const DEFAULT_LNG = 127.926;
const AREA_CIRCLE_RADIUS_M = 80;
const AREA_CIRCLE_COLOR = "rgba(76, 139, 245, 0.25)";
const AREA_CIRCLE_OUTLINE = 2;
const AREA_CIRCLE_OUTLINE_COLOR = "rgba(76, 139, 245, 0.7)";

interface BoothMapProps {
  /** 지도 중심 위도 (없으면 기본값 또는 플레이스홀더) */
  centerLatitude?: number;
  /** 지도 중심 경도 */
  centerLongitude?: number;
}

export default function BoothMap({
  centerLatitude,
  centerLongitude,
}: BoothMapProps) {
  const hasCoords =
    centerLatitude != null &&
    centerLongitude != null &&
    Number.isFinite(centerLatitude) &&
    Number.isFinite(centerLongitude);

  const lat = hasCoords ? centerLatitude : DEFAULT_LAT;
  const lng = hasCoords ? centerLongitude : DEFAULT_LNG;

  /** 사진처럼 건물·영역이 잘 보이는 기본 배율 (확대 1단계 수준) */
  const DEFAULT_ZOOM = 16;
  const initialCamera = useMemo(
    () => ({
      latitude: lat,
      longitude: lng,
      zoom: DEFAULT_ZOOM,
    }),
    [lat, lng]
  );

  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return (
      <View style={styles.container}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>
            지도는 Android / iOS 앱에서 확인할 수 있어요.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.mapWrap, { height: MAP_HEIGHT }]}>
        <NaverMapView
          style={StyleSheet.absoluteFill}
          mapType="Basic"
          isShowScaleBar={false}
          isShowZoomControls={true}
          isShowLocationButton={false}
          initialCamera={initialCamera}
          camera={{ latitude: lat, longitude: lng, zoom: DEFAULT_ZOOM }}
        >
          <NaverMapMarkerOverlay
            key="booth-center-marker"
            latitude={lat}
            longitude={lng}
            image={{ symbol: "red" }}
            anchor={{ x: 0.5, y: 1 }}
          />
          <NaverMapCircleOverlay
            key="booth-area-circle"
            latitude={lat}
            longitude={lng}
            radius={AREA_CIRCLE_RADIUS_M}
            color={AREA_CIRCLE_COLOR}
            outlineWidth={AREA_CIRCLE_OUTLINE}
            outlineColor={AREA_CIRCLE_OUTLINE_COLOR}
            zIndex={5}
          />
        </NaverMapView>
      </View>
      {!hasCoords && (
        <Text style={styles.hint}>
          행사 위치가 설정되지 않아 기본 지도가 표시됩니다.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 24,
  },
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
  },
  mapPlaceholder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f7f7f7",
    height: MAP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  mapText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});
