import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import type { Event } from '../../../../types/event';
import { BottomSheet } from '../../../../components/common/BottomSheet';

type Props = {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
};

export function MapBottomSheet({ visible, event, onClose }: Props) {
  const router = useRouter();

  if (!event) return null;

  const handlePressDetail = () => {
    router.push(`/event/${event.id}`);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.category}>공연</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {event.startAt} ~ {event.endAt}
        </Text>
        <Text style={styles.meta}>{event.address}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.outlineBtn]}>
            <Text>길찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.fillBtn]}
            onPress={handlePressDetail}
          >
            <Text style={styles.fillBtnText}>상세보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  category: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  meta: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 8,
  },
  fillBtn: {
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  fillBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
