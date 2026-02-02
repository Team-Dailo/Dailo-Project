// app/(tabs)/mypage/settings.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyPageSettingsScreen() {
  return (
    <>
      {/* 네이티브 헤더 사용 (상단과 겹치지 않음) */}
      <Stack.Screen
        options={{
          title: '설정',
          headerShown: true,
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />

      {/* 헤더 아래 영역만 SafeArea 처리 */}
      <SafeAreaView
        style={styles.safeArea}
        edges={['left', 'right', 'bottom']}
      >
        <View style={styles.container}>
          <Pressable style={styles.item}>
            <Ionicons
              name="notifications-outline"
              size={22}
              style={styles.icon}
            />
            <Text style={styles.label}>알림설정</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable style={styles.item}>
            <Ionicons name="location-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>위치 권한</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable style={styles.item}>
            <Ionicons name="call-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>문의하기</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable style={styles.item}>
            <Ionicons name="log-out-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>로그인/로그아웃</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  icon: {
    marginRight: 12,
    color: '#111827',
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  arrow: {
    color: '#9CA3AF',
  },
});
