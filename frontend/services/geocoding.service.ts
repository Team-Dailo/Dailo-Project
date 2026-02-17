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
