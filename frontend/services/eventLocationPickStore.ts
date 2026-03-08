/**
 * 지도 위치 선택 화면에서 "확인" 시 저장.
 * 행사 등록/수정 화면에서 useFocusEffect로 읽고 적용 후 clear.
 * forBoothId + forBoothType 이 있으면 부스 위치로 적용.
 * forArea 이 있으면 푸드트럭/체험부스 영역 위치로 적용.
 */
export type PickedLocation = {
  latitude: number;
  longitude: number;
  forBoothId?: string;
  forBoothType?: "food" | "experience";
  /** 푸드트럭 영역 | 체험부스 영역 (위치 보기 지도용) */
  forArea?: "food" | "experience";
};

let picked: PickedLocation | null = null;

export function setPickedLocation(
  lat: number,
  lng: number,
  forBoothId?: string,
  forBoothType?: "food" | "experience",
  forArea?: "food" | "experience"
) {
  picked = { latitude: lat, longitude: lng, forBoothId, forBoothType, forArea };
}

export function getPickedLocation(): PickedLocation | null {
  return picked;
}

export function clearPickedLocation() {
  picked = null;
}
