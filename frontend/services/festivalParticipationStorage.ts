import AsyncStorage from '@react-native-async-storage/async-storage';

const FESTIVAL_PARTICIPATION_KEY = '@dailo/festival_participation';

export type FestivalParticipation = {
  enteredAt: number;
  eventId: string;
  eventTitle: string;
  /** 참여 중인 행사 좌표 (이탈 판정용, 없으면 구버전 데이터) */
  eventLat?: number | null;
  eventLng?: number | null;
};

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
  eventLng?: number | null
): Promise<void> {
  await AsyncStorage.setItem(
    FESTIVAL_PARTICIPATION_KEY,
    JSON.stringify({
      enteredAt,
      eventId,
      eventTitle,
      eventLat: eventLat ?? null,
      eventLng: eventLng ?? null,
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
