// app/(tabs)/map/_components/NaverMap.tsx
import React, { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
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
};

export const NaverMap = forwardRef<NaverMapViewRef, Props>(function NaverMap(
  { style, camera, events, onMarkerPress },
  ref
) {
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
