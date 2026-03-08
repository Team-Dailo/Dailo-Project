/**
 * 게시판 행사 선택용 지역 (현재 위치 → 도시 기본값)
 */

const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
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
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** 현재 위치(lat,lng)에서 가장 가까운 지역명. 없으면 null */
export function getCurrentRegionKey(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let minKey: string | null = null;
  let minKm = Infinity;
  for (const [key, pos] of Object.entries(REGION_CENTERS)) {
    const km = distanceKm(lat, lng, pos.latitude, pos.longitude);
    if (km < minKm) {
      minKm = km;
      minKey = key;
    }
  }
  return minKey;
}

/** 지역 선택 옵션: 전체 + 도시 목록 (API region 파라미터용) */
export const EVENT_PICKER_REGION_OPTIONS = [
  '전체',
  '충주',
  '충주시',
  '충북',
  '충청북도',
  '서울',
  '대전',
  '대구',
  '부산',
  '인천',
  '광주',
];
