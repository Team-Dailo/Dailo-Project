// frontend/hooks/useMap.ts
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Region } from 'react-native-maps';
import { MOCK_EVENTS } from '../constants/mockEvents';
import type { Event } from '../types/event';
// 백엔드 연동 시: import { getEventsForMap } from '../services/event.service';

export function useMap() {
  const [region, setRegion] = useState<Region | undefined>();
  const [currentLocation, setCurrentLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [events] = useState<Event[]>(MOCK_EVENTS);
  // 백엔드 연동 시: useEffect에서 getEventsForMap({ size: 100 }).then(setEvents) 로 events 갱신
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isBottomSheetOpen, setBottomSheetOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        // 권한 거부 시 위치 안 쓰고 그냥 기본 region 유지
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      setCurrentLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const handleMarkerPress = (event: Event) => {
    setSelectedEvent(event);
    setBottomSheetOpen(true);
  };

  const closeBottomSheet = () => setBottomSheetOpen(false);

  const focusCurrentLocation = () => {
    if (!currentLocation) return;

    setRegion(prev => ({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: prev?.latitudeDelta ?? 0.01,
      longitudeDelta: prev?.longitudeDelta ?? 0.01,
    }));
  };

  return {
    region,
    currentLocation,
    events,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
  };
}
