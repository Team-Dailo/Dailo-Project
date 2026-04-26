import AsyncStorage from '@react-native-async-storage/async-storage';

const FESTIVAL_PARTICIPATION_KEY = '@dailo/festival_participation';
/** 행사별로 "오늘 로컬일 기준 30분 참여 완료" 표시용 (구역 이탈 후 재진입 시 칩·메뉴 유지) */
const FESTIVAL_PARTICIPATION_COMPLETED_DAY_KEY = '@dailo/festival_participation_completed_day';
/** 행사별로 당일 누적 체류 초 저장 (구역 이탈 후 재진입 시 이어서 카운트) */
const FESTIVAL_ACCUMULATED_SECONDS_KEY = '@dailo/festival_accumulated_seconds';

export type FestivalParticipation = {
  enteredAt: number;
  eventId: string;
  eventTitle: string;
  /** 참여 중인 행사 좌표 (이탈 판정용, 없으면 구버전 데이터) */
  eventLat?: number | null;
  eventLng?: number | null;
  /** 이전 세션에서 누적된 초 (구역 이탈 후 재진입 시 이어서 카운트) */
  accumulatedSeconds?: number;
  /**
   * AsyncStorage에는 저장하지 않음. 훅에서만 병합:
   * 오늘 해당 행사에서 이미 30분 참여 완료(또는 완료 플래그 조회) 시 true.
   */
  participationCompletedToday?: boolean;
};

function localDayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 오늘(로컬) 해당 행사에서 30분 참여 완료로 기록된 경우 */
export async function hasParticipationCompletedToday(eventId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FESTIVAL_PARTICIPATION_COMPLETED_DAY_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[String(eventId)] === localDayKey();
  } catch {
    return false;
  }
}

/** 30분 달성 시 호출 — 구역을 나갔다 들어와도 오늘 한도 내 참여완료 표시에 사용 */
export async function markParticipationCompletedToday(eventId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FESTIVAL_PARTICIPATION_COMPLETED_DAY_KEY);
    const map: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[String(eventId)] = localDayKey();
    await AsyncStorage.setItem(FESTIVAL_PARTICIPATION_COMPLETED_DAY_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** 당일 누적 체류 초를 저장 (이탈 시점에 호출) */
export async function saveAccumulatedSeconds(eventId: string, seconds: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(FESTIVAL_ACCUMULATED_SECONDS_KEY);
    const map: Record<string, { seconds: number; day: string }> = raw ? JSON.parse(raw) : {};
    const key = String(eventId);
    const existing = map[key];
    // 이미 오늘 저장된 값이 있으면 누적, 다른 날이면 오늘 값으로 교체
    if (existing && existing.day === localDayKey()) {
      map[key] = { seconds: existing.seconds + seconds, day: localDayKey() };
    } else {
      map[key] = { seconds, day: localDayKey() };
    }
    await AsyncStorage.setItem(FESTIVAL_ACCUMULATED_SECONDS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** 당일 누적 체류 초를 조회 (재진입 시 호출). 당일 데이터 없으면 0 반환 */
export async function getAccumulatedSeconds(eventId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FESTIVAL_ACCUMULATED_SECONDS_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, { seconds: number; day: string }>;
    const entry = map[String(eventId)];
    if (!entry || entry.day !== localDayKey()) return 0;
    return entry.seconds;
  } catch {
    return 0;
  }
}

export async function getFestivalParticipation(): Promise<FestivalParticipation | null> {
  try {
    const raw = await AsyncStorage.getItem(FESTIVAL_PARTICIPATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FestivalParticipation;
    if (
      parsed &&
      typeof parsed.enteredAt === 'number' &&
      parsed.eventId != null &&
      parsed.eventTitle != null
    ) {
      return {
        ...parsed,
        eventLat: parsed.eventLat ?? null,
        eventLng: parsed.eventLng ?? null,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setFestivalParticipation(
  enteredAt: number,
  eventId: string,
  eventTitle: string,
  eventLat?: number | null,
  eventLng?: number | null,
  accumulatedSeconds?: number
): Promise<void> {
  await AsyncStorage.setItem(
    FESTIVAL_PARTICIPATION_KEY,
    JSON.stringify({
      enteredAt,
      eventId,
      eventTitle,
      eventLat: eventLat ?? null,
      eventLng: eventLng ?? null,
      accumulatedSeconds: accumulatedSeconds ?? 0,
    })
  );
}

export async function clearFestivalParticipation(): Promise<void> {
  await AsyncStorage.removeItem(FESTIVAL_PARTICIPATION_KEY);
}

/** 초 단위를 HH:MM:SS 문자열로 */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
