import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

// 게시판의 각 게시물을 보여주는 카드 컴포넌트
export const BoardCard = ({ id, user, content }: any) => {
  const router = useRouter();

  return (
    <TouchableOpacity 
      onPress={() => router.push(`/board/${id}`)} // 상세 페이지로 이동
      style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee' }}
    >
      <Text style={{ fontWeight: 'bold' }}>{user}</Text>
      <Text numberOfLines={2} style={{ marginTop: 5 }}>{content}</Text>
    </TouchableOpacity>
  );
};