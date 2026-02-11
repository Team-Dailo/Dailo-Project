// app/(tabs)/map/_components/NaverMap.tsx
import React, { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import type { Event } from '../../../../types/event';
import { MAP_UI } from '../../../../constants/colors';

/** 규모(scale) → 마커 tint 색상 (규모 범례와 동일) */
const SCALE_COLORS: Record<Event['scale'], string> = {
  CITY: MAP_UI.scaleBadge[0],
  UNIVERSITY: MAP_UI.scaleBadge[1],
  DEPARTMENT: MAP_UI.scaleBadge[2],
  CLUB: MAP_UI.scaleBadge[3],
  PERSONAL: MAP_UI.scaleBadge[4],
};

const DEFAULT_CAMERA = {
  latitude: 37.5665,
  longitude: 126.978,
  zoom: 14,
};

export type NaverMapCamera = {
  latitude: number;
  longitude: number;
  zoom: number;
};

type Props = {
  style?: object;
  camera: NaverMapCamera;
  events: Event[];
  onMarkerPress: (event: Event) => void;
  /** 카메라 이동이 끝났을 때(드래그/줌 후) 호출. region 동기화용 (latitude/longitude는 남서쪽, center 아님) */
  onCameraIdle?: (params: { region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } }) => void;
  /** 현재 위치 버튼을 눌렀을 때 표시할 파란 동그라미 위치 */
  currentLocation?: { latitude: number; longitude: number } | null;
  /** 동그라미 표시용 좌표(실제 위치 못 받을 때 fallback 등). 있으면 이걸 우선 사용 */
  circleCoords?: { latitude: number; longitude: number } | null;
  /** 현재 위치 파란 동그라미 표시 여부 */
  showMyLocationCircle?: boolean;
};

const MY_LOCATION_CIRCLE_RADIUS_M = 60;
const MY_LOCATION_CIRCLE_COLOR = '#4285F4';
const MY_LOCATION_CIRCLE_OUTLINE_WIDTH = 3;
const MY_LOCATION_CIRCLE_OUTLINE_COLOR = '#ffffff';

export const NaverMap = forwardRef<NaverMapViewRef, Props>(function NaverMap(
  { style, camera, events, onMarkerPress, onCameraIdle, currentLocation, circleCoords, showMyLocationCircle },
  ref
) {
  const myLocationCoords = circleCoords ?? currentLocation ?? null;
  const effectiveCamera = useMemo(() => {
    const lat = camera?.latitude ?? DEFAULT_CAMERA.latitude;
    const lng = camera?.longitude ?? DEFAULT_CAMERA.longitude;
    const zoom = camera?.zoom ?? DEFAULT_CAMERA.zoom;
    return {
      latitude: Number.isFinite(lat) ? lat : DEFAULT_CAMERA.latitude,
      longitude: Number.isFinite(lng) ? lng : DEFAULT_CAMERA.longitude,
      zoom: Number.isFinite(zoom) ? Math.min(18, Math.max(10, zoom)) : DEFAULT_CAMERA.zoom,
    };
  }, [camera?.latitude, camera?.longitude, camera?.zoom]);

  const eventsWithCoords = useMemo(
    () =>
      events.filter(
        (e) =>
          e.latitude != null &&
          e.longitude != null &&
          Number.isFinite(e.latitude) &&
          Number.isFinite(e.longitude)
      ),
    [events]
  );

  return (
    <NaverMapView
      ref={ref}
      style={[styles.map, style]}
      initialCamera={DEFAULT_CAMERA}
      camera={effectiveCamera}
      mapType="Basic"
      isShowScaleBar={false}
      isShowZoomControls={false}
      isShowLocationButton={false}
      onCameraIdle={onCameraIdle}
    >
      {eventsWithCoords.map((event) => (
        <NaverMapMarkerOverlay
          key={event.id}
          latitude={event.latitude}
          longitude={event.longitude}
          image={{ symbol: 'red' }}
          tintColor={SCALE_COLORS[event.scale] ?? MAP_UI.scaleBadge[4]}
          anchor={{ x: 0.5, y: 1 }}
          caption={event.title ? { text: event.title } : undefined}
          onTap={() => onMarkerPress(event)}
        />
      ))}
      {showMyLocationCircle &&
        myLocationCoords != null &&
        Number.isFinite(myLocationCoords.latitude) &&
        Number.isFinite(myLocationCoords.longitude) && (
          <NaverMapCircleOverlay
            key="my-location-circle"
            latitude={myLocationCoords.latitude}
            longitude={myLocationCoords.longitude}
            radius={MY_LOCATION_CIRCLE_RADIUS_M}
            color={MY_LOCATION_CIRCLE_COLOR}
            outlineWidth={MY_LOCATION_CIRCLE_OUTLINE_WIDTH}
            outlineColor={MY_LOCATION_CIRCLE_OUTLINE_COLOR}
            zIndex={10}
            globalZIndex={300000}
          />
        )}
    </NaverMapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
