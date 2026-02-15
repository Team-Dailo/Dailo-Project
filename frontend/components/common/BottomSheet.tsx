// frontend/components/common/BottomSheet.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  SafeAreaView,
} from 'react-native';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.bottomSheetContainer}>
          <SafeAreaView style={styles.sheetInner}>{children}</SafeAreaView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bottomSheetContainer: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#ffffff',
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  sheetInner: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
