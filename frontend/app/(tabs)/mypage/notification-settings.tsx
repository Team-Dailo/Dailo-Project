// app/(tabs)/mypage/notification-settings.tsx - 알림설정
import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  ToastAndroid,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeBack } from '../../../hooks/useSafeBack';
import * as eventReminder from '../../../services/eventReminder.service';
import * as notificationService from '../../../services/notification.service';
import { useAuthContext } from '../../../contexts/AuthContext';
import { REGION_PICKER_OPTIONS } from '../../../utils/region';

const STORAGE_KEYS = {
  pushEnabled: '@mypage/notification_push_enabled',
  eventReminder: '@mypage/notification_event_reminder',
  eventReminderBooked: '@mypage/notification_event_reminder_booked',
  eventReminderRegion: '@mypage/notification_event_reminder_region',
  eventReminderRegionKey: '@mypage/notification_event_reminder_region_key',
  // 예약한 행사 알림용 기본 값 (기존 키 유지)
  eventReminderBookedDaysBefore: '@mypage/notification_event_reminder_days_before',
  eventReminderBookedTimeHour: '@mypage/notification_event_reminder_time_hour',
  // 지역 행사 알림용 별도 설정
  eventReminderRegionDaysBefore: '@mypage/notification_region_event_reminder_days_before',
  eventReminderRegionTimeHour: '@mypage/notification_region_event_reminder_time_hour',
};

export default function NotificationSettingsScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const safeBack = useSafeBack();
  const { isLoggedIn } = useAuthContext();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [eventReminderOn, setEventReminderOn] = useState(true);
  const [bookedOn, setBookedOn] = useState(true);
  const [regionOn, setRegionOn] = useState(false);
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [regionLoading, setRegionLoading] = useState(false);
  const [bookedDaysBefore, setBookedDaysBefore] = useState<number>(1);
  const [regionDaysBefore, setRegionDaysBefore] = useState<number>(1);
  const [daysModalTarget, setDaysModalTarget] = useState<'booked' | 'region'>('booked');
  const [daysModalVisible, setDaysModalVisible] = useState(false);
  const [bookedTimeHour, setBookedTimeHour] = useState<number>(9);
  const [regionTimeHour, setRegionTimeHour] = useState<number>(9);
  const [timeInput, setTimeInput] = useState<string>('9');
  const [regionMoreVisible, setRegionMoreVisible] = useState(false);

  const handleBack = useCallback(() => {
    if (params.from === 'home') {
      router.replace('/(tabs)/home');
    } else {
      safeBack();
    }
  }, [params.from, safeBack]);

  useEffect(() => {
    (async () => {
      try {
        // 1. 로컬 저장소에서 불러오기
        const [push, reminder, booked, region, rKey, bookedDays, bookedTime, regionDays, regionTime] =
          await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.pushEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminder),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderBooked),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegion),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegionKey),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderBookedDaysBefore),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderBookedTimeHour),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegionDaysBefore),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminderRegionTimeHour),
        ]);
        if (push !== null) setPushEnabled(push === 'true');
        if (reminder !== null) setEventReminderOn(reminder === 'true');
        if (booked !== null) setBookedOn(booked === 'true');
        if (region !== null) setRegionOn(region === 'true');
        if (rKey != null && rKey !== '') setRegionKey(rKey);
        if (bookedDays != null && bookedDays !== '') {
          const parsed = parseInt(bookedDays, 10);
          if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 30) {
            setBookedDaysBefore(parsed);
          }
        }
        if (regionDays != null && regionDays !== '') {
          const parsed = parseInt(regionDays, 10);
          if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 30) {
            setRegionDaysBefore(parsed);
          }
        }
        if (bookedTime != null && bookedTime !== '') {
          const parsedTime = parseInt(bookedTime, 10);
          if (!Number.isNaN(parsedTime) && parsedTime >= 0 && parsedTime <= 23) {
            setBookedTimeHour(parsedTime);
            setTimeInput(String(parsedTime));
          }
        } else {
          setTimeInput('9');
        }
        if (regionTime != null && regionTime !== '') {
          const parsedTime = parseInt(regionTime, 10);
          if (!Number.isNaN(parsedTime) && parsedTime >= 0 && parsedTime <= 23) {
            setRegionTimeHour(parsedTime);
          }
        }

        // 2. 로그인 상태면 서버에서 설정 동기화
        if (isLoggedIn) {
          try {
            const serverSettings = await notificationService.getNotificationSettings();
            // 서버 설정이 있으면 로컬에 반영
            if (serverSettings) {
              setPushEnabled(serverSettings.newEventEnabled);
              setEventReminderOn(serverSettings.eventReminderEnabled);
              if (serverSettings.subscribedRegions) {
                setRegionKey(serverSettings.subscribedRegions);
                setRegionOn(true);
              }
              // 로컬 저장소에도 동기화
              await AsyncStorage.setItem(STORAGE_KEYS.pushEnabled, String(serverSettings.newEventEnabled));
              await AsyncStorage.setItem(STORAGE_KEYS.eventReminder, String(serverSettings.eventReminderEnabled));
              if (serverSettings.subscribedRegions) {
                await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionKey, serverSettings.subscribedRegions);
                await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'true');
              }
            }
          } catch {
            // 서버 동기화 실패 시 로컬 설정 유지
          }
        }
      } catch {}
    })();
  }, [isLoggedIn]);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message, [{ text: '확인' }]);
    }
  };

  // 서버에 알림 설정 동기화
  const syncToServer = useCallback(async (settings: {
    newEventEnabled: boolean;
    eventReminderEnabled: boolean;
    subscribedRegions: string | null;
  }) => {
    if (!isLoggedIn) return;
    try {
      await notificationService.updateNotificationSettings({
        newEventEnabled: settings.newEventEnabled,
        eventReminderEnabled: settings.eventReminderEnabled,
        subscribedRegions: settings.subscribedRegions,
      });
    } catch {
      // 서버 동기화 실패 시 무시 (로컬은 이미 저장됨)
    }
  }, [isLoggedIn]);

  const handlePushChange = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.pushEnabled, String(value));
    } catch {}
    if (!value) {
      setEventReminderOn(false);
      setBookedOn(false);
      setRegionOn(false);
      setRegionKey(null);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminder, 'false');
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBooked, 'false');
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'false');
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionKey, '');
      } catch {}
      eventReminder.cancelScheduledByOrigin('booked').catch(() => {});
      eventReminder.cancelScheduledByOrigin('region').catch(() => {});
    }
    // 서버 동기화
    syncToServer({
      newEventEnabled: value,
      eventReminderEnabled: value ? eventReminderOn : false,
      subscribedRegions: value ? regionKey : null,
    });
  };

  const handleEventReminderChange = async (value: boolean) => {
    if (!pushEnabled) return;
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
    // 서버 동기화
    syncToServer({
      newEventEnabled: pushEnabled,
      eventReminderEnabled: value,
      subscribedRegions: value ? regionKey : null,
    });
  };

  const handleBookedChange = async (value: boolean) => {
    if (!pushEnabled || !eventReminderOn) return;
    setBookedOn(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBooked, String(value));
    } catch {}
    if (value) {
      showToast('행사 상세에서 알림 아이콘을 누르면 원하는 날(기본 1일 전)에 알림을 받을 수 있어요.');
    } else {
      await eventReminder.cancelScheduledByOrigin('booked');
    }
  };

  const handleRegionChange = async (value: boolean) => {
    if (!pushEnabled || !eventReminderOn) return;
    if (value) {
      showToast('지역을 선택하면 해당 지역 행사 1일 전에 알림을 받을 수 있어요.');
      // 토글을 켰을 때 바로 ON 상태로 유지되도록 저장
      setRegionOn(true);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegion, 'true');
      } catch {}
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
    // 서버 동기화 (지역 설정 해제)
    syncToServer({
      newEventEnabled: pushEnabled,
      eventReminderEnabled: eventReminderOn,
      subscribedRegions: null,
    });
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
        // 서버 동기화
        syncToServer({
          newEventEnabled: pushEnabled,
          eventReminderEnabled: eventReminderOn,
          subscribedRegions: key,
        });
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

  const openDaysModal = (target: 'booked' | 'region') => {
    if (!pushEnabled || !eventReminderOn) return;
    if (target === 'booked' && !bookedOn) return;
    // 지역 행사 알림은 꺼져 있어도 시간 설정은 가능하도록 허용
    setDaysModalTarget(target);
    const baseHour = target === 'booked' ? bookedTimeHour : regionTimeHour;
    setTimeInput(String(baseHour));
    setDaysModalVisible(true);
  };

  const handleSelectDaysBefore = async (value: number) => {
    setDaysModalVisible(false);
    const safe = Math.max(1, Math.min(30, Math.floor(value) || 1));
    if (daysModalTarget === 'booked') {
      setBookedDaysBefore(safe);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBookedDaysBefore, String(safe));
      } catch {}
    } else {
      setRegionDaysBefore(safe);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionDaysBefore, String(safe));
      } catch {}
    }
  };

  const handleSelectTimeHour = async (value: number) => {
    if (daysModalTarget === 'booked') {
      setBookedTimeHour(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderBookedTimeHour, String(value));
      } catch {}
    } else {
      setRegionTimeHour(value);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.eventReminderRegionTimeHour, String(value));
      } catch {}
    }
    setDaysModalVisible(false);
  };

  const formatTimeLabel = (h: number): string => {
    const suffix = h >= 12 ? '오후' : '오전';
    const hour12 = ((h + 11) % 12) + 1;
    return `${suffix} ${hour12}시`;
  };
  const bookedDaysLabel =
    (bookedDaysBefore === 1 ? '행사 1일 전' : `행사 ${bookedDaysBefore}일 전`) +
    `, ${formatTimeLabel(bookedTimeHour)}에 알림`;

  const regionDaysLabel =
    (regionDaysBefore === 1 ? '행사 1일 전' : `행사 ${regionDaysBefore}일 전`) +
    `, ${formatTimeLabel(regionTimeHour)}에 알림`;

  return (
    <>
      <Stack.Screen
        options={{
          title: '알림설정',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={handleBack} hitSlop={8} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={22} color={pushEnabled ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.label, !pushEnabled && styles.labelDisabled]}>푸시 알림</Text>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushChange}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={styles.pushHint}>푸시 알림을 켜면 축제·행사 관련 소식을 받을 수 있습니다.</Text>
            <View style={[styles.row, styles.rowBorder]}>
              <Ionicons name="calendar-outline" size={22} color={pushEnabled ? '#6B7280' : '#9CA3AF'} />
              <Text style={[styles.label, !pushEnabled && styles.labelDisabled]}>행사 리마인더</Text>
              <Switch
                value={eventReminderOn}
                onValueChange={handleEventReminderChange}
                disabled={!pushEnabled}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {(() => {
              const subDisabled = !pushEnabled || !eventReminderOn;
              return (
                <>
                  <View style={[styles.subRow, styles.rowBorder, subDisabled && styles.rowDisabled]}>
                    <View>
                      <Text style={[styles.subLabel, subDisabled && styles.labelDisabled]}>
                        예약한 행사 알림
                      </Text>
                      <Text style={styles.subHint}>{bookedDaysLabel}</Text>
                    </View>
                    <View style={styles.subRight}>
                      <Switch
                        value={bookedOn}
                        onValueChange={handleBookedChange}
                        disabled={subDisabled}
                        trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                        thumbColor="#FFFFFF"
                      />
                      <Pressable
                        onPress={() => openDaysModal('booked')}
                        disabled={subDisabled}
                        hitSlop={8}
                        style={styles.moreIconButton}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={18}
                          color={subDisabled || !bookedOn ? '#9CA3AF' : '#4C8BF5'}
                        />
                      </Pressable>
                    </View>
                  </View>
                  <View style={[styles.subRow, styles.rowBorder, subDisabled && styles.rowDisabled]}>
                    <View>
                      <Text style={[styles.subLabel, subDisabled && styles.labelDisabled]}>지역 행사 알림</Text>
                      <Text style={styles.subHint}>{regionDaysLabel}</Text>
                    </View>
                    <View style={styles.subRight}>
                      <Switch
                        value={regionOn}
                        onValueChange={handleRegionChange}
                        disabled={subDisabled}
                        trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                        thumbColor="#FFFFFF"
                      />
                      <Pressable
                        onPress={() => {
                          if (!subDisabled) setRegionMoreVisible(true);
                        }}
                        disabled={subDisabled}
                        hitSlop={8}
                        style={styles.moreIconButton}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={18}
                          color={subDisabled || !regionOn ? '#9CA3AF' : '#4C8BF5'}
                        />
                      </Pressable>
                    </View>
                  </View>
                  {regionOn && pushEnabled && eventReminderOn ? (
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
              );
            })()}
          </View>
          <Text style={styles.reminderDescription}>
            • 예약한 행사 알림: 행사 상세 화면에서 알림 아이콘을 누르면 해당 행사 1일 전(기본) 또는 원하는 날에 알림을 받을 수 있어요.
            {'\n'}
            • 지역 행사 알림: 위에서 지역을 지정하면, 해당 지역에서 열리는 행사 1일 전에 알려드려요.
          </Text>
        </ScrollView>

        <Modal
          visible={regionModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRegionModalVisible(false)}
        >
          <Pressable style={styles.regionMoreBackdrop} onPress={() => setRegionModalVisible(false)}>
            <View style={styles.daysModalContent}>
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
                <ScrollView style={styles.daysModalList}>
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

        <Modal
          visible={daysModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDaysModalVisible(false)}
        >
          <Pressable
            style={[styles.moreBackdrop, daysModalTarget === 'region' && styles.regionDaysBackdrop]}
            onPress={() => setDaysModalVisible(false)}
          >
            <View style={styles.daysModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>알림 시점 선택</Text>
                <Pressable onPress={() => setDaysModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color="#111827" />
                </Pressable>
              </View>
              <ScrollView style={styles.daysModalList}>
                {[1, 2, 3].map((d) => (
                  <Pressable
                    key={`day-${d}`}
                    style={styles.regionItem}
                    onPress={() => handleSelectDaysBefore(d)}
                  >
                    <Text style={styles.regionItemText}>
                      {d === 1 ? '행사 1일 전' : `행사 ${d}일 전`}
                    </Text>
                    {(daysModalTarget === 'booked' ? bookedDaysBefore : regionDaysBefore) === d ? (
                      <Ionicons name="checkmark" size={22} color="#4C8BF5" />
                    ) : null}
                  </Pressable>
                ))}
                <View style={styles.modalSectionDivider} />
                <View style={styles.timeInputRow}>
                  <Text style={styles.timeInputLabel}>알림 시각 (0~23시)</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={timeInput}
                    onChangeText={setTimeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="9"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    onPress={() => {
                      const v = parseInt(timeInput, 10);
                      if (Number.isNaN(v) || v < 0 || v > 23) {
                        Alert.alert('입력 오류', '0~23 사이의 숫자로 시간을 입력해 주세요.');
                        return;
                      }
                      handleSelectTimeHour(v);
                    }}
                    hitSlop={4}
                  >
                    <Text style={styles.timeApplyText}>적용</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal
          visible={regionMoreVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRegionMoreVisible(false)}
        >
          <Pressable style={styles.regionMoreBackdrop} onPress={() => setRegionMoreVisible(false)}>
            <View style={styles.moreMenu}>
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  setRegionMoreVisible(false);
                  setRegionModalVisible(true);
                }}
              >
                <Text style={styles.moreMenuText}>지역 설정하기</Text>
              </Pressable>
              <View style={styles.modalSectionDivider} />
              <Pressable
                style={styles.moreMenuItem}
                onPress={() => {
                  setRegionMoreVisible(false);
                  openDaysModal('region');
                }}
              >
                <Text style={styles.moreMenuText}>시간 설정</Text>
              </Pressable>
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
  subRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moreIconButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  regionRow: { paddingLeft: 44 },
  regionLabel: { fontSize: 14, color: '#4C8BF5', fontWeight: '500' },
  label: { flex: 1, fontSize: 15, color: '#111827' },
  labelDisabled: { color: '#9CA3AF' },
  rowDisabled: { opacity: 0.7 },
  pushHint: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingLeft: 50,
  },
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
  modalSectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  moreMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 180,
    marginRight: 56,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  moreMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  moreMenuText: {
    fontSize: 15,
    color: '#111827',
  },
  moreBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 270,
    paddingRight: 16,
  },
  regionDaysBackdrop: {
    paddingTop: 340,
  },
  regionMoreBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 340,
    paddingRight: 16,
  },
  daysModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 240,
    maxHeight: 400,
    marginRight: 56,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  daysModalList: {
    maxHeight: 320,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  timeInputLabel: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  timeInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  timeApplyText: {
    fontSize: 14,
    color: '#4C8BF5',
    fontWeight: '500',
  },
});
