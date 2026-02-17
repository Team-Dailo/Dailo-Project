/**
 * 지역명 → 지도 중심 좌표 (지도 탭 + 홈 알림 등)
 */
import { distanceKm } from "./geo";

export const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  충주: { latitude: 36.991, longitude: 127.926 },
  충주시: { latitude: 36.991, longitude: 127.926 },
  충북: { latitude: 36.636, longitude: 127.491 },
  충청북도: { latitude: 36.636, longitude: 127.491 },
  서울: { latitude: 37.5665, longitude: 126.978 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  한국: { latitude: 36.3504, longitude: 127.3845 },
};

/** 현재 위치(lat,lng)에서 가장 가까운 지역 키 반환 (한국 제외). 없으면 null */
export function getCurrentRegionKey(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let minKey: string | null = null;
  let minKm = Infinity;
  for (const [key, pos] of Object.entries(REGION_CENTERS)) {
    if (key === "한국") continue;
    const km = distanceKm(lat, lng, pos.latitude, pos.longitude);
    if (km < minKm) {
      minKm = km;
      minKey = key;
    }
  }
  return minKey;
}

/** 지역 bounds 델타 (본인 지역 행사 조회용) */
export const REGION_BOUNDS_DELTA = 0.45;
