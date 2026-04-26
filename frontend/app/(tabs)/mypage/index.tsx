// app/(tabs)/mypage/index.tsx
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../hooks/useAuth";
import { useFestivalParticipation } from "../../../hooks/useFestivalParticipation";
import { API_BASE_URL } from "../../../constants/api";
import FestivalSurveyModal from "../../../components/FestivalSurveyModal";
import { checkSurveySubmitted } from "../../../services/survey.service";

export default function MyPageScreen() {
  const { user, isLoggedIn, logout, refreshUser } = useAuth();
  const { entry: festivalEntry, elapsedFormatted: festivalElapsed, isCompleted: festivalIsCompleted } = useFestivalParticipation();
  const [profileImageError, setProfileImageError] = useState(false);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setProfileImageError(false);
      refreshUser();
      if (isLoggedIn && festivalIsCompleted && festivalEntry) {
        checkSurveySubmitted(festivalEntry.eventId).then((submitted) => {
          setSurveySubmitted(submitted);
        });
      }
    }, [refreshUser, isLoggedIn, festivalIsCompleted, festivalEntry])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>마이페이지</Text>

          <Pressable
            hitSlop={8}
            onPress={() => router.push("/(tabs)/mypage/settings")}
          >
            <Ionicons name="settings-outline" size={22} color="#111827" />
          </Pressable>
        </View>

        {/* 프로필 카드: 로그인 / 비로그인 분기 */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            {(() => {
              const defaultProfile = require("../../../assets/images/default-profile.png");
              const profileUrl = user?.profileImageUrl?.trim();
              if (!isLoggedIn || !profileUrl || profileImageError) {
                return (
                  <View style={styles.avatar}>
                    <Image source={defaultProfile} style={[styles.avatar, styles.defaultProfileImageZoom]} resizeMode="cover" />
                  </View>
                );
              }
              const baseUri = profileUrl.startsWith("http") ? profileUrl : profileUrl.startsWith("/") ? `${API_BASE_URL}${profileUrl}` : profileUrl;
              const version = user?.profileImageVersion ?? 0;
              const finalUri = baseUri.startsWith("http")
                ? baseUri
                : `${baseUri}${baseUri.includes("?") ? "&" : "?"}v=${version}`;
              return (
                <Image
                  key={finalUri}
                  source={{ uri: finalUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                  onError={() => setProfileImageError(true)}
                />
              );
            })()}
            <View style={styles.profileText}>
              <Text style={styles.nickname}>
                {isLoggedIn && user ? `${user.name}님` : "게스트"}
              </Text>
              <Text style={styles.userId}>
                {isLoggedIn
                  ? "즐거운 축제 되세요!"
                  : "로그인을 해주세요"}
              </Text>
            </View>
          </View>

          <Pressable
            style={isLoggedIn ? styles.profileButton : styles.loginButton}
            onPress={() =>
              isLoggedIn ? router.push("/profile") : router.push("/login")
            }
          >
            <Text
              style={
                isLoggedIn
                  ? styles.profileButtonText
                  : styles.loginButtonText
              }
            >
              {isLoggedIn ? "프로필 보기" : "로그인"}
            </Text>
          </Pressable>
        </View>

        {/* 참여 중인 축제 카드: 로그인 + 지도에서 축제 구역 진입 중일 때만 표시 */}
        {isLoggedIn && festivalEntry != null && (
          <View style={styles.activeFestivalCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, festivalIsCompleted && styles.badgeCompleted]}>
                <Text style={styles.badgeText}>
                  {festivalIsCompleted ? '축제 참여 완료' : '축제 참여중'}
                </Text>
              </View>
              <Text style={styles.timerText}>{festivalElapsed}</Text>
            </View>
            <Text style={styles.activeFestivalTitle}>{festivalEntry.eventTitle}</Text>
            <Text style={styles.activeFestivalHint}>지도에서 해당 축제 구역에 있을 때만 표시됩니다.</Text>
            {festivalIsCompleted && !surveySubmitted && (
              <Pressable style={styles.surveyBtn} onPress={() => setSurveyModalVisible(true)}>
                <Ionicons name="gift-outline" size={15} color="#7C3AED" />
                <Text style={styles.surveyBtnText}>설문 참여하고 선물 받기</Text>
              </Pressable>
            )}
            {festivalIsCompleted && surveySubmitted && (
              <View style={styles.surveyDone}>
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                <Text style={styles.surveyDoneText}>설문 완료</Text>
              </View>
            )}
          </View>
        )}
        {festivalEntry && (
          <FestivalSurveyModal
            visible={surveyModalVisible}
            eventId={festivalEntry.eventId}
            eventTitle={festivalEntry.eventTitle ?? ''}
            onClose={() => setSurveyModalVisible(false)}
            onSubmitted={() => { setSurveyModalVisible(false); setSurveySubmitted(true); }}
          />
        )}

        {/* 섹션: 축제 기록 */}
        <Section title="축제 기록">
          <MenuItem
            icon="calendar-outline"
            label="참여한 축제"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/participated-festivals")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="bookmark-outline"
            label="저장한 축제"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/saved-festivals")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="heart-outline"
            label="좋아요 누른 축제"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/liked-festivals")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="storefront-outline"
            label="부스 즐겨찾기"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/saved-booths")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="notifications-outline"
            label="알림 예약한 축제"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/saved-reminders")
                : router.push("/login")
            }
          />
        </Section>

        {/* 섹션: 게시물 기록 */}
        <Section title="게시물 기록">
          <MenuItem
            icon="document-text-outline"
            label="내가 쓴 게시글"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/board-history")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="내가 쓴 댓글"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/board-commented")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="bookmark-outline"
            label="저장한 게시글"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/saved-posts")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="heart-outline"
            label="좋아요 누른 게시글"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/liked-posts")
                : router.push("/login")
            }
          />
        </Section>

        {/* 섹션: 신고·차단 */}
        <Section title="신고·차단">
          {/* 신고 모아놓는 곳(내 신고 목록) 비노출 처리
          <MenuItem
            icon="flag-outline"
            label="내 신고 목록"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/my-reports")
                : router.push("/login")
            }
          />
          */}
          <MenuItem
            icon="ban-outline"
            label="차단 기록"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/block-list")
                : router.push("/login")
            }
          />
        </Section>

        {/* 섹션: 관리자 (ADMIN 또는 FESTIVAL_ADMIN) */}
        {isLoggedIn && (user?.role === "ADMIN" || user?.role === "FESTIVAL_ADMIN") && (
          <Section title={user?.role === "ADMIN" ? "관리자" : "축제 관리자"}>
            <MenuItem
              icon="shield-checkmark-outline"
              label={user?.role === "ADMIN" ? "관리자 메뉴" : "축제 관리 메뉴"}
              onPress={() =>
                router.push(
                  user?.role === "ADMIN"
                    ? "/(tabs)/mypage/admin"
                    : "/(tabs)/mypage/festival-admin"
                )
              }
            />
          </Section>
        )}

        {/* 로그인 시 로그아웃 버튼 */}
        {isLoggedIn && (
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </Pressable>
        )}

        {/* 아래 공간 여유 */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 공통 Section 컴포넌트 */
type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** 공통 메뉴 아이템 컴포넌트 */
type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Ionicons name={icon} size={20} color="#4B5563" />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </Pressable>
  );
}

/** 스타일 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  profileCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  /** 기본 프로필 이미지 내부 원이 바깥 원을 꽉 채우도록 확대 */
  defaultProfileImageZoom: {
    position: "absolute",
    transform: [{ scale: 1.35 }],
  },
  profileText: {
    justifyContent: "center",
  },
  nickname: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  userId: {
    fontSize: 13,
    color: "#6B7280",
  },
  profileButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileButtonText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#4C8BF5",
  },
  loginButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#4C8BF5",
  },
  logoutButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  activeFestivalCard: {
    marginTop: 4,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#EEF4FF",
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
  },
  badgeText: {
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "600",
  },
  timerText: {
    fontSize: 12,
    color: "#6B7280",
  },
  activeFestivalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
  },
  activeFestivalHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  badgeCompleted: {
    backgroundColor: "#D1FAE5",
  },
  surveyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#EDE9FE",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  surveyBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  surveyDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  surveyDoneText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },

  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuLabel: {
    fontSize: 15,
    color: "#111827",
  },
});
