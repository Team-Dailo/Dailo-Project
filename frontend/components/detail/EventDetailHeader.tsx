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
  Modal,
  StatusBar,
} from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import type { EventDetail } from "../../types/event";
import * as logService from "../../services/log.service";
import * as eventReminder from "../../services/eventReminder.service";

const EVENT_REMINDER_BOOKED_DAYS_KEY = "@mypage/notification_event_reminder_days_before";

const DEFAULT_POSTER_URI =
  "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800";

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = d.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const w = weekdays[d.getDay()];
    return `${y}.${m}.${day} ${w}`;
  } catch {
    return "";
  }
}

/** 같은 날이면 하나, 2일 이상이면 "시작일 ~ 종료일" */
function formatEventDateRange(startIso: string, endIso?: string | null): string {
  const startStr = formatEventDate(startIso);
  if (!endIso || !startStr) return startStr;
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    if (startDay === endDay) return startStr;
    const endStr = formatEventDate(endIso);
    return `${startStr} ~ ${endStr}`;
  } catch {
    return startStr;
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
  /** 좋아요 (하트) - 선택. 로컬 전용이면 likeCount는 0 또는 1 */
  isLiked?: boolean;
  likeCount?: number;
  onLike?: () => void;
  /** 로그인 여부 - 알림 아이콘은 로그인 시에만 동작 */
  isLoggedIn?: boolean;
  /** 저장(스크랩) 여부 - 본인 계정에서만 채워진 북마크 표시 */
  isScraped?: boolean;
}

export default function EventDetailHeader({ id, event, loading, error, onShare, onSave, isLiked = false, likeCount, onLike, isLoggedIn = false, isScraped = false }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 등록 시 선택한 대표 썸네일(thumbnailUrl)을 우선 사용하고,
  // 없으면 상세 포스터 배열의 첫 번째 이미지를 사용
  const posterUri =
    (event?.thumbnailUrl as string | null | undefined)?.trim() ||
    event?.posterUrls?.[0] ||
    DEFAULT_POSTER_URI;
  const [clickCount, setClickCount] = useState<number | null>(null);
  const [hasReminder, setHasReminder] = useState(false);
  const [posterFullscreen, setPosterFullscreen] = useState(false);

  // 행사 상세 진입 시 조회(클릭) 로그 기록 + 조회수 표시
  useEffect(() => {
    if (!id || !event) return;
    const eventIdNum = Number(id);
    if (!Number.isFinite(eventIdNum)) return;
    logService
      .logClick({ eventId: eventIdNum, source: "event_detail" })
      .then(() => logService.getEventClickCount(eventIdNum))
      .then(setClickCount)
      .catch(() => logService.getEventClickCount(eventIdNum).then(setClickCount).catch(() => {}));
  }, [id, event]);

  useEffect(() => {
    if (!id) return;
    eventReminder.getScheduledEventIds("booked").then((ids) => setHasReminder(ids.includes(String(id))));
  }, [id]);

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
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "저장 기능은 로그인 후 사용할 수 있습니다.", [
        { text: "취소" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
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
        <View style={[styles.iconRow, { top: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
        </View>
      </View>
    );
  }

  const dateStr = formatEventDateRange(event.startAt, event.endAt);
  const timeStr = formatEventTimeRange(event.startAt, event.endAt);
  const placeStr = event.placeName?.trim() || "장소 미정";
  const organizerStr = event.hostContact?.trim() || "—";

  /** 네이버 지도 길찾기: 출발=현재위치, 도착=행사 "주소명"(placeAddress) */
  const openNaverDirection = async () => {
    const address = (event.placeAddress ?? "").trim();
    // 길찾기 목적지 문자열은 "주소명"으로 한정 (제목/장소명은 지도 바텀시트 등에서만 사용)
    const destination = address || "행사 장소";
    const hasCoords = event.latitude != null && event.longitude != null && Number.isFinite(event.latitude) && Number.isFinite(event.longitude);

    const openNaverWeb = () => {
      Linking.openURL(`https://map.naver.com/v5/search/${encodeURIComponent(destination)}`).catch(() => {});
    };

    if (Platform.OS === "web") {
      openNaverWeb();
      return;
    }

    if (!hasCoords) {
      openNaverWeb();
      return;
    }

    let startLat: number | null = null;
    let startLng: number | null = null;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        startLat = coords.latitude;
        startLng = coords.longitude;
      }
    } catch {
      // 위치 없이 목적지만 열기
    }

    // URLSearchParams는 한글 공백을 + 로 인코딩하므로 수동 빌드
    const dlat = String(event.latitude);
    const dlng = String(event.longitude);
    const dname = encodeURIComponent(destination);
    let nmapUrl =
      `nmap://route/car` +
      `?dlat=${dlat}&dlng=${dlng}&dname=${dname}` +
      `&appname=com.knut.dailo`;
    if (startLat != null && startLng != null) {
      const slat = String(startLat);
      const slng = String(startLng);
      const sname = encodeURIComponent("현재 위치");
      nmapUrl += `&slat=${slat}&slng=${slng}&sname=${sname}`;
    }
    Linking.openURL(nmapUrl).catch(openNaverWeb);
  };

  const scheduleReminder = async () => {
    // 권한 먼저 체크
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      // 권한이 없으면 권한 요청
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      if (requestedStatus !== "granted") {
        Alert.alert("알림 실패", "알림 권한을 허용해 주세요.");
        return;
      }
    }
    
    await eventReminder.cancelEventReminders(String(event.id));

    // 알림 시점 (며칠 전) 설정 불러오기 (기본 1일 전)
    let daysBefore = 1;
    try {
      const stored = await AsyncStorage.getItem(EVENT_REMINDER_BOOKED_DAYS_KEY);
      if (stored != null && stored !== "") {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 30) {
          daysBefore = parsed;
        }
      }
    } catch {
      // ignore and use default
    }

    const notifId = await eventReminder.scheduleEventReminder(
      String(event.id),
      event.title,
      event.startAt,
      daysBefore,
      "booked",
      9
    );
    if (notifId) {
      setHasReminder(true);
      const msg =
        daysBefore === 1
          ? "행사 1일 전 오전 9시에 알림을 보내드립니다."
          : `행사 ${daysBefore}일 전 오전 9시에 알림을 보내드립니다.`;
      if (Platform.OS === "android") {
        ToastAndroid.show(msg, ToastAndroid.LONG);
      } else {
        Alert.alert("알림 예약", msg);
      }
    } else {
      Alert.alert("알림 실패", "알림을 예약할 수 없습니다. 행사 날짜를 확인해 주세요.");
    }
  };

  const cancelReminder = async () => {
    await eventReminder.cancelEventReminders(String(event.id));
    setHasReminder(false);
    Alert.alert("알림 해지", "예약된 알림이 해지되었어요.");
  };

  const handleAlarmPress = () => {
    if (!isLoggedIn) {
      Alert.alert("로그인 필요", "행사 알림은 로그인 후 이용할 수 있어요.");
      return;
    }
    if (hasReminder) {
      Alert.alert("알림 예약 해지", "예약된 알림을 해지할까요?", [
        { text: "취소", style: "cancel" },
        { text: "예약 해지", onPress: cancelReminder },
      ]);
      return;
    }
    scheduleReminder();
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setPosterFullscreen(true)}>
        <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
      </Pressable>

      <Modal
        visible={posterFullscreen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPosterFullscreen(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <Image source={{ uri: posterUri }} style={styles.fullscreenImage} resizeMode="contain" />
          <Pressable style={styles.fullscreenClose} onPress={() => setPosterFullscreen(false)} hitSlop={10}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>

      <View style={[styles.iconRow, { top: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>

        <View style={styles.rightGroup}>
          {onLike ? (
            <View style={styles.likeButtonWrap}>
              <Pressable onPress={onLike} style={styles.iconButton} hitSlop={12}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={isLiked ? "#EF4444" : "#111827"}
                />
              </Pressable>
              {likeCount != null && likeCount > 0 ? (
                <Text style={styles.likeCountBadge}>{likeCount}</Text>
              ) : null}
            </View>
          ) : null}
          {/* 공유 버튼 주석처리
          <Pressable onPress={handlePressShare} style={styles.iconButton} hitSlop={10}>
            <Ionicons name="share-outline" size={22} color="#111827" />
          </Pressable>
          */}
          <Pressable
            onPress={handlePressSave}
            style={[styles.iconButton, !isLoggedIn && { opacity: 0.6 }]}
            hitSlop={10}
          >
            <Ionicons
              name={isScraped ? "bookmark" : "bookmark-outline"}
              size={22}
              color={isScraped ? "#6366F1" : "#111827"}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoCard}>
        {dateStr ? <Text style={styles.dateText}>{dateStr}</Text> : null}
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{event.title}</Text>
          <Pressable onPress={handleAlarmPress} style={styles.alarmButton} hitSlop={8}>
            <Ionicons
              name={hasReminder ? "notifications" : "notifications-outline"}
              size={22}
              color={hasReminder ? "#6366F1" : "#374151"}
            />
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
            <Pressable onPress={openNaverDirection} style={styles.mapButton} hitSlop={8}>
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
            </Pressable>
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
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
  },

  rightGroup: {
    flexDirection: "row",
    gap: 10,
  },

  likeButtonWrap: {
    position: "relative",
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
  likeCountBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
    backgroundColor: "#fff",
    minWidth: 14,
    textAlign: "center",
    borderRadius: 7,
    overflow: "hidden",
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
    marginBottom: 4,
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
    marginTop: 0,
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
    paddingVertical: 1,
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
    backgroundColor: "#4C8BF5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  clickCount: {
    marginTop: 6,
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
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenClose: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});
