import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@notification_history';
const MAX_RECORDS = 50;

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  receivedAt: string; // ISO string
  eventId?: string;
};

export async function saveNotificationRecord(
  record: Omit<NotificationRecord, 'id'>
): Promise<void> {
  try {
    const existing = await getNotificationHistory();
    const newRecord: NotificationRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    const updated = [newRecord, ...existing].slice(0, MAX_RECORDS);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {}
}

export async function getNotificationHistory(): Promise<NotificationRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NotificationRecord[];
  } catch {
    return [];
  }
}

export async function clearNotificationHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
}
