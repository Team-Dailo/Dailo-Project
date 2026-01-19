// app/+not-found.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지를 찾을 수 없음' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.text}>요청하신 페이지를 찾을 수 없습니다.</Text>
        <Link href="/(tabs)/home" style={styles.link}>
          홈으로 돌아가기
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 16,
  },
  link: {
    fontSize: 14,
    color: '#2F80ED',
  },
});
