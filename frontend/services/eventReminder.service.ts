/**
 * 행사 알림: 3일 전, 1일 전 로컬 알림 스케줄 + 본인 지역 행사 1일 전 알림
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getCurrentRegionKey, REGION_CENTERS, REGION_BOUNDS_DELTA } from "../utils/region";
import { getEventsOnMap } from "./event.service";

const CHANNEL_ID = "event-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "행사 알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * 행사 시작일(ISO)과 제목으로 3일 전 / 1일 전 알림 스케줄
 * 알림 시간: 해당일 오전 9시
 */
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startAtIso: string,
  daysBefore: 1 | 3
): Promise<string | null> {
  const granted = await requestPermission();
  if (!granted) return null;
  await ensureChannel();

  let triggerDate: Date;
  try {
    const start = new Date(startAtIso);
    triggerDate = new Date(start);
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    triggerDate.setHours(9, 0, 0, 0);
    if (triggerDate.getTime() <= Date.now()) return null;
  } catch {
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "행사 알림",
      body: daysBefore === 3
        ? `3일 후, "${eventTitle}" 행사가 있습니다.`
        : `내일, "${eventTitle}" 행사가 있습니다.`,
      data: { eventId, daysBefore },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: CHANNEL_ID,
    },
  });
  return identifier;
}

/**
 * 이미 예약된 해당 행사 알림 취소 (선택)
 */
export async function cancelEventReminders(eventId: string): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of pending) {
    const data = n.content.data as { eventId?: string } | undefined;
    if (data?.eventId === eventId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * 예약된 행사 알림에 해당하는 이벤트 ID 목록 (중복 제거)
 * 마이페이지 "알림 예약한 행사" 목록용
 */
export async function getScheduledEventIds(): Promise<string[]> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const ids = new Set<string>();
  for (const n of pending) {
    const data = n.content.data as { eventId?: string } | undefined;
    if (data?.eventId && typeof data.eventId === "string") {
      ids.add(data.eventId);
    }
  }
  return Array.from(ids);
}

export type ScheduleRegionRemindersResult =
  | { ok: true; regionName: string; count: number }
  | { ok: false; message: string };

/**
 * 본인 지역에서 열리는 행사 1일 전 알림 예약 (홈 탭 알림 아이콘용)
 * - 현재 위치(또는 시범 위치)로 지역 판별 → 해당 지역 행사 조회 → 1일 전 알림 스케줄
 */
export async function scheduleRegionEventReminders(
  latitude: number,
  longitude: number
): Promise<ScheduleRegionRemindersResult> {
  const regionKey = getCurrentRegionKey(latitude, longitude);
  if (!regionKey) {
    return { ok: false, message: "위치를 확인할 수 없어요. 지도에서 현재 위치를 설정해 주세요." };
  }

  const granted = await requestPermission();
  if (!granted) {
    return { ok: false, message: "알림 권한을 허용해 주세요." };
  }
  await ensureChannel();

  const center = REGION_CENTERS[regionKey];
  if (!center) return { ok: false, message: "지역 정보를 불러올 수 없어요." };

  const d = REGION_BOUNDS_DELTA / 2;
  let events;
  try {
    events = await getEventsOnMap({
      swLat: center.latitude - d,
      neLat: center.latitude + d,
      swLng: center.longitude - d,
      neLng: center.longitude + d,
    });
  } catch {
    return { ok: false, message: "행사 목록을 불러오지 못했어요." };
  }

  const now = Date.now();
  const inRegion = events.filter((e) => {
    const r = e.regionName?.trim();
    if (!r) return false;
    const match = r === regionKey || r.includes(regionKey);
    if (!match) return false;
    try {
      const start = new Date(e.startAt).getTime();
      return start > now;
    } catch {
      return false;
    }
  });

  let scheduled = 0;
  for (const ev of inRegion) {
    await cancelEventReminders(ev.id);
    const id = await scheduleEventReminder(ev.id, ev.title, ev.startAt, 1);
    if (id) scheduled++;
  }

  const regionLabel = regionKey === "충청북도" ? "충청북도" : regionKey;
  return {
    ok: true,
    regionName: regionLabel,
    count: scheduled,
  };
}
