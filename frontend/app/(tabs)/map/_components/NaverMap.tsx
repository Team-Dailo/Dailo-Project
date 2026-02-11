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
  { style, camera, events, onMarkerPress, currentLocation, circleCoords, showMyLocationCircle },
  ref
) {
  const myLocationCoords = circleCoords ?? currentLocation ?? null;
  const effectiveCamera = useMemo(
    () => ({
      latitude: camera?.latitude ?? DEFAULT_CAMERA.latitude,
      longitude: camera?.longitude ?? DEFAULT_CAMERA.longitude,
      zoom: camera?.zoom ?? DEFAULT_CAMERA.zoom,
    }),
    [camera?.latitude, camera?.longitude, camera?.zoom]
  );

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
    >
      {eventsWithCoords.map((event) => (
        <NaverMapMarkerOverlay
          key={event.id}
          latitude={event.latitude}
          longitude={event.longitude}
          image={{ symbol: 'green' }}
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
