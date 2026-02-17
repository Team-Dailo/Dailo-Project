// app/(tabs)/mypage/notification-settings.tsx - 알림설정
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  pushEnabled: '@mypage/notification_push_enabled',
  eventReminder: '@mypage/notification_event_reminder',
};

export default function NotificationSettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [eventReminder, setEventReminder] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [push, reminder] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.pushEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.eventReminder),
        ]);
        if (push !== null) setPushEnabled(push === 'true');
        if (reminder !== null) setEventReminder(reminder === 'true');
      } catch {}
    })();
  }, []);

  const handlePushChange = async (value: boolean) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.pushEnabled, String(value));
    } catch {}
  };

  const handleReminderChange = async (value: boolean) => {
    setEventReminder(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.eventReminder, String(value));
    } catch {}
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '알림설정',
          headerShown: true,
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 4 }}>
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
                value={eventReminder}
                onValueChange={handleReminderChange}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
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
  label: { flex: 1, fontSize: 15, color: '#111827' },
});
