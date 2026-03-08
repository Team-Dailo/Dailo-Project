// app/(tabs)/mypage/settings.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { useSafeBack } from '../../../hooks/useSafeBack';
import * as authService from '../../../services/auth.service';

export default function MyPageSettingsScreen() {
  const { isLoggedIn, logout } = useAuth();
  const safeBack = useSafeBack();
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = () => {
    Alert.alert(
      '계정 탈퇴 및 데이터 삭제',
      '탈퇴 시 계정과 연동된 데이터가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: async () => {
            setWithdrawing(true);
            try {
              await authService.withdrawApi();
              await logout();
              router.replace('/login');
            } catch (e) {
              Alert.alert('탈퇴 실패', e instanceof Error ? e.message : '계정 탈퇴에 실패했습니다.');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const handleLoginLogout = () => {
    if (isLoggedIn) {
      Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => { logout(); safeBack(); } },
      ]);
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '설정',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable
              onPress={safeBack}
              hitSlop={8}
              style={styles.headerBackButton}
            >
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={['left', 'right', 'bottom']}
      >
        <View style={styles.container}>
          <Pressable
            style={styles.item}
            onPress={() => router.push('/(tabs)/mypage/notification-settings')}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              style={styles.icon}
            />
            <Text style={styles.label}>알림설정</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => router.push('/(tabs)/mypage/location-permission')}
          >
            <Ionicons name="location-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>위치 권한</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => router.push('/(tabs)/mypage/privacy-policy')}
          >
            <Ionicons name="shield-checkmark-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>개인정보처리방침</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable
            style={styles.item}
            onPress={() => router.push('/(tabs)/mypage/contact')}
          >
            <Ionicons name="call-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>문의하기</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          <Pressable style={styles.item} onPress={handleLoginLogout}>
            <Ionicons name="log-out-outline" size={22} style={styles.icon} />
            <Text style={styles.label}>{isLoggedIn ? '로그아웃' : '로그인'}</Text>
            <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
          </Pressable>

          {isLoggedIn && (
            <Pressable
              style={[styles.item, styles.withdrawItem]}
              onPress={handleWithdraw}
              disabled={withdrawing}
            >
              {withdrawing ? (
                <ActivityIndicator size="small" color="#DC2626" style={styles.withdrawSpinner} />
              ) : (
                <Ionicons name="trash-outline" size={22} style={styles.withdrawIcon} />
              )}
              <Text style={styles.withdrawLabel}>계정 탈퇴 및 데이터 삭제</Text>
              <Ionicons name="chevron-forward" size={18} style={styles.arrow} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    paddingLeft: 4,
    paddingRight: 10,
  },
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
  withdrawItem: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  withdrawIcon: {
    marginRight: 12,
    color: '#DC2626',
  },
  withdrawSpinner: {
    marginRight: 12,
  },
  withdrawLabel: {
    flex: 1,
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '500',
  },
});
