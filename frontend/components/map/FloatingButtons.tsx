import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onPressDirection?: () => void;
  onPressBookmarkList?: () => void;
  onPressCurrentLocation?: () => void;
};

export function FloatingButtons({
  onPressDirection,
  onPressBookmarkList,
  onPressCurrentLocation,
}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onPressDirection}>
        <Ionicons name="navigate-outline" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onPressBookmarkList}>
        <Ionicons name="bookmark-outline" size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onPressCurrentLocation}>
        <Ionicons name="locate-outline" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: 140,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
});
