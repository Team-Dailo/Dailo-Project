// app/(tabs)/mypage/index.tsx
import React from "react";
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

export default function MyPageScreen() {
  const { user, isLoggedIn, logout, refreshUser } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
    }, [refreshUser])
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
            <Image
              source={{
                uri: "https://via.placeholder.com/64x64.png?text=🐶",
              }}
              style={styles.avatar}
            />
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

        {/* 참여 중인 축제 카드: 로그인 시에만 표시 */}
        {isLoggedIn && (
          <View style={styles.activeFestivalCard}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>참여 중인 축제</Text>
              </View>
              <Text style={styles.timerText}>00:16:13</Text>
            </View>
            <Text style={styles.activeFestivalTitle}>한국교통대 대동제</Text>
          </View>
        )}

        {/* 섹션: 활동 기록 (비로그인 시 로그인 화면으로) */}
        <Section title="활동 기록">
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
            icon="flag-outline"
            label="체류 미션 기록"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/stay-mission-history")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="게시판 기록"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/board-history")
                : router.push("/login")
            }
          />
        </Section>

        {/* 섹션: 쿠폰 & 추첨권 */}
        <Section title="쿠폰&추첨권">
          <MenuItem
            icon="ticket-outline"
            label="체류 이벤트 쿠폰 리스트"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/stay-coupon-list")
                : router.push("/login")
            }
          />
          <MenuItem
            icon="gift-outline"
            label="추첨권 리스트"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/lottery-ticket-list")
                : router.push("/login")
            }
          />
        </Section>

        {/* 섹션: 즐겨찾기 */}
        <Section title="즐겨찾기">
          <MenuItem
            icon="star-outline"
            label="저장한 축제"
            onPress={() =>
              isLoggedIn
                ? router.push("/(tabs)/mypage/saved-festivals")
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
        </Section>

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
    backgroundColor: "#F3F4F6",
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
    backgroundColor: "#2563EB",
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
    backgroundColor: "#2563EB",
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
