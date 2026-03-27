// app/(tabs)/map/_components/NaverMap.tsx
import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapCircleOverlay,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import type { Event } from '../../../../types/event';
import { MAP_UI } from '../../../../constants/colors';

/** 마커 아이콘 이미지 (흰색 실루엣 → tintColor로 규모별 색 적용) */
const MARKER_ICON = require('../../../../assets/images/marker-pin.png');
const MARKER_WIDTH = 36;
const MARKER_HEIGHT = 48;
// 바깥 테두리/흰색 바디용 스케일 (중심 기준으로 키움)
const MARKER_BORDER_SCALE = 1.14;
const MARKER_WHITE_SCALE = 1.10;
// 그림자 영역을 위해 테두리 높이보다 조금 더 긴 컨테이너
const MARKER_SHADOW_EXTRA_HEIGHT = 6;
const MARKER_CONTAINER_WIDTH = MARKER_WIDTH * MARKER_BORDER_SCALE;
const MARKER_BORDER_HEIGHT = MARKER_HEIGHT * MARKER_BORDER_SCALE;
const MARKER_CONTAINER_HEIGHT = MARKER_BORDER_HEIGHT + MARKER_SHADOW_EXTRA_HEIGHT;
// 컨테이너 안에서 원본 마커 이미지를 "테두리 높이" 기준으로 가운데 배치
const MARKER_IMAGE_LEFT = (MARKER_CONTAINER_WIDTH - MARKER_WIDTH) / 2;
const MARKER_IMAGE_TOP = (MARKER_BORDER_HEIGHT - MARKER_HEIGHT) / 2;
// 각 레이어를 얼마나 "위로" 올릴지 (px 단위 오프셋)
const WHITE_MARKER_OFFSET_Y = 0.6;  // 가운데 흰색 마커
const COLOR_MARKER_OFFSET_Y = 1.2;  // 맨 앞 컬러 마커 + 숫자

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
  onCameraIdle?: (params: { region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }; zoom?: number }) => void;
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

// 현재 위치 점: 화면 상에서 항상 일정한 크기의 점으로 표시 (줌 레벨과 무관)
const MY_LOCATION_MARKER_SIZE = 18;
const MY_LOCATION_MARKER_COLOR = '#4285F4';
const MY_LOCATION_MARKER_OUTLINE_COLOR = '#FFFFFF';
const MY_LOCATION_MARKER_OUTLINE_WIDTH = 3;

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

/** 행사 종료일이 오늘 이전이면 true (달력에서 지난 날짜 지정 시 회색 마커용) */
function isEventEnded(endAt: string | undefined): boolean {
  if (!endAt) return false;
  const endStr = new Date(endAt).toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  return endStr < todayStr;
}

/** 종료된 행사 마커 색상 (회색) */
const ENDED_MARKER_COLOR = '#9CA3AF';
/** 종료 마커: 라벨 공간 높이 (글자 하단 잘림 방지) */
const ENDED_LABEL_HEIGHT = 26;

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
        const ended = isEventEnded(event.endAt);
        const daysLeft = getDaysUntilStart(event.startAt);
        const daysText = daysLeft > 0 ? String(daysLeft) : '0';
        const scaleColor = ended ? ENDED_MARKER_COLOR : (SCALE_COLORS[event.scale] ?? MAP_UI.scaleBadge[4]);
        const baseContainerHeight = MARKER_CONTAINER_HEIGHT;
        const markerHeight = ended ? baseContainerHeight + ENDED_LABEL_HEIGHT + 4 : baseContainerHeight;
        return (
          <NaverMapMarkerOverlay
            key={event.id}
            latitude={event.latitude}
            longitude={event.longitude}
            width={MARKER_CONTAINER_WIDTH}
            height={markerHeight}
            anchor={{ x: 0.5, y: 1 }}
            onTap={() => onMarkerPress(event)}
            globalZIndex={200001}
          >
            <View
              key={`${event.id}-${ended}-${daysText}-${scaleColor}`}
              collapsable={false}
              style={[styles.markerWithNumber, ended && styles.markerWithNumberEnded]}
            >
              {ended ? (
                <>
                  <View style={styles.markerBaseShadow} />
                  <View style={styles.endedLabelWrap}>
                    <Text style={styles.endedLabel} numberOfLines={1}>종료</Text>
                  </View>
                  <Image
                    source={MARKER_ICON}
                    style={styles.markerPinImageBorder}
                    resizeMode="contain"
                  />
                  <Image
                    source={MARKER_ICON}
                    style={styles.markerPinImageWhite}
                    resizeMode="contain"
                  />
                  <Image
                    source={MARKER_ICON}
                    style={[styles.markerPinImageEnded, { tintColor: scaleColor }]}
                    resizeMode="contain"
                  />
                </>
              ) : (
                <>
                  <View style={styles.markerBaseShadow} />
                  <Image
                    source={MARKER_ICON}
                    style={styles.markerPinImageBorder}
                    resizeMode="contain"
                  />
                  <Image
                    source={MARKER_ICON}
                    style={styles.markerPinImageWhite}
                    resizeMode="contain"
                  />
                  <Image
                    source={MARKER_ICON}
                    style={[styles.markerPinImage, { tintColor: scaleColor }]}
                    resizeMode="contain"
                  />
                  <View style={styles.markerNumberWrap}>
                    <Text style={styles.markerNumberText}>{daysText}</Text>
                  </View>
                </>
              )}
            </View>
          </NaverMapMarkerOverlay>
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
          <NaverMapMarkerOverlay
            key="my-location-marker"
            latitude={myLocationCoords.latitude}
            longitude={myLocationCoords.longitude}
            width={MY_LOCATION_MARKER_SIZE}
            height={MY_LOCATION_MARKER_SIZE}
            anchor={{ x: 0.5, y: 0.5 }}
            globalZIndex={300000}
          >
            <View
              style={{
                width: MY_LOCATION_MARKER_SIZE,
                height: MY_LOCATION_MARKER_SIZE,
                borderRadius: MY_LOCATION_MARKER_SIZE / 2,
                backgroundColor: MY_LOCATION_MARKER_COLOR,
                borderWidth: MY_LOCATION_MARKER_OUTLINE_WIDTH,
                borderColor: MY_LOCATION_MARKER_OUTLINE_COLOR,
              }}
            />
          </NaverMapMarkerOverlay>
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
  markerWithNumber: {
    width: MARKER_CONTAINER_WIDTH,
    minHeight: MARKER_CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  markerWithNumberEnded: {
    minHeight: MARKER_CONTAINER_HEIGHT + ENDED_LABEL_HEIGHT + 4,
    height: MARKER_CONTAINER_HEIGHT + ENDED_LABEL_HEIGHT + 4,
    justifyContent: 'flex-end',
  },
  endedLabelWrap: {
    minHeight: ENDED_LABEL_HEIGHT,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  endedLabel: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6B7280',
    fontWeight: '600',
    includeFontPadding: false,
  },
  markerPinImageBorder: {
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    position: 'absolute',
    left: MARKER_IMAGE_LEFT,
    top: MARKER_IMAGE_TOP,
    tintColor: '#D1D5DB', // 조금 더 진한 회색 외곽
    transform: [{ scale: MARKER_BORDER_SCALE }],
  },
  markerPinImageWhite: {
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    position: 'absolute',
    left: MARKER_IMAGE_LEFT,
    top: MARKER_IMAGE_TOP - WHITE_MARKER_OFFSET_Y,
    tintColor: '#FFFFFF', // 안쪽 흰색
    transform: [{ scale: MARKER_WHITE_SCALE }],
  },
  markerPinImage: {
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
    position: 'absolute',
    left: MARKER_IMAGE_LEFT,
    top: MARKER_IMAGE_TOP - COLOR_MARKER_OFFSET_Y,
  },
  markerPinImageEnded: {
    position: 'absolute',
    left: MARKER_IMAGE_LEFT,
    top: MARKER_IMAGE_TOP - COLOR_MARKER_OFFSET_Y,
    width: MARKER_WIDTH,
    height: MARKER_HEIGHT,
  },
  markerNumberWrap: {
    position: 'absolute',
    left: MARKER_IMAGE_LEFT,
    top: MARKER_IMAGE_TOP - COLOR_MARKER_OFFSET_Y,
    width: MARKER_WIDTH,
    height: MARKER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerNumberText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  markerBaseShadow: {
    position: 'absolute',
    bottom: 4.5,
    left: MARKER_CONTAINER_WIDTH / 2 - 4,
    width: 8,
    height: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(86, 93, 108, 0.22)',
  },
});
