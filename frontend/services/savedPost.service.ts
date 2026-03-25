/**
 * 게시글 저장(북마크) - 로컬 AsyncStorage
 * 마이페이지 "저장한 게시글" 목록용
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_POSTS_KEY = "dailo_saved_posts";

export type SavedPostSummary = {
  id: number;
  title: string;
  createdAt?: string;
  /** 목록 썸네일 URL (선택) */
  imageUrl?: string;
};

async function getStored(): Promise<SavedPostSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPostSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setStored(list: SavedPostSummary[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(list));
}

/** 저장한 게시글 요약 목록 (마이페이지 목록 표시용) */
export async function getSavedPostSummaries(): Promise<SavedPostSummary[]> {
  return getStored();
}

/** 저장한 게시글 ID 목록 */
export async function getSavedPostIds(): Promise<number[]> {
  const list = await getStored();
  return list.map((p) => p.id);
}

/** 해당 게시글 저장 여부 */
export async function isSavedPost(postId: number): Promise<boolean> {
  const ids = await getSavedPostIds();
  return ids.includes(postId);
}

/** 게시글 저장/해제 토글. 반환: true=저장됨, false=해제됨 */
export async function toggleSavedPost(
  postId: number,
  title: string,
  createdAt?: string,
  imageUrl?: string
): Promise<boolean> {
  const list = await getStored();
  const idx = list.findIndex((p) => p.id === postId);
  if (idx >= 0) {
    list.splice(idx, 1);
    await setStored(list);
    return false;
  }
  list.unshift({
    id: postId,
    title: title || `게시글 #${postId}`,
    createdAt,
    imageUrl,
  });
  await setStored(list);
  return true;
}

/** 이미 저장된 게시글의 썸네일 URL을 갱신 (백필용) */
export async function updateSavedPostThumbnail(
  postId: number,
  imageUrl: string
): Promise<void> {
  const list = await getStored();
  const idx = list.findIndex((p) => p.id === postId);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    imageUrl,
  };
  await setStored(list);
}
