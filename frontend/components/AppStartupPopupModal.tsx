import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getActivePopups, PopupItem } from '../services/popup.service';

const DISMISS_KEY = 'popup_dismissed_date';
const { width: SCREEN_W } = Dimensions.get('window');

export default function AppStartupPopupModal() {
  const router = useRouter();
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadPopups();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (popups.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((i) => (i + 1) % popups.length);
      }, 3000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [popups]);

  async function loadPopups() {
    try {
      const dismissedDate = await AsyncStorage.getItem(DISMISS_KEY);
      const today = new Date().toDateString();
      if (dismissedDate === today) return;
      const items = await getActivePopups();
      if (items.length > 0) {
        setPopups(items);
        setVisible(true);
      }
    } catch {
      // 팝업 로드 실패는 조용히 무시
    }
  }

  function handleClose() {
    setVisible(false);
  }

  async function handleDismissToday() {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(DISMISS_KEY, today);
    setVisible(false);
  }

  function handleImagePress() {
    const url = popups[currentIndex]?.linkUrl;
    if (!url) return;
    setVisible(false);
    if (url.startsWith('/') || url.startsWith('/(')) {
      // 앱 내부 경로 (/event/123 등)
      router.push(url as any);
    } else {
      Linking.openURL(url).catch(() => {});
    }
  }

  if (!visible || popups.length === 0) return null;

  const current = popups[currentIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Pressable onPress={handleImagePress} style={styles.imageWrapper}>
            <Image
              source={{ uri: current.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>

          {/* 하단 바: 자세한 내용 확인 or 페이지 인디케이터 */}
          {current.linkUrl ? (
            <Pressable style={styles.linkBar} onPress={handleImagePress}>
              <Text style={styles.linkBarText}>자세한 내용 확인하기 &gt;</Text>
              {popups.length > 1 && (
                <Text style={styles.indicator}>
                  {currentIndex + 1}/{popups.length}
                </Text>
              )}
            </Pressable>
          ) : popups.length > 1 ? (
            <View style={styles.linkBar}>
              <Text style={styles.indicator}>
                {currentIndex + 1}/{popups.length}
              </Text>
            </View>
          ) : null}

          {/* 하단 버튼 */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.dismissBtn} onPress={handleDismissToday}>
              <Text style={styles.dismissText}>오늘 그만 보기</Text>
            </Pressable>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const POPUP_W = Math.min(SCREEN_W - 48, 400);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: POPUP_W,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  linkBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
  },
  linkBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  indicator: {
    fontSize: 13,
    color: '#CCCCCC',
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  dismissText: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
