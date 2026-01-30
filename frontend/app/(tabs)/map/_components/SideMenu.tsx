// app/(tabs)/map/_components/SideMenu.tsx
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;

  /** 🔹 파란 "참여 중인 축제" 카드 눌렀을 때 */
  onPressActiveFestival: () => void;

  /** ✅ 마이페이지 연결 */
  onPressSavedFestivals: () => void; // 저장한 축제
  onPressMyActivities: () => void;   // 내 활동 기록
  onPressSettings: () => void;       // 앱 설정
};

const DRAWER_WIDTH = 280;

export function SideMenu({
  visible,
  onClose,
  onPressActiveFestival,
  onPressSavedFestivals,
  onPressMyActivities,
  onPressSettings,
}: Props) {
  const isLoggedIn = false; // TODO: 나중에 실제 로그인 상태 연동

  // 왼쪽에서 슬라이드 인/아웃
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 왼쪽에 드로어 */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {/* 프로필 영역 */}
          {isLoggedIn ? (
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={24} color="#2563eb" />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>여행객 님</Text>
                <Text style={styles.profileSub}>즐거운 시간 보내세요!</Text>
              </View>
            </View>
          ) : (
            <View style={styles.profile}>
              <View style={styles.avatar}>
                <Ionicons name="person-outline" size={24} color="#9ca3af" />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>게스트 님</Text>
                <Text style={styles.profileSub}>로그인이 필요합니다</Text>
              </View>
              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>로그인</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 🔹 참여 중인 축제 카드 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>참여 중인 축제</Text>
            <TouchableOpacity
              style={styles.currentFestivalCard}
              activeOpacity={0.9}
              onPress={() => {
                onClose();            // ✅ 사이드메뉴 닫고
                onPressActiveFestival(); // ✅ 기존 동작 실행
              }}
            >
              <Text style={styles.festivalBadge}>참여 중인 축제</Text>
              <Text style={styles.festivalTitle}>한국교통대 대동제</Text>
              <Text style={styles.festivalTimer}>00:16:13</Text>
            </TouchableOpacity>
          </View>

          {/* MY FESTIVAL */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MY FESTIVAL</Text>

            <MenuItem
              label="저장한 축제"
              icon="star-outline"
              onPress={() => {
                onClose();
                onPressSavedFestivals();
              }}
            />

            <MenuItem
              label="내 활동 기록"
              icon="time-outline"
              onPress={() => {
                onClose();
                onPressMyActivities();
              }}
            />

            <MenuItem
              label="축제 길찾기"
              icon="navigate-outline"
              onPress={onClose} // TODO: 길찾기 화면 생기면 라우팅 연결
            />
          </View>

          {/* SERVICE */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SERVICE</Text>

            <MenuItem
              label="공지사항"
              icon="notifications-outline"
              onPress={onClose} // TODO: 공지사항 화면 연결
            />

            <MenuItem
              label="이용 안내"
              icon="help-circle-outline"
              onPress={onClose} // TODO: 이용안내 화면 연결
            />

            <MenuItem
              label="앱 설정"
              icon="settings-outline"
              onPress={() => {
                onClose();
                onPressSettings();
              }}
            />
          </View>

          {/* 하단 로그아웃 */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.footerButton} onPress={onClose}>
              <Ionicons name="log-out-outline" size={18} color="#6b7280" />
              <Text style={styles.footerButtonText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* 오른쪽 반투명 백드롭 */}
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

type MenuItemProps = {
  label: string;
  icon: string;
  onPress: () => void;
};

function MenuItem({ label, icon, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon as any} size={18} color="#4b5563" />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  profileSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  loginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  loginButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  currentFestivalCard: {
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    padding: 12,
  },
  festivalBadge: {
    fontSize: 11,
    color: '#2563eb',
    marginBottom: 4,
  },
  festivalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  festivalTimer: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerButtonText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6b7280',
  },
});
