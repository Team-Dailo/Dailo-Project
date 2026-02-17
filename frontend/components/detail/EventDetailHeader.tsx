// frontend/components/detail/EventDetailHeader.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Share,
  Platform,
  ToastAndroid,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { EventDetail } from "../../types/event";
import * as logService from "../../services/log.service";
import * as eventReminder from "../../services/eventReminder.service";

const DEFAULT_POSTER_URI =
  "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800";

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = d.getDate();
    const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const w = weekdays[d.getDay()];
    return `${y}.${m}.${day} ${w}`;
  } catch {
    return "";
  }
}

function formatEventTimeRange(startIso: string, endIso?: string | null): string {
  try {
    const s = new Date(startIso);
    const start = `${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
    if (endIso) {
      const e = new Date(endIso);
      const end = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
      return `${start} ~ ${end}`;
    }
    return `${start} ~`;
  } catch {
    return "";
  }
}

interface Props {
  id?: string;
  event?: EventDetail | null;
  loading?: boolean;
  error?: Error | null;
  onShare?: () => void;
  onSave?: () => void;
  /** 좋아요 (하트) - 선택 */
  isLiked?: boolean;
  onLike?: () => void;
  /** 로그인 여부 - 알림 아이콘은 로그인 시에만 동작 */
  isLoggedIn?: boolean;
}

export default function EventDetailHeader({ id, event, loading, error, onShare, onSave, isLiked = false, onLike, isLoggedIn = false }: Props) {
  const router = useRouter();
  const posterUri = event?.posterUrls?.[0] ?? DEFAULT_POSTER_URI;
  const [clickCount, setClickCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !event) return;
    const eventIdNum = Number(id);
    if (!Number.isFinite(eventIdNum)) return;
    logService.getEventClickCount(eventIdNum).then(setClickCount).catch(() => {});
  }, [id, event]);

  const defaultShare = async () => {
    try {
      const url = event?.naverMapUrl ?? `https://dailo.app/event/${id ?? ""}`;
      await Share.share({
        message: url,
        url,
        title: event?.title ?? "축제 공유하기",
      });
    } catch (e) {
      console.log(e);
    }
  };

  const defaultSave = () => {
    if (Platform.OS === "android") {
      ToastAndroid.show("저장되었습니다", ToastAndroid.SHORT);
    } else {
      Alert.alert("저장되었습니다");
    }
  };

  const handlePressShare = () => {
    if (onShare) return onShare();
    return defaultShare();
  };

  const handlePressSave = () => {
    if (onSave) return onSave();
    return defaultSave();
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.infoCard}>
          <Text style={styles.errorText}>이벤트를 불러올 수 없습니다.</Text>
          <Text style={styles.errorSub}>{error.message}</Text>
        </View>
      </View>
    );
  }

  if (loading || !event) {
    return (
      <View style={styles.container}>
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
        <View style={styles.iconRow}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>
    );
  }

  const dateStr = formatEventDate(event.startAt);
  const timeStr = formatEventTimeRange(event.startAt, event.endAt);
  const placeStr = event.placeName?.trim() || "장소 미정";
  const organizerStr = event.hostContact?.trim() || "—";

  const openMap = () => {
    const url = event.naverMapUrl;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleAlarmPress = () => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "행사 알림은 로그인 후 이용할 수 있어요.");
      return;
    }
    Alert.alert(
      "행사 알림",
      "언제 알림을 받을까요?",
      [
        {
          text: "3일 전 알림",
          onPress: async () => {
            const id = await eventReminder.scheduleEventReminder(
              String(event.id),
              event.title,
              event.startAt,
              3
            );
            if (id) Alert.alert("알림 설정", "3일 전에 알림을 보내드립니다.");
            else Alert.alert("알림 실패", "알림 권한을 허용해 주세요.");
          },
        },
        {
          text: "1일 전 알림",
          onPress: async () => {
            const id = await eventReminder.scheduleEventReminder(
              String(event.id),
              event.title,
              event.startAt,
              1
            );
            if (id) Alert.alert("알림 설정", "1일 전에 알림을 보내드립니다.");
            else Alert.alert("알림 실패", "알림 권한을 허용해 주세요.");
          },
        },
        { text: "취소", style: "cancel" },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />

      <View style={styles.iconRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        <View style={styles.rightGroup}>
          {onLike ? (
            <Pressable onPress={onLike} style={styles.iconButton} hitSlop={10}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#EF4444" : "#111827"}
              />
            </Pressable>
          ) : null}
          <Pressable onPress={handlePressShare} style={styles.iconButton} hitSlop={10}>
            <Ionicons name="share-outline" size={22} color="#111827" />
          </Pressable>
          <Pressable onPress={handlePressSave} style={styles.iconButton} hitSlop={10}>
            <Ionicons name="bookmark-outline" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        {dateStr ? <Text style={styles.dateText}>{dateStr}</Text> : null}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{event.title}</Text>
          <Pressable onPress={handleAlarmPress} style={styles.alarmButton} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
          </Pressable>
        </View>

        {/* 시간 · 장소 · 주최자 (아이콘 + 한 줄씩) */}
        <View style={styles.infoBlock}>
          {timeStr ? (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText}>{timeStr}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>{placeStr}</Text>
            {event.naverMapUrl ? (
              <Pressable onPress={openMap} style={styles.mapButton} hitSlop={8}>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>{organizerStr}</Text>
          </View>
        </View>

        {clickCount != null ? (
          <Text style={styles.clickCount}>조회수 {clickCount}</Text>
        ) : null}
      </View>
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
  },
  poster: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },

  /* 🔹 상단 버튼 레이아웃 */
  iconRow: {
    position: "absolute",
    top: 40, // 상태바랑 겹치지 않게 여백
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rightGroup: {
    flexDirection: "row",
    gap: 10,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },

  iconText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  infoCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },
  titleText: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
  },
  alarmButton: {
    padding: 6,
  },
  infoBlock: {
    marginTop: 4,
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
  },
  infoIcon: {
    marginRight: 10,
    width: 18,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  clickCount: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
  posterPlaceholder: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 14,
    color: "#6B7280",
  },
});
