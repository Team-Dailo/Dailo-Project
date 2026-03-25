/**
 * 앱 전역·지도 탭 공통: 저장된 축제 구역 참여가 있는데 현재 위치가 구역 밖이면
 * 서버 ping 성공·세션 종료 확인 후에만 로컬을 지운다.
 */
import * as Location from 'expo-location';
import { getFestivalParticipation, clearFestivalParticipation } from './festivalParticipationStorage';
import {
  syncStayExitWithRetry,
  isStaySessionEndedAfterPing,
  enqueuePendingStaySync,
} from './staySessionSync';
import { distanceKm } from '../utils/geo';
import { getAccessToken } from './auth.service';

const ZONE_RADIUS_KM = 0.2;

export type LatLng = { latitude: number; longitude: number };

let lastReconcileAt = 0;
const DEBOUNCE_MS = 2000;

/**
 * @param preferredPosition 데모/지도가 이미 알고 있는 위치가 있으면 GPS 조회 생략
 */
export async function reconcileFestivalParticipationIfOutsideZone(
  preferredPosition?: LatLng | null
): Promise<void> {
  const now = Date.now();
  if (now - lastReconcileAt < DEBOUNCE_MS) return;
  lastReconcileAt = now;

  const entry = await getFestivalParticipation();
  if (!entry) return;

  let myPos: LatLng | null = preferredPosition ?? null;
  if (!myPos) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return;
    let loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      mayShowUserSettingsDialog: false,
    }).catch(() => null);
    if (!loc) loc = await Location.getLastKnownPositionAsync({});
    if (!loc?.coords) return;
    myPos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  }

  const elat = entry.eventLat;
  const elng = entry.eventLng;
  const hasCoords =
    elat != null && elng != null && Number.isFinite(elat) && Number.isFinite(elng);
  const km = hasCoords
    ? distanceKm(myPos.latitude, myPos.longitude, elat, elng)
    : Infinity;

  if (hasCoords && km <= ZONE_RADIUS_KM) {
    return;
  }

  const eventId = Number(entry.eventId);
  const token = await getAccessToken();
  if (!token) {
    await clearFestivalParticipation();
    return;
  }

  try {
    await syncStayExitWithRetry(eventId, myPos.latitude, myPos.longitude, 'left_zone');
    const ended = await isStaySessionEndedAfterPing(eventId);
    if (!ended) return;
    await clearFestivalParticipation();
  } catch {
    await enqueuePendingStaySync({
      eventId,
      latitude: myPos.latitude,
      longitude: myPos.longitude,
      mode: 'left_zone',
      eventTitle: entry.eventTitle ?? '',
    });
  }
}
