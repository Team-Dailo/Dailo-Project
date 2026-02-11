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
  /** 선택된 행사 마커 → 해당 위치에 빨간 원(200m 반경) 표시 */
  selectedEvent?: Event | null;
  /** 거리 필터 적용 시: 내 위치 기준 반경(m). 있으면 해당 거리만큼 원 표시 */
  distanceFilterRadiusM?: number | null;
  /** 거리 필터 원의 중심 (내 위치) */
  distanceFilterCenter?: { latitude: number; longitude: number } | null;
};

const MY_LOCATION_CIRCLE_RADIUS_M = 25;
const MY_LOCATION_CIRCLE_COLOR = '#4285F4';
const MY_LOCATION_CIRCLE_OUTLINE_WIDTH = 3;
const MY_LOCATION_CIRCLE_OUTLINE_COLOR = '#ffffff';

/** 마커 선택 시 표시하는 행사 반경 원 (200m) */
const EVENT_ZONE_RADIUS_M = 200;
const EVENT_ZONE_COLOR = 'rgba(239, 68, 68, 0.25)';
const EVENT_ZONE_OUTLINE_WIDTH = 2;
const EVENT_ZONE_OUTLINE_COLOR = 'rgba(239, 68, 68, 0.6)';

/** 행사 시작일까지 남은 일수 (이미 시작했으면 0) */
function getDaysUntilStart(startAt: string): number {
  const start = new Date(startAt).getTime();
  const now = Date.now();
  if (Number.isNaN(start)) return 0;
  const days = Math.ceil((start - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

const DISTANCE_FILTER_CIRCLE_COLOR = 'rgba(59, 130, 246, 0.15)';
const DISTANCE_FILTER_CIRCLE_OUTLINE_WIDTH = 2;
const DISTANCE_FILTER_CIRCLE_OUTLINE_COLOR = 'rgba(59, 130, 246, 0.5)';

export const NaverMap = forwardRef<NaverMapViewRef, Props>(function NaverMap(
  { style, camera, events, onMarkerPress, onCameraIdle, currentLocation, circleCoords, showMyLocationCircle, selectedEvent, distanceFilterRadiusM, distanceFilterCenter },
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
          Number.isFinite(e.longitude) &&
          (e.latitude !== 0 || e.longitude !== 0)
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
      {eventsWithCoords.map((event) => {
        const daysLeft = getDaysUntilStart(event.startAt);
        const daysText = daysLeft > 0 ? String(daysLeft) : '0';
        return (
          <NaverMapMarkerOverlay
            key={event.id}
            latitude={event.latitude}
            longitude={event.longitude}
            image={{ symbol: 'red' }}
            tintColor={SCALE_COLORS[event.scale] ?? MAP_UI.scaleBadge[4]}
            anchor={{ x: 0.5, y: 1 }}
            caption={{
              text: daysText,
              align: 'Center',
              color: '#FFFFFF',
              haloColor: '#000000',
              textSize: 12,
            }}
            subCaption={event.title ? { text: event.title, textSize: 10 } : undefined}
            onTap={() => onMarkerPress(event)}
            globalZIndex={200001}
          />
        );
      })}
      {selectedEvent != null &&
        Number.isFinite(selectedEvent.latitude) &&
        Number.isFinite(selectedEvent.longitude) &&
        (selectedEvent.latitude !== 0 || selectedEvent.longitude !== 0) && (
          <NaverMapCircleOverlay
            key={`event-zone-${selectedEvent.id}`}
            latitude={selectedEvent.latitude}
            longitude={selectedEvent.longitude}
            radius={EVENT_ZONE_RADIUS_M}
            color={EVENT_ZONE_COLOR}
            outlineWidth={EVENT_ZONE_OUTLINE_WIDTH}
            outlineColor={EVENT_ZONE_OUTLINE_COLOR}
            zIndex={5}
            globalZIndex={150000}
          />
        )}
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
      {distanceFilterRadiusM != null &&
        distanceFilterRadiusM > 0 &&
        distanceFilterCenter != null &&
        Number.isFinite(distanceFilterCenter.latitude) &&
        Number.isFinite(distanceFilterCenter.longitude) && (
          <NaverMapCircleOverlay
            key="distance-filter-circle"
            latitude={distanceFilterCenter.latitude}
            longitude={distanceFilterCenter.longitude}
            radius={distanceFilterRadiusM}
            color={DISTANCE_FILTER_CIRCLE_COLOR}
            outlineWidth={DISTANCE_FILTER_CIRCLE_OUTLINE_WIDTH}
            outlineColor={DISTANCE_FILTER_CIRCLE_OUTLINE_COLOR}
            zIndex={3}
            globalZIndex={100000}
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
