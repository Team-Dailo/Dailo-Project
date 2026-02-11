/**
 * 지도 위치 선택 화면에서 "확인" 시 저장.
 * 행사 등록/수정 화면에서 useFocusEffect로 읽고 적용 후 clear.
 */
let picked: { latitude: number; longitude: number } | null = null;

export function setPickedLocation(lat: number, lng: number) {
  picked = { latitude: lat, longitude: lng };
}

export function getPickedLocation(): { latitude: number; longitude: number } | null {
  return picked;
}

export function clearPickedLocation() {
  picked = null;
}
