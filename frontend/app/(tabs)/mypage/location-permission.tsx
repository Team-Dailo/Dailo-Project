// app/(tabs)/mypage/location-permission.tsx - 위치 권한
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

export default function LocationPermissionScreen() {
  const openAppSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('안내', '설정 앱을 열 수 없습니다.');
    });
  };

  const checkPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) {
      Alert.alert('위치 권한', '위치 권한이 허용되어 있습니다.');
    } else {
      Alert.alert(
        '위치 권한',
        '위치 권한이 허용되지 않았습니다. 지도에서 현재 위치·주변 행사 보기를 사용하려면 설정에서 허용해 주세요.',
        [{ text: '취소', style: 'cancel' }, { text: '설정 열기', onPress: openAppSettings }]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '위치 권한',
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
          <View style={styles.iconWrap}>
            <Ionicons name="location-outline" size={48} color="#2563EB" />
          </View>
          <Text style={styles.title}>위치 권한이 필요해요</Text>
          <Text style={styles.description}>
            지도에서 현재 위치 버튼 사용, 주변 행사 보기, 축제 구역 진입 알림 등을 위해 위치 권한을 허용해 주세요.
          </Text>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>• 현재 위치 기준으로 주변 행사를 볼 수 있어요</Text>
            <Text style={styles.bullet}>• 축제 구역에 들어가면 참여 상태가 자동으로 기록돼요</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={openAppSettings}>
            <Text style={styles.primaryButtonText}>설정에서 권한 변경</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={checkPermission}>
            <Text style={styles.secondaryButtonText}>권한 상태 확인</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 32 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  bullets: { marginBottom: 24 },
  bullet: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  secondaryButton: { paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { fontSize: 14, color: '#6B7280' },
});
