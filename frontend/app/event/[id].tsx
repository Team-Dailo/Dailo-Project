// app/event/[id].tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>행사 상세 보기</Text>
      <Text style={styles.text}>이 화면에는 행사 상세 UI(소식/타임테이블/축제부스)가 들어갑니다.</Text>
      <Text style={styles.text}>현재 선택된 행사 ID: {id}</Text>
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
    marginBottom: 4,
  },
});
