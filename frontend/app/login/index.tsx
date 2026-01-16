// app/login/index.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>로그인</Text>
      <Text style={styles.text}>이메일/비밀번호 또는 소셜 로그인 UI가 들어올 자리입니다.</Text>
    </View>
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#444444',
  },
});
