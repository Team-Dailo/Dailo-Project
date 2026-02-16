/**
 * 행사 알림: 원하는 N일 전 로컬 알림 스케줄 (기본 1일 전) + 본인 지역 행사 1일 전 알림
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

export type ReminderOrigin = "booked" | "region";

/** 알림 문구: N일 전 (1=내일, 그 외 N일 후) */
function reminderBodyText(daysBefore: number, eventTitle: string): string {
  if (daysBefore <= 1) return `내일, "${eventTitle}" 행사가 있습니다.`;
  return `${daysBefore}일 후, "${eventTitle}" 행사가 있습니다.`;
}

/**
 * 행사 시작일(ISO)과 제목으로 N일 전 알림 스케줄 (기본 1일 전)
 * 알림 시간: 해당일 오전 9시
 * origin: 'booked' = 행사 상세에서 예약, 'region' = 지역 행사 알림
 * daysBefore: 1~30 (기본 1)
 */
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startAtIso: string,
  daysBefore: number = 1,
  origin: ReminderOrigin = "booked"
): Promise<string | null> {
  const days = Math.max(1, Math.min(30, Math.floor(daysBefore)) || 1);
  const granted = await requestPermission();
  if (!granted) return null;
  await ensureChannel();

  let triggerDate: Date;
  try {
    const start = new Date(startAtIso);
    triggerDate = new Date(start);
    triggerDate.setDate(triggerDate.getDate() - days);
    triggerDate.setHours(9, 0, 0, 0);
    if (triggerDate.getTime() <= Date.now()) return null;
  } catch {
    return null;
  }

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "행사 알림",
      body: reminderBodyText(days, eventTitle),
      data: { eventId, daysBefore: days, origin },
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
 * 이미 예약된 해당 행사 알림 전부 취소 (예약한 행사 목록에서 알림 취소 시)
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
 * 해당 행사의 특정 출처(region/booked) 알림만 취소 (지역 재스케줄 시 region만 제거)
 */
export async function cancelEventRemindersForOrigin(eventId: string, origin: ReminderOrigin): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of pending) {
    const data = n.content.data as { eventId?: string; origin?: ReminderOrigin } | undefined;
    if (data?.eventId === eventId && data?.origin === origin) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/**
 * 예약된 행사 알림에 해당하는 이벤트 ID 목록 (중복 제거)
 * origin 지정 시 해당 출처만, 미지정 시 전체
 * 마이페이지 "알림 예약한 행사" 목록용 → getScheduledEventIds('booked')
 */
export async function getScheduledEventIds(origin?: ReminderOrigin): Promise<string[]> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const ids = new Set<string>();
  for (const n of pending) {
    const data = n.content.data as { eventId?: string; origin?: ReminderOrigin } | undefined;
    if (data?.eventId && typeof data.eventId === "string") {
      const o = data.origin;
      if (origin == null || o === origin || (origin === "booked" && o == null)) {
        ids.add(data.eventId);
      }
    }
  }
  return Array.from(ids);
}

/**
 * 출처(예약/지역)별로 예약된 알림 전부 취소
 * 'booked' 시 origin 없음(구 알림)도 함께 취소
 */
export async function cancelScheduledByOrigin(origin: ReminderOrigin): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of pending) {
    const data = n.content.data as { origin?: ReminderOrigin } | undefined;
    const o = data?.origin;
    const match = o === origin || (origin === "booked" && o == null);
    if (match) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export type ScheduleRegionRemindersResult =
  | { ok: true; regionName: string; regionKey: string; count: number }
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
    await cancelEventRemindersForOrigin(ev.id, "region");
    const id = await scheduleEventReminder(ev.id, ev.title, ev.startAt, 1, "region");
    if (id) scheduled++;
  }

  const regionLabel = regionKey === "충청북도" ? "충청북도" : regionKey;
  return {
    ok: true,
    regionName: regionLabel,
    regionKey,
    count: scheduled,
  };
}

/**
 * 지역 키로 해당 지역 행사 1일 전 알림 예약 (알림설정에서 지역 선택 시)
 * 기존 지역 알림은 취소 후 새 지역으로 스케줄
 */
export async function scheduleRegionEventRemindersByRegionKey(
  regionKey: string
): Promise<ScheduleRegionRemindersResult> {
  const granted = await requestPermission();
  if (!granted) {
    return { ok: false, message: "알림 권한을 허용해 주세요." };
  }
  await ensureChannel();

  const center = REGION_CENTERS[regionKey];
  if (!center) return { ok: false, message: "선택한 지역 정보를 불러올 수 없어요." };

  await cancelScheduledByOrigin("region");

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
    const id = await scheduleEventReminder(ev.id, ev.title, ev.startAt, 1, "region");
    if (id) scheduled++;
  }

  const regionLabel = regionKey === "충청북도" ? "충청북도" : regionKey;
  return {
    ok: true,
    regionName: regionLabel,
    count: scheduled,
  };
}
