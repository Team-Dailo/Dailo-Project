// app/(tabs)/mypage/contact.tsx - 문의하기
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_EMAIL = 'support@dailo.app';

export default function ContactScreen() {
  const sendEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert('안내', '메일 앱을 열 수 없습니다.');
    });
  };

  const openNotice = () => {
    router.push('/board/notice');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '문의하기',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            서비스 이용 중 궁금한 점이나 불편 사항이 있으면 아래 방법으로 문의해 주세요.
          </Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={sendEmail}>
              <Ionicons name="mail-outline" size={22} color="#6B7280" />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>이메일 문의</Text>
                <Text style={styles.rowValue}>{SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
            <Pressable style={[styles.row, styles.rowBorder]} onPress={openNotice}>
              <Ionicons name="newspaper-outline" size={22} color="#6B7280" />
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>공지사항</Text>
                <Text style={styles.rowValue}>서비스 공지 및 점검 안내</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </View>
        </ScrollView>
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
    lineHeight: 20,
    marginBottom: 16,
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
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowValue: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
