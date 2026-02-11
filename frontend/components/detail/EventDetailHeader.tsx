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
}

export default function EventDetailHeader({ id, event, loading, error, onShare, onSave }: Props) {
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
            <Text style={styles.iconText}>‹</Text>
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

  return (
    <View style={styles.container}>
      <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />

      <View style={styles.iconRow}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>

        <View style={styles.rightGroup}>
          <Pressable onPress={handlePressShare} style={styles.iconButton} hitSlop={10}>
            <Text style={styles.iconText}>⤴</Text>
          </Pressable>
          <Pressable onPress={handlePressSave} style={styles.iconButton} hitSlop={10}>
            <Text style={styles.iconText}>★</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        {dateStr ? <Text style={styles.dateText}>{dateStr}</Text> : null}
        <Text style={styles.titleText}>{event.title}</Text>

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
    gap: 12,
  },

  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
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
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 3,
  },
  dateText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  infoBlock: {
    marginTop: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 24,
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
