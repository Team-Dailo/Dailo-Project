// app/board/chat.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BoardChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>게시판 채팅</Text>
      <Text style={styles.text}>실시간 채팅(또는 DM) UI가 들어올 자리입니다.</Text>
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
