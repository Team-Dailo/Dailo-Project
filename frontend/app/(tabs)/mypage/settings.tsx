// app/(tabs)/mypage/settings.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';

export default function MyPageSettingsScreen() {
  const { isLoggedIn, logout } = useAuth();

  const handleLoginLogout = () => {
    if (isLoggedIn) {
      Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: () => { logout(); router.back(); } },
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
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
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
});
