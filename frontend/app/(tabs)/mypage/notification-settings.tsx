// app/(tabs)/mypage/notification-settings.tsx - 알림설정
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as eventReminder from '../../../services/eventReminder.service';
import { REGION_PICKER_OPTIONS } from '../../../utils/region';

const STORAGE_KEYS = {
  pushEnabled: '@mypage/notification_push_enabled',
  eventReminder: '@mypage/notification_event_reminder',
  eventReminderBooked: '@mypage/notification_event_reminder_booked',
  eventReminderRegion: '@mypage/notification_event_reminder_region',
  eventReminderRegionKey: '@mypage/notification_event_reminder_region_key',
};

export default function NotificationSettingsScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const fromHome = params.from === 'home';

  const [pushEnabled, setPushEnabled] = useState(true);
  const [eventReminderOn, setEventReminderOn] = useState(true);
  const [bookedOn, setBookedOn] = useState(true);
  const [regionOn, setRegionOn] = useState(false);
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionLoading, setRegionLoading] = useState(false);

  const handleBack = () => {
    if (fromHome) {
      router.replace('/(tabs)/home');
    } else {
      router.back();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [push, reminder, booked, region, rKey] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.pushEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminder),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderBooked),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegion),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegionKey),
        ]);
        if (push !== null) setPushEnabled(push === 'true');
        if (reminder !== null) setEventReminderOn(reminder === 'true');
        if (booked !== null) setBookedOn(booked === 'true');
        if (region !== null) setRegionOn(region === 'true');
        if (rKey != null && rKey !== '') setRegionKey(rKey);
      } catch {}
    })();
  }, []);

  const handlePushChange = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.pushEnabled, String(value));
    } catch {}
  };

  const handleEventReminderChange = async (value: boolean) => {
    setEventReminderOn(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminder, String(value));
    } catch {}
    if (!value) {
      setBookedOn(false);
      setRegionOn(false);
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBooked, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'false');
      await eventReminder.cancelScheduledByOrigin('booked');
      await eventReminder.cancelScheduledByOrigin('region');
    }
  };

  const handleBookedChange = async (value: boolean) => {
    setBookedOn(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBooked, String(value));
    } catch {}
    if (!value) {
      await eventReminder.cancelScheduledByOrigin('booked');
    }
  };

  const handleRegionChange = async (value: boolean) => {
    if (value) {
      setRegionModalVisible(true);
      return;
    }
    setRegionOn(false);
    setRegionKey(null);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionKey, '');
    } catch {}
    await eventReminder.cancelScheduledByOrigin('region');
  };

  const handleSelectRegion = async (key: string) => {
    setRegionModalVisible(false);
    setRegionLoading(true);
    try {
      const result = await eventReminder.scheduleRegionEventRemindersByRegionKey(key);
      if (result.ok) {
        setRegionOn(true);
        setRegionKey(key);
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionKey, key);
        Alert.alert(
          '지역 행사 알림',
          result.count > 0
            ? `${result.regionName} 지역 행사 ${result.count}건에 대해 1일 전 알림을 예약했어요.`
            : `${result.regionName} 지역에 예정된 행사가 없어요. 행사가 등록되면 알려드릴게요.`
        );
      } else {
        Alert.alert('알림 설정', result.message);
      }
    } catch (e) {
      Alert.alert('알림 설정', e instanceof Error ? e.message : '설정에 실패했어요.');
    } finally {
      setRegionLoading(false);
    }
  };

  const regionLabel = regionKey
    ? REGION_PICKER_OPTIONS.find((r) => r.key === regionKey)?.label ?? regionKey
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: '알림설정',
          headerShown: true,
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            푸시 알림을 켜면 축제·행사 관련 소식을 받을 수 있습니다.
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={22} color="#6B7280" />
              <Text style={styles.label}>푸시 알림</Text>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushChange}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Ionicons name="calendar-outline" size={22} color="#6B7280" />
              <Text style={styles.label}>행사 리마인더</Text>
              <Switch
                value={eventReminderOn}
                onValueChange={handleEventReminderChange}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {eventReminderOn ? (
              <>
                <View style={[styles.subRow, styles.rowBorder]}>
                  <Text style={styles.subLabel}>예약한 행사 알림</Text>
                  <Switch
                    value={bookedOn}
                    onValueChange={handleBookedChange}
                    trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.subRow, styles.rowBorder]}>
                  <View>
                    <Text style={styles.subLabel}>지역 행사 알림</Text>
                    <Text style={styles.subHint}>지정 지역 행사 1일 전 알림</Text>
                  </View>
                  <Switch
                    value={regionOn}
                    onValueChange={handleRegionChange}
                    trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {regionOn ? (
                  <Pressable
                    style={[styles.subRow, styles.rowBorder, styles.regionRow]}
                    onPress={() => setRegionModalVisible(true)}
                  >
                    <Text style={styles.regionLabel}>
                      {regionLoading ? '설정 중…' : regionLabel ? `선택 지역: ${regionLabel}` : '지역 선택'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
          <Text style={styles.reminderDescription}>
            • 예약한 행사 알림: 행사 상세 화면에서 알림 아이콘을 누르면 해당 행사 1일/3일 전에 알림을 받을 수 있어요.
            {'\n'}
            • 지역 행사 알림: 위에서 지역을 지정하면, 해당 지역에서 열리는 행사 1일 전에 알려드려요.
          </Text>
        </ScrollView>

        <Modal
          visible={regionModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setRegionModalVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setRegionModalVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>알림 받을 지역 선택</Text>
                <Pressable onPress={() => setRegionModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>
              {regionLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#4C8BF5" />
                </View>
              ) : (
                <ScrollView style={styles.regionList}>
                  {REGION_PICKER_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      style={styles.regionItem}
                      onPress={() => handleSelectRegion(opt.key)}
                    >
                      <Text style={styles.regionItemText}>{opt.label}</Text>
                      {regionKey === opt.key ? (
                        <Ionicons name="checkmark" size={22} color="#4C8BF5" />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBackButton: { paddingLeft: 4, paddingRight: 10 },
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingLeft: 44,
  },
  subLabel: { fontSize: 15, color: '#111827' },
  subHint: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  regionRow: { paddingLeft: 44 },
  regionLabel: { fontSize: 14, color: '#4C8BF5', fontWeight: '500' },
  label: { flex: 1, fontSize: 15, color: '#111827' },
  reminderDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  modalLoading: { padding: 40, alignItems: 'center' },
  regionList: { maxHeight: 320 },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  regionItemText: { fontSize: 16, color: '#111827' },
});
