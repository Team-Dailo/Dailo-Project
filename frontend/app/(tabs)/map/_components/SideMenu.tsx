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
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../hooks/useAuth';
import { API_BASE_URL } from '../../../../constants/api';

const DEFAULT_PROFILE_IMAGE = require('../../../../assets/images/default-profile.png');
import type { FestivalParticipation } from '../../../../services/festivalParticipationStorage';

type Props = {
  visible: boolean;
  festivalEntry: FestivalParticipation | null;
  festivalElapsed: string;
  festivalIsCompleted?: boolean;
  onClose: () => void;
  onPressActiveFestival: () => void;
  onPressSavedFestivals: () => void;
  onPressMyActivities: () => void;
  onPressDirection: () => void;
  onPressSettings: () => void;
  onPressGuide?: () => void;
  /** 현재 위치·행사 새로고침 후 구역 여부 바로 알림 */
  onPressRefreshLocationAndCheck?: () => void;
};

const DRAWER_WIDTH = 300;
const CONTENT_PADDING_H = 16;
const TOP_MARGIN = 14;

export function SideMenu({
  visible,
  festivalEntry,
  festivalElapsed,
  festivalIsCompleted = false,
  onClose,
  onPressActiveFestival,
  onPressSavedFestivals,
  onPressMyActivities,
  onPressDirection,
  onPressSettings,
  onPressGuide,
  onPressRefreshLocationAndCheck,
}: Props) {
  const { user, isLoggedIn, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  const handleLogin = () => {
    onClose();
    router.push('/login');
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX }],
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {/* 1) 전체 배경 흰색 - drawer 배경이 흰색 */}

            {/* 2) 상단 프로필 카드 */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View style={styles.avatar}>
                  {isLoggedIn && user?.profileImageUrl ? (
                    <Image
                      source={{
                        uri: user.profileImageUrl.startsWith('/')
                          ? `${API_BASE_URL}${user.profileImageUrl}`
                          : user.profileImageUrl,
                      }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarImage}>
                      <Image source={DEFAULT_PROFILE_IMAGE} style={[styles.avatarImage, styles.defaultProfileImageZoom]} resizeMode="cover" />
                    </View>
                  )}
                </View>
                <View style={styles.profileText}>
                  <Text style={styles.profileName}>
                    {isLoggedIn && user ? `${user.name} 님` : '게스트 님'}
                  </Text>
                  <Text style={styles.profileSub}>
                    {isLoggedIn
                      ? '즐거운 시간 보내세요!'
                      : '로그인이 필요합니다'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3) 참여 중인 축제 카드 (로그인 + 진입 중일 때만) */}
            {isLoggedIn && festivalEntry != null && (
              <TouchableOpacity
                style={styles.festivalCard}
                activeOpacity={0.9}
                onPress={() => {
                  onClose();
                  onPressActiveFestival();
                }}
              >
                <View style={styles.festivalTagRow}>
                  <Ionicons name="flag-outline" size={12} color="#1D4ED8" />
                  <Text style={styles.festivalTag}>
                    {festivalIsCompleted ? '축제 참여 완료' : '축제 참여중'}
                  </Text>
                </View>
                <Text style={styles.festivalName}>{festivalEntry.eventTitle}</Text>
                <Text style={styles.festivalTimer}>{festivalElapsed}</Text>
              </TouchableOpacity>
            )}

            {/* 4) 섹션 타이틀 MY FESTIVAL (로그인 시에만) */}
            {isLoggedIn && (
              <>
                <Text style={styles.sectionTitle}>MY FESTIVAL</Text>

                {/* 5) 메뉴 리스트 3개 */}
                <MenuRow
                  icon="bookmark-outline"
                  label="저장한 축제"
                  iconColor="#EAB308"
                  circleBg="#FEF3C7"
                  onPress={() => {
                    onClose();
                    onPressSavedFestivals();
                  }}
                />
                <MenuRow
                  icon="gift-outline"
                  label="내 활동 기록"
                  iconColor="#DB2777"
                  circleBg="#FCE7F3"
                  onPress={() => {
                    onClose();
                    onPressMyActivities();
                  }}
                />
                <MenuRow
                  icon="navigate-outline"
                  label="축제 길찾기"
                  iconColor="#059669"
                  circleBg="#D1FAE5"
                  onPress={() => {
                    onClose();
                    onPressDirection();
                  }}
                />
              </>
            )}

            {/* 6) 섹션 타이틀 SERVICE */}
            <Text style={[styles.sectionTitle, isLoggedIn && styles.serviceTitle]}>
              SERVICE
            </Text>

            {/* 행사 새로고침 — 주석 처리 (복구 시 아래 MenuRow 주석 해제)
            <MenuRow icon="refresh-outline" label="행사 새로고침" iconColor="#4C8BF5" circleBg="#DBEAFE" onPress={() => { onClose(); onPressRefreshLocationAndCheck?.(); }} />
            */}

            {/* 7) 서비스 메뉴 리스트 3개 */}
            <MenuRow
              icon="notifications-outline"
              label="공지사항"
              gray
              onPress={() => {
                onClose();
                router.push('/board/notice');
              }}
            />
            <MenuRow
              icon="information-circle-outline"
              label="이용 안내"
              gray
              onPress={() => {
                onClose();
                if (onPressGuide) onPressGuide();
                else router.push({ pathname: '/(tabs)/mypage/guide', params: { from: 'map' } });
              }}
            />
            <MenuRow
              icon="settings-outline"
              label="앱 설정"
              gray
              onPress={() => {
                onClose();
                onPressSettings();
              }}
            />

            <View style={styles.scrollBottom} />
          </ScrollView>

          {/* 8) 맨 아래 로그인/로그아웃 버튼 (고정, 하단 시스템 영역과 겹치지 않도록 Safe Area 반영) */}
          <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              onPress={isLoggedIn ? handleLogout : handleLogin}
            >
              <Text style={styles.logoutButtonText}>
                {isLoggedIn ? '로그아웃' : '로그인'}
              </Text>
              <Ionicons
                name={isLoggedIn ? 'log-out-outline' : 'log-in-outline'}
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </Animated.View>

        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

/** 메뉴 한 줄: 원형 아이콘(또는 회색) + 텍스트 + chevron */
type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
  circleBg?: string;
  gray?: boolean;
};

function MenuRow({
  icon,
  label,
  onPress,
  iconColor,
  circleBg,
  gray,
}: MenuRowProps) {
  const isColored = !gray && iconColor != null && circleBg != null;
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.menuRowIconWrap,
          isColored && { backgroundColor: circleBg },
          gray && styles.menuRowIconWrapGray,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={isColored ? iconColor! : '#6b7280'}
        />
      </View>
      <Text style={styles.menuRowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#111111" />
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
    flex: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: CONTENT_PADDING_H,
    paddingBottom: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // 2) 상단 프로필 영역 (가로 3 : 세로 1 비율로 세로 키움)
  profileCard: {
    marginTop: 0,
    marginHorizontal: -CONTENT_PADDING_H,
    backgroundColor: '#F2F4F7',
    borderRadius: 0,
    paddingHorizontal: CONTENT_PADDING_H,
    paddingVertical: 22,
    minHeight: 92,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
  },
  defaultProfileImageZoom: {
    position: "absolute",
    transform: [{ scale: 1.35 }],
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  profileSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  // 3) 참여 중인 축제 카드
  festivalCard: {
    marginTop: 14,
    backgroundColor: '#EAF4FF',
    borderRadius: 18,
    padding: 12,
  },
  festivalTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  festivalTag: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  festivalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  festivalTimer: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },

  // 4, 6) 섹션 타이틀
  sectionTitle: {
    marginTop: 20,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#9AA0A6',
    letterSpacing: 0.8,
  },
  serviceTitle: {
    marginTop: 24,
  },

  // 5, 7) 메뉴 Row (폰트·아이콘 크기 조정)
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingVertical: 0,
  },
  menuRowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuRowIconWrapGray: {
    backgroundColor: '#F2F4F7',
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 14,
    color: '#222222',
  },

  // 8) 맨 아래 고정 푸터 + 로그인/로그아웃 버튼
  footer: {
    paddingHorizontal: CONTENT_PADDING_H,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#4C8BF5',
  },
  logoutButtonPressed: {
    opacity: 0.9,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  scrollBottom: {
    height: 16,
  },
});
