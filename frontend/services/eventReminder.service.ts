/**
 * 행사 알림: 원하는 N일 전 로컬 알림 스케줄 (기본 1일 전) + 본인 지역 행사 1일 전 알림
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  try {
    const existing = await Notifications.getPermissionsAsync();
    // 권한이 이미 허용되어 있으면 true 반환
    if (existing.status === "granted") return true;
    // 권한이 거부되었으면 false 반환 (다시 요청하지 않음)
    if (existing.status === "denied") return false;
    // 권한이 아직 결정되지 않았거나 undetermined인 경우에만 요청
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === "granted";
  } catch (error) {
    // 에러 발생 시 권한 체크 실패로 간주
    return false;
  }
}

export type ReminderOrigin = "booked" | "region";

const REGION_EVENT_DAYS_KEY = "@mypage/notification_region_event_reminder_days_before";
const REGION_EVENT_TIME_HOUR_KEY = "@mypage/notification_region_event_reminder_time_hour";

/** 알림 문구: 행사 시작일까지 남은 일수에 따라 메시지 생성 */
function reminderBodyText(daysUntilStart: number, eventTitle: string): string {
  if (daysUntilStart === 0) return `오늘, "${eventTitle}" 행사가 있습니다.`;
  if (daysUntilStart === 1) return `내일, "${eventTitle}" 행사가 있습니다.`;
  return `${daysUntilStart}일 후, "${eventTitle}" 행사가 있습니다.`;
}

/**
 * 행사 시작일(ISO)과 제목으로 N일 전 알림 스케줄 (기본 1일 전)
 * origin: 'booked' = 행사 상세에서 예약, 'region' = 지역 행사 알림
 * daysBefore: 1~30 (기본 1)
 * hour: 알림 시각 (0~23, 기본 9시)
 */
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startAtIso: string,
  daysBefore: number = 1,
  origin: ReminderOrigin = "booked",
  hour: number = 9
): Promise<string | null> {
  const days = Math.max(1, Math.min(30, Math.floor(daysBefore)) || 1);
  const granted = await requestPermission();
  if (!granted) {
    // 권한이 없으면 null 반환 (호출하는 쪽에서 권한 체크 후 적절한 메시지 표시)
    return null;
  }
  await ensureChannel();

  let triggerDate: Date;
  let daysUntilStart: number;
  try {
    const start = new Date(startAtIso);
    const now = new Date();
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 행사 시작일이 오늘이거나 이미 지났는지 확인
    daysUntilStart = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilStart < 0) {
      // 행사가 이미 시작되었거나 지났으면 알림 예약 불가
      return null;
    }
    
    if (daysUntilStart === 0) {
      // 행사가 오늘 시작하는 경우: 오늘 지정한 시각에 알림 (이미 해당 시각이 지났으면 예약 불가)
      triggerDate = new Date(now);
      triggerDate.setHours(hour, 0, 0, 0);
    } else if (daysUntilStart < days) {
      // 행사 시작일까지 남은 일수가 요청한 daysBefore보다 적으면, 행사 시작일 지정 시각에 알림
      triggerDate = new Date(startDate);
      triggerDate.setHours(hour, 0, 0, 0);
    } else {
      // 정상적인 경우: 행사 시작일 - daysBefore일 지정 시각
      triggerDate = new Date(startDate);
      triggerDate.setDate(triggerDate.getDate() - days);
      triggerDate.setHours(hour, 0, 0, 0);
    }
    
    // 알림 시간이 현재 시간보다 과거면 예약 불가
    if (triggerDate.getTime() <= now.getTime()) return null;
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "행사 알림",
        body: reminderBodyText(daysUntilStart, eventTitle),
        data: { eventId, daysBefore: days, origin },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: CHANNEL_ID,
      },
    });
    return identifier;
  } catch {
    return null;
  }
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

  // 지역 행사 알림 공통 설정 (며칠 전/시간) 불러오기
  let regionDaysBefore = 1;
  try {
    const storedDays = await AsyncStorage.getItem(REGION_EVENT_DAYS_KEY);
    if (storedDays != null && storedDays !== "") {
      const parsed = parseInt(storedDays, 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 30) {
        regionDaysBefore = parsed;
      }
    }
  } catch {
    // ignore
  }

  let regionTimeHour = 9;
  try {
    const storedTime = await AsyncStorage.getItem(REGION_EVENT_TIME_HOUR_KEY);
    if (storedTime != null && storedTime !== "") {
      const parsedTime = parseInt(storedTime, 10);
      if (!Number.isNaN(parsedTime) && parsedTime >= 0 && parsedTime <= 23) {
        regionTimeHour = parsedTime;
      }
    }
  } catch {
    // ignore
  }

  let scheduled = 0;
  for (const ev of inRegion) {
    const id = await scheduleEventReminder(ev.id, ev.title, ev.startAt, regionDaysBefore, "region", regionTimeHour);
    if (id) scheduled++;
  }

  const regionLabel = regionKey === "충청북도" ? "충청북도" : regionKey;
  return {
    ok: true,
    regionName: regionLabel,
    count: scheduled,
  };
}
