import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOTH_FAVORITES_KEY = "@dailo_booth_favorites";

export type BoothFavoriteItem = {
  eventId: number;
  eventTitle: string;
  boothName: string;
  boothType: "food" | "experience";
};

async function getStored(): Promise<BoothFavoriteItem[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOTH_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStored(items: BoothFavoriteItem[]) {
  await AsyncStorage.setItem(BOOTH_FAVORITES_KEY, JSON.stringify(items));
}

/**
 * 저장한 부스(즐겨찾기) 목록 조회
 */
export async function getBoothFavorites(): Promise<BoothFavoriteItem[]> {
  return getStored();
}

/**
 * 부스 즐겨찾기 추가
 */
export async function addBoothFavorite(item: BoothFavoriteItem): Promise<void> {
  const list = await getStored();
  const exists = list.some(
    (x) => x.eventId === item.eventId && x.boothName === item.boothName
  );
  if (exists) return;
  list.push(item);
  await setStored(list);
}

/**
 * 부스 즐겨찾기 제거
 */
export async function removeBoothFavorite(
  eventId: number,
  boothName: string
): Promise<void> {
  const list = await getStored();
  const next = list.filter(
    (x) => !(x.eventId === eventId && x.boothName === boothName)
  );
  await setStored(next);
}

/**
 * 해당 부스가 즐겨찾기인지 여부
 */
export async function isBoothFavorite(
  eventId: number,
  boothName: string
): Promise<boolean> {
  const list = await getStored();
  return list.some(
    (x) => x.eventId === eventId && x.boothName === boothName
  );
}

/**
 * 즐겨찾기 토글 (있으면 제거, 없으면 추가)
 * @returns true = 추가됨, false = 제거됨
 */
export async function toggleBoothFavorite(
  item: BoothFavoriteItem
): Promise<boolean> {
  const list = await getStored();
  const idx = list.findIndex(
    (x) => x.eventId === item.eventId && x.boothName === item.boothName
  );
  if (idx >= 0) {
    list.splice(idx, 1);
    await setStored(list);
    return false;
  }
  list.push(item);
  await setStored(list);
  return true;
}
