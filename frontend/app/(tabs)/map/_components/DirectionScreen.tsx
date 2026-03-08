// app/(tabs)/map/_components/DirectionScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { Event } from '../../../../types/event';

type Props = {
  visible: boolean;
  event: Event | null;
  /** 출발지(현재 위치). 있으면 네이버 지도 길찾기 시 출발지로 지정 */
  startLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
};

export function DirectionScreen({ visible, event, startLocation, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!event) return null;

  // 길찾기 목적지: "주소명"을 최우선으로 사용 (장소명/제목은 지도의 카드 UI에서만 사용)
  const address = (event.address ?? '').trim();
  const destination = address; // 길찾기용 목적지 문자열은 주소로 한정
  const hasCoords = event.latitude != null && event.longitude != null;

  const openInMaps = () => {
    // 기본 지도 앱에는 "주소명"을 목적지로 전달.
    // 주소가 없다면 최후의 수단으로만 좌표 문자열 사용.
    const label =
      address.length > 0
        ? address
        : `${event.latitude},${event.longitude}`;

    if (hasCoords) {
      const encodedLabel = encodeURIComponent(label);
      const lat = String(event.latitude);
      const lng = String(event.longitude);

      const url =
        Platform.OS === 'ios'
          // Apple 지도: 목적지는 한글 주소/장소명으로, 좌표는 ll 파라미터로 전달
          ? `http://maps.apple.com/?q=${encodedLabel}&ll=${lat},${lng}`
          : Platform.OS === 'android'
            // Android 기본 지도: geo 스킴에 좌표 + 사람이 읽을 수 있는 한글 주소 라벨 전달
            ? `geo:${lat},${lng}?q=${encodedLabel}`
            // 그 외(웹 등): Google Maps 검색에 한글 주소를 우선 전달
            : `https://www.google.com/maps/search/?api=1&query=${encodedLabel}`;

      Linking.openURL(url).catch(() => {
        const fallbackQuery = encodeURIComponent(label);
        Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`
        ).catch(() => {});
      });
    } else {
      const query = encodeURIComponent(label);
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${query}`
      ).catch(() => {});
    }
  };

  /** 네이버 지도 웹: 목적지 검색 (브라우저/크롬에서 화면이 뜨도록 https 사용, 앱 미설치 시 대체) */
  const openNaverMapWeb = () => {
    const query = encodeURIComponent(destination);
    Linking.openURL(`https://map.naver.com/v5/search/${query}`).catch(() => {});
  };

  /** 네이버 지도 앱 길찾기 (nmap 스킴). 실패 시 웹으로 열어서 크롬 빈 화면 방지 */
  const openInNaverMap = () => {
    if (!hasCoords) {
      openNaverMapWeb();
      return;
    }
    const appname = 'com.knut.dailo';
    const dname = encodeURIComponent(destination);
    const params = new URLSearchParams({
      dlat: String(event.latitude!),
      dlng: String(event.longitude!),
      dname,
      appname,
    });
    if (startLocation?.latitude != null && startLocation?.longitude != null) {
      params.set('slat', String(startLocation.latitude));
      params.set('slng', String(startLocation.longitude));
      params.set('sname', '현재 위치');
    }
    const nmapUrl = `nmap://route/car?${params.toString()}`;

    // 웹/WebView에서는 nmap 스킴이 크롬에서 빈 화면이 뜨므로 바로 웹 URL 사용
    if (Platform.OS === 'web') {
      openNaverMapWeb();
      return;
    }

    Linking.openURL(nmapUrl).catch(openNaverMapWeb);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* 헤더: 뒤로가기 + 제목 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>길찾기</Text>
          <View style={styles.backButton} />
        </View>

        {/* 목적지 정보 */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="location" size={20} color="#22C55E" />
            <Text style={styles.placeName}>{event.placeName || event.title}</Text>
          </View>
          {event.address ? (
            <Text style={styles.address}>{event.address}</Text>
          ) : null}
        </View>

        {/* 네이버 지도로 열기 */}
        <TouchableOpacity
          style={[styles.primaryButton, styles.naverButton]}
          onPress={openInNaverMap}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>네이버 지도 길찾기</Text>
        </TouchableOpacity>

        {/* 기본 지도 앱으로 열기 */}
        <TouchableOpacity
          style={[styles.primaryButton, styles.secondaryButton]}
          onPress={openInMaps}
          activeOpacity={0.85}
        >
          <Ionicons name="map-outline" size={22} color="#374151" />
          <Text style={styles.secondaryButtonText}>기본 지도 앱으로 열기</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          네이버 지도 또는 기본 지도 앱에서 목적지로 경로를 확인할 수 있습니다.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  address: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 28,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4C8BF5',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  naverButton: {
    backgroundColor: '#03C75A',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    marginTop: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
});
