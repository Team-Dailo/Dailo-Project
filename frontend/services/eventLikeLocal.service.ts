/**
 * 행사 상세 "좋아요" - 로컬 전용 (본인 기기에서만 표시, 서버에 반영하지 않음)
 * 누르면 빨간 하트·카운트는 보이지만 다른 사용자에게는 보이지 않음.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@dailo_event_likes_local";

async function getSet(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function saveSet(set: Set<number>) {
  await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
}

/** 해당 행사를 로컬에서 좋아요 했는지 */
export async function isEventLikedLocally(eventId: number): Promise<boolean> {
  const set = await getSet();
  return set.has(eventId);
}

/** 로컬 좋아요 토글. 서버 호출 없음. 반환: 토글 후 좋아요 여부 */
export async function toggleEventLikeLocal(eventId: number): Promise<boolean> {
  const set = await getSet();
  if (set.has(eventId)) {
    set.delete(eventId);
    await saveSet(set);
    return false;
  }
  set.add(eventId);
  await saveSet(set);
  return true;
}
