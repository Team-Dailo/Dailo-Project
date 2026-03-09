// frontend/hooks/useMap.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import type { Region } from 'react-native-maps';
import type { Event } from '../types/event';
import { getEventsOnMap } from '../services/event.service';

/** 실기기: 4초면 충분. 에뮬레이터: Set location 반영이 느려서 10초까지 대기 */
const LOCATION_REQUEST_TIMEOUT_MS = 10000;
/** 지도 영역 변경 시 API 재요청 디바운스(ms) */
const MAP_FETCH_DEBOUNCE_MS = 600;
/** 확대해도 마커가 사라지지 않도록 요청 bounds 최소 크기(degree). 이보다 작게 요청하면 결과가 없을 수 있음 */
const MIN_LAT_DELTA = 0.008;
const MIN_LNG_DELTA = 0.01;

export function useMap() {
  const [region, setRegion] = useState<Region | undefined>();
  const [currentLocation, setCurrentLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEventsInBounds = useCallback((r: Region) => {
    const latDelta = Math.max(r.latitudeDelta, MIN_LAT_DELTA);
    const lngDelta = Math.max(r.longitudeDelta, MIN_LNG_DELTA);
    const swLat = r.latitude - latDelta / 2;
    const neLat = r.latitude + latDelta / 2;
    const swLng = r.longitude - lngDelta / 2;
    const neLng = r.longitude + lngDelta / 2;
    setEventsLoading(true);
    getEventsOnMap({ swLat, neLat, swLng, neLng })
      .then(setEvents)
      .catch((err) => {
        if (__DEV__) console.warn('[useMap] getEventsOnMap failed', err);
        setEvents([]);
      })
      .finally(() => setEventsLoading(false));
  }, []);

  const defaultRegion: Region = {
    latitude: 36.991,
    longitude: 127.926,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        setRegion(defaultRegion);
        return;
      }

      // 에뮬: Set location은 getCurrentPosition 요청에 반영되는 경우가 많음. 먼저 현재 위치 요청.
      let loc: Location.LocationObject | null = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            mayShowUserSettingsDialog: false,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOCATION_REQUEST_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // 타임아웃/실패 시 캐시 시도
      }
      if (!loc) loc = await Location.getLastKnownPositionAsync({});
      if (loc?.coords) {
        setCurrentLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
      setRegion(defaultRegion);
    })();
  }, []);

  useEffect(() => {
    if (!region) return;
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => {
      fetchEventsInBounds(region);
      fetchTimeoutRef.current = null;
    }, MAP_FETCH_DEBOUNCE_MS);
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta, fetchEventsInBounds]);

  const handleMarkerPress = (event: Event) => {
    setSelectedEvent(event);
    setBottomSheetOpen(true);
  };

  const closeBottomSheet = () => {
    setBottomSheetOpen(false);
    setSelectedEvent(null);
  };

  const focusCurrentLocation = () => {
    if (!currentLocation) return;

    setRegion(prev => ({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: prev?.latitudeDelta ?? 0.01,
      longitudeDelta: prev?.longitudeDelta ?? 0.01,
    }));
  };

  /** 현재 위치를 다시 가져옴. 에뮬레이터에서는 캐시된 위치(getLastKnown)를 먼저 시도. */
  const refreshCurrentLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return null;
    try {
      // 에뮬: Extended controls에서 지정한 위치는 getCurrentPosition 응답으로 올 수 있음. 먼저 요청.
      let loc: Location.LocationObject | null = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            mayShowUserSettingsDialog: false,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOCATION_REQUEST_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // 타임아웃 시 캐시 시도
      }
      if (!loc) loc = await Location.getLastKnownPositionAsync({});
      if (!loc?.coords) return null;
      const { latitude, longitude } = loc.coords;
      setCurrentLocation({ latitude, longitude });
      setRegion(prev => ({
        latitude,
        longitude,
        latitudeDelta: prev?.latitudeDelta ?? 0.01,
        longitudeDelta: prev?.longitudeDelta ?? 0.01,
      }));
      return { latitude, longitude };
    } catch {
      return null;
    }
  };

  const refetchMapEvents = useCallback(() => {
    if (region) fetchEventsInBounds(region);
  }, [region, fetchEventsInBounds]);

  /** 지도 드래그/줌 후 화면 영역으로만 행사 조회. setRegion 하지 않아서 지도가 튀지 않음 */
  const refetchWithBounds = useCallback(
    (centerLat: number, centerLng: number, latDelta: number, lngDelta: number) => {
      const r: Region = {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
      fetchEventsInBounds(r);
    },
    [fetchEventsInBounds]
  );

  return {
    region,
    setRegion,
    currentLocation,
    events,
    eventsLoading,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
    refreshCurrentLocation,
    refetchMapEvents,
    refetchWithBounds,
  };
}
