// frontend/app/event/[id].tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View>
      <Text>Event Detail Screen</Text>
      <Text>id: {id}</Text>
    </View>
  );
}
