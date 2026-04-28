// app/(tabs)/mypage/location-permission.tsx - 위치 권한
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeBack } from '../../../hooks/useSafeBack';

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'loading';

export default function LocationPermissionScreen() {
  const safeBack = useSafeBack();
  const [status, setStatus] = useState<PermStatus>('loading');

  const checkStatus = useCallback(async () => {
    setStatus('loading');
    try {
      const { status: s } = await Location.getForegroundPermissionsAsync();
      setStatus(s as PermStatus);
    } catch {
      setStatus('undetermined');
    }
  }, []);

  useFocusEffect(useCallback(() => { checkStatus(); }, [checkStatus]));

  const handleRequest = async () => {
    const { status: s } = await Location.requestForegroundPermissionsAsync();
    setStatus(s as PermStatus);
    if (s !== Location.PermissionStatus.GRANTED) {
      Alert.alert(
        '위치 권한 필요',
        '설정 앱에서 위치 권한을 허용해 주세요.',
        [{ text: '취소', style: 'cancel' }, { text: '설정 열기', onPress: () => Linking.openSettings() }]
      );
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => Alert.alert('안내', '설정 앱을 열 수 없습니다.'));
  };

  const isGranted = status === 'granted';

  return (
    <>
      <Stack.Screen
        options={{
          title: '위치 권한',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={safeBack} hitSlop={8} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <View style={styles.container}>

          {/* 상태 카드 */}
          <View style={[styles.statusCard, isGranted ? styles.statusCardOn : styles.statusCardOff]}>
            <View style={[styles.statusIconWrap, isGranted ? styles.statusIconOn : styles.statusIconOff]}>
              {status === 'loading' ? (
                <ActivityIndicator size="small" color={isGranted ? '#10B981' : '#F59E0B'} />
              ) : (
                <Ionicons
                  name={isGranted ? 'location' : 'location-outline'}
                  size={28}
                  color={isGranted ? '#10B981' : '#F59E0B'}
                />
              )}
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusLabel}>위치 권한</Text>
              <Text style={[styles.statusValue, isGranted ? styles.statusValueOn : styles.statusValueOff]}>
                {status === 'loading' ? '확인 중...' : isGranted ? '허용됨' : '거부됨'}
              </Text>
            </View>
            <View style={[styles.statusBadge, isGranted ? styles.statusBadgeOn : styles.statusBadgeOff]}>
              <Ionicons
                name={isGranted ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isGranted ? '#10B981' : '#EF4444'}
              />
            </View>
          </View>

          {/* 설명 */}
          <View style={styles.infoBox}>
            <InfoRow icon="map-outline" text="지도에서 현재 위치 및 주변 행사를 볼 수 있어요" />
            <InfoRow icon="walk-outline" text="축제 구역에 들어가면 참여 상태가 자동 기록돼요" />
            <InfoRow icon="navigate-outline" text="현재 위치 기준 길 안내를 사용할 수 있어요" />
          </View>

          {/* 액션 버튼 */}
          {!isGranted && status !== 'loading' && (
            <Pressable style={styles.primaryButton} onPress={handleRequest}>
              <Ionicons name="location" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>위치 권한 허용하기</Text>
            </Pressable>
          )}

          <Pressable style={styles.secondaryButton} onPress={handleOpenSettings}>
            <Ionicons name="settings-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>시스템 설정에서 변경</Text>
          </Pressable>

        </View>
      </SafeAreaView>
    </>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#4C8BF5" style={styles.infoIcon} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBackButton: { paddingLeft: 4, paddingRight: 10 },
  safeArea: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flex: 1, padding: 20, gap: 16 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  statusCardOn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  statusCardOff: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },

  statusIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconOn: { backgroundColor: '#DCFCE7' },
  statusIconOff: { backgroundColor: '#FEF3C7' },

  statusTextWrap: { flex: 1 },
  statusLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  statusValue: { fontSize: 17, fontWeight: '700' },
  statusValueOn: { color: '#10B981' },
  statusValueOff: { color: '#D97706' },

  statusBadge: { padding: 4 },
  statusBadgeOn: {},
  statusBadgeOff: {},

  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 1 },
  infoText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#4C8BF5',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  secondaryButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});
