/**
 * 주소 → 위도/경도 변환 (Nominatim / OpenStreetMap)
 * 사용 정책: https://operations.osmfoundation.org/policies/nominatim/
 * 한국 주소 인식 개선: countrycodes=kr, 대한민국 접두사 시도
 */

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName?: string;
};

function buildSearchUrl(q: string, countryBias: boolean): string {
  const base = 'https://nominatim.openstreetmap.org/search';
  const params = new URLSearchParams({
    q: countryBias ? `대한민국 ${q}` : q,
    format: 'json',
    limit: '3',
    addressdetails: '1',
  });
  if (countryBias) {
    params.set('countrycodes', 'kr');
  }
  return `${base}?${params.toString()}`;
}

/**
 * 주소 문자열로 검색하여 첫 번째 결과의 위도·경도 반환
 * 한국 주소: 대한민국 + countrycodes=kr 로 먼저 시도 후, 실패 시 전역 검색
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  const headers: HeadersInit = {
    'Accept-Language': 'ko',
    'User-Agent': 'DailoApp/1.0 (Event Location Picker)',
  };

  // 1) 한국으로 한정 검색 (대한민국 접두사 + countrycodes=kr)
  let url = buildSearchUrl(q, true);
  let res = await fetch(url, { headers });
  if (!res.ok) return null;
  let data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon, displayName: first.display_name };
    }
  }

  // 2) 전역 검색 (한국어 주소만 있는 경우 등)
  url = buildSearchUrl(q, false);
  res = await fetch(url, { headers });
  if (!res.ok) return null;
  data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const first = data[0];
  const lat = parseFloat(first.lat);
  const lon = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    latitude: lat,
    longitude: lon,
    displayName: first.display_name,
  };
}

/**
 * 위도·경도 → 주소 문자열 (역지오코딩, Nominatim)
 * 지역부터 나오도록 조합: 도 → 시/군 → 면/동 → 도로명 등 (예: 충청북도 충주시 소원면 호반로 123)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '1',
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
  const headers: HeadersInit = {
    'Accept-Language': 'ko',
    'User-Agent': 'DailoApp/1.0 (Event Location Picker)',
  };

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data?.address;
  if (!addr || typeof addr !== 'object') {
    const fallback = data?.display_name ?? null;
    return typeof fallback === 'string' ? fallback : null;
  }

  const parts: string[] = [];
  const push = (v: unknown) => {
    if (v != null && String(v).trim()) parts.push(String(v).trim());
  };
  push(addr.state);           // 도 (예: 충청북도)
  push(addr.county);         // 시/군 (예: 충주시)
  push(addr.city);           // 시 (일부 지역)
  push(addr.district);       // 구 (예: 중구)
  push(addr.town);           // 면 (예: 소원면)
  push(addr.village);        // 리/동
  push(addr.suburb);         // 동/읍
  push(addr.neighbourhood);  // 동
  push(addr.road);           // 도로명
  push(addr.house_number);   // 번지

  if (parts.length === 0) {
    const fallback = data?.display_name ?? null;
    return typeof fallback === 'string' ? fallback : null;
  }
  return parts.join(' ');
}
