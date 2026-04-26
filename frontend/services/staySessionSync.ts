/**
 * 체류 종료(ping/complete)를 서버와 맞춘 뒤에만 로컬 상태를 지우기 위한 재시도·대기 큐.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  pingStay,
  completeStay,
  getActiveStaySession,
} from './location.service';
import {
  getFestivalParticipation,
  clearFestivalParticipation,
  saveAccumulatedSeconds,
} from './festivalParticipationStorage';

const PENDING_QUEUE_KEY = '@dailo/pending_stay_sync_queue';

export type StayExitMode = 'left_zone' | 'schedule_ended';

export type PendingStaySyncItem = {
  id: string;
  eventId: number;
  latitude: number;
  longitude: number;
  mode: StayExitMode;
  eventTitle: string;
  createdAt: number;
};

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** ping 또는 complete를 지수 백오프로 재시도 */
export async function syncStayExitWithRetry(
  eventId: number,
  latitude: number,
  longitude: number,
  mode: StayExitMode
): Promise<void> {
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (mode === 'left_zone') {
        await pingStay(eventId, latitude, longitude);
      } else {
        await completeStay(eventId, latitude, longitude);
      }
      return;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_ATTEMPTS) {
        await sleep(Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 8000));
      }
    }
  }
  throw lastErr ?? new Error('체류 종료 동기화 실패');
}

/**
 * left_zone: ping 후 PENDING 세션이 없어졌는지 확인(반경 안이면 세션 유지 → 로컬도 유지해야 함)
 */
export async function isStaySessionEndedAfterPing(eventId: number): Promise<boolean> {
  const active = await getActiveStaySession(eventId).catch(() => null);
  return !active;
}

async function readQueue(): Promise<PendingStaySyncItem[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingStaySyncItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingStaySyncItem[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(items));
}

export async function enqueuePendingStaySync(item: {
  eventId: number;
  latitude: number;
  longitude: number;
  mode: StayExitMode;
  eventTitle: string;
}): Promise<void> {
  const list = await readQueue();
  const row: PendingStaySyncItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    ...item,
  };
  list.push(row);
  await writeQueue(list);
}

export async function flushPendingStaySyncQueue(): Promise<void> {
  const list = await readQueue();
  if (list.length === 0) return;

  const remaining: PendingStaySyncItem[] = [];

  for (const item of list) {
    try {
      await syncStayExitWithRetry(item.eventId, item.latitude, item.longitude, item.mode);
      if (item.mode === 'left_zone') {
        const ended = await isStaySessionEndedAfterPing(item.eventId);
        if (!ended) {
          remaining.push(item);
          continue;
        }
      }
      const entry = await getFestivalParticipation();
      if (entry && String(entry.eventId) === String(item.eventId)) {
        const elapsed = Math.floor((Date.now() - entry.enteredAt) / 1000);
        await saveAccumulatedSeconds(String(entry.eventId), (entry.accumulatedSeconds ?? 0) + elapsed);
        await clearFestivalParticipation();
      }
    } catch {
      if (Date.now() - item.createdAt < 1000 * 60 * 60 * 24) {
        remaining.push(item);
      }
    }
  }

  await writeQueue(remaining);
}
