// app/board/write.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PostWriteScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>게시글 작성</Text>
      <Text style={styles.text}>제목, 내용, 카테고리 등을 입력하는 폼이 들어올 자리입니다.</Text>
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
