// frontend/hooks/useMap.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import type { Region } from 'react-native-maps';
import type { Event } from '../types/event';
import { getEventsOnMap } from '../services/event.service';

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
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationStartingRef = useRef(false);

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

  const startLocationWatch = useCallback(async () => {
    // 이미 구독 중이거나 시작 중이면 중복 생성 방지 (async 레이스 컨디션)
    if (locationSubscriptionRef.current || locationStartingRef.current) return;
    locationStartingRef.current = true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return;

      // 초기값: 캐시된 위치로 빠르게 표시
      const cached = await Location.getLastKnownPositionAsync({});
      if (cached?.coords) {
        setCurrentLocation({ latitude: cached.coords.latitude, longitude: cached.coords.longitude });
      }

      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentLocation({ latitude, longitude });
        }
      );
    } finally {
      locationStartingRef.current = false;
    }
  }, []);

  const stopLocationWatch = useCallback(() => {
    locationSubscriptionRef.current?.remove();
    locationSubscriptionRef.current = null;
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setRegion(defaultRegion);
        return;
      }
      setRegion(defaultRegion);
      await startLocationWatch();
    })();

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          startLocationWatch();
        } else if (nextState === 'background' || nextState === 'inactive') {
          stopLocationWatch();
        }
      }
    );

    return () => {
      stopLocationWatch();
      appStateSub.remove();
    };
  }, [startLocationWatch, stopLocationWatch]);

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

  /** 현재 위치 버튼 또는 구역 판정 시 호출.
   *  watch가 살아있으면 최신 currentLocation을 그대로 사용.
   *  없으면 GPS 직접 조회(구역 판정 정확도 유지). */
  const refreshCurrentLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return null;
    try {
      let loc: Location.LocationObject | null = null;
      try {
        loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: false,
          }),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 8000)
          ),
        ]);
      } catch {
        // 타임아웃 시 캐시 사용
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
