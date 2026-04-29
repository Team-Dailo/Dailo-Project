// 관리자 - 행사 등록/수정 (상세보기와 동일 레이아웃, 탭 시 편집)
// 상단에 "관리자용 페이지 · 수정 중입니다" 배너 표시
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import EventDetailTabs, { TabKey } from "../../../components/detail/EventDetailTabs";
import * as adminService from "../../../services/admin.service";
import { parseEventExtra, stringifyEventExtra } from "../../../utils/eventExtra";
import { API_BASE_URL } from "../../../constants/api";

function resolveNewsImageUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}
import { MAP_UI } from "../../../constants/colors";
import { geocodeAddress, reverseGeocode } from "../../../services/geocoding.service";
import {
  getPickedLocation,
  clearPickedLocation,
} from "../../../services/eventLocationPickStore";
import {
  getZonePickResult,
  clearZonePickResult,
  setZonePickRequest,
} from "../../../services/festivalZonePickStore";
import {
  parseValue as parseDateTimeValue,
  toISOSlice as toDateTimeISOSlice,
  NativeDateTimePicker,
} from "../../../components/common/DateTimePickerField";

const DEFAULT_POSTER = "https://images.unsplash.com/photo-1485550409059-9afb054cada4?w=800";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "FESTIVAL", label: "축제" },
  { value: "EXHIBITION", label: "전시" },
  { value: "PERFORMANCE", label: "공연" },
  { value: "EXPERIENCE_BOOTH", label: "체험부스" },
  { value: "FOOD_TRUCK", label: "푸드트럭" },
  { value: "TRAFFIC", label: "교통" },
  { value: "CONSTRUCTION", label: "공사" },
  { value: "ETC", label: "기타" },
];

/** 규모(지도·달력 마커 색상): 시군구·대학교·단과대/학생회·동아리/소모임·개인 */
const FILTER_GROUP_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "CHUNGJU_CITY", label: "시·군·구", color: MAP_UI.scaleBadge[0] },
  { value: "UNIVERSITY", label: "대학교", color: MAP_UI.scaleBadge[1] },
  { value: "COLLEGE", label: "단과대/학생회", color: MAP_UI.scaleBadge[2] },
  { value: "CLUB", label: "동아리/소모임", color: MAP_UI.scaleBadge[3] },
  { value: "", label: "개인", color: MAP_UI.scaleBadge[4] },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "초안(비공개)" },
  { value: "ACTIVE", label: "진행 중(공개)" },
  { value: "ENDED", label: "종료됨" },
  { value: "INACTIVE", label: "비활성화" },
];

/** 지역 피커: 도(광역) → 도시. 우선 충청북도만 */
const REGION_PROVINCES = ["충청북도"];
const REGION_CITIES_BY_PROVINCE: Record<string, string[]> = {
  충청북도: [
    "충주시",
    "제천시",
    "청주시",
    "괴산군",
    "단양군",
    "보은군",
    "영동군",
    "옥천군",
    "음성군",
    "증평군",
    "진천군",
  ],
};

// --- 소식/타임테이블/부스 (extraJson으로 API 저장) ---
export type NewsItemEdit = { id: string; title: string; body: string; date: string; imageUrls?: string[] };
export type PerformerEdit = {
  name: string;
  genre: string;
  startTime: string;
  setlist: string[];
};

export type TimelineItemEdit = {
  id: string;
  dateLabel?: string;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
  details?: string[];
  performers?: PerformerEdit[];
};
export type BoothEdit = {
  id: string;
  name: string;
  locationLabel: string;
  type: "food" | "experience";
  time?: string;
  host?: string;
  menu?: string[];
  description?: string;
  rules?: string[];
  prizes?: string[];
  /** 푸드트럭/부스 외부 링크 (예: 인스타, 예약 페이지) */
  externalLink?: string;
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/** 행사 기간(시작~종료) 일자별 라벨 "M.D(요일)" 배열. 2일 이상일 때 타임테이블 날짜 선택용 */
function getEventDayLabels(startAt?: string | null, endAt?: string | null): string[] {
  if (!startAt || !endAt) return [];
  try {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
    const labels: string[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cur <= endDay) {
      const m = cur.getMonth() + 1;
      const d = cur.getDate();
      const w = WEEKDAY_KO[cur.getDay()];
      labels.push(`${m}.${d}(${w})`);
      cur.setDate(cur.getDate() + 1);
    }
    return labels;
  } catch {
    return [];
  }
}

/** "12:00" 형태를 분 단위로 변환 (정렬용) */
function timeToMinutes(t: string): number {
  const s = (t || "").trim();
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return 0;
  return (h ?? 0) * 60 + (Number.isNaN(m) ? 0 : m);
}

/** 타임테이블을 시작 시간 순으로 정렬 */
function sortTimelineByStartTime<T extends { startTime: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}
function formatTimeRange(startIso: string, endIso?: string | null): string {
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

export default function AdminEventEditDetailScreen() {
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const isEdit = !!eventIdParam && eventIdParam !== "";
  const eventId = eventIdParam ? Number(eventIdParam) : null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("news");

  // API 연동 필드
  const [title, setTitle] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [regionName, setRegionName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [hostContact, setHostContact] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [filterGroup, setFilterGroup] = useState("");
  const [status, setStatus] = useState("DRAFT");

  // 로컬 전용 (소식/타임테이블/부스)
  const [newsList, setNewsList] = useState<NewsItemEdit[]>([]);
  const [timelineDateLabel, setTimelineDateLabel] = useState("");
  const [timelineItems, setTimelineItems] = useState<TimelineItemEdit[]>([]);
  /** 2일 이상 행사일 때 타임테이블에서 선택한 날짜 인덱스 (0-based) */
  const [selectedTimelineDateIndex, setSelectedTimelineDateIndex] = useState(0);
  const [foodBooths, setFoodBooths] = useState<BoothEdit[]>([]);
  const [experienceBooths, setExperienceBooths] = useState<BoothEdit[]>([]);
  /** 푸드트럭 영역 위치 (위치 보기 지도용) */
  const [foodArea, setFoodArea] = useState<{ latitude: number; longitude: number } | null>(null);
  /** 체험부스 영역 위치 (위치 보기 지도용) */
  const [experienceArea, setExperienceArea] = useState<{ latitude: number; longitude: number } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [detailSettingsExpanded, setDetailSettingsExpanded] = useState(false);
  const [zonePolygon, setZonePolygon] = useState<string | null>(null);
  const openedLocationPickerRef = useRef(false);
  const openedZonePickerRef = useRef(false);

  /** 2일 이상 행사일 때 타임테이블 날짜 선택용 일자 라벨 배열 */
  const eventDayLabels = useMemo(
    () => getEventDayLabels(startAt || null, endAt || null),
    [startAt, endAt]
  );
  const isMultiDayTimeline = eventDayLabels.length >= 2;
  const selectedTimelineDateLabel = eventDayLabels[selectedTimelineDateIndex] ?? eventDayLabels[0] ?? "";

  useEffect(() => {
    if (eventDayLabels.length > 0 && selectedTimelineDateIndex >= eventDayLabels.length) {
      setSelectedTimelineDateIndex(0);
    }
  }, [eventDayLabels.length, selectedTimelineDateIndex]);

  useFocusEffect(
    React.useCallback(() => {
      // 존 픽커 결과 (위치 픽커 결과와 독립적으로 처리)
      const zoneResult = getZonePickResult();
      if (openedZonePickerRef.current && zoneResult) {
        setZonePolygon(JSON.stringify(zoneResult.polygon));
        clearZonePickResult();
        openedZonePickerRef.current = false;
      }

      const picked = getPickedLocation();
      if (!picked) return;
      if (picked.forArea === "food" || picked.forArea === "experience") {
        const area = { latitude: picked.latitude, longitude: picked.longitude };
        if (picked.forArea === "food") setFoodArea(area);
        else setExperienceArea(area);
        clearPickedLocation();
        return;
      }
      if (picked.forBoothId && picked.forBoothType) {
        reverseGeocode(picked.latitude, picked.longitude).then((addr) => {
          const locationLabel = addr ?? "";
          if (picked.forBoothType === "food") {
            setFoodBooths((prev) =>
              prev.map((b) =>
                b.id === picked.forBoothId ? { ...b, locationLabel } : b
              )
            );
          } else {
            setExperienceBooths((prev) =>
              prev.map((b) =>
                b.id === picked.forBoothId ? { ...b, locationLabel } : b
              )
            );
          }
          clearPickedLocation();
        });
        return;
      }
      if (openedLocationPickerRef.current) {
        setLatitude(String(picked.latitude));
        setLongitude(String(picked.longitude));
        clearPickedLocation();
        openedLocationPickerRef.current = false;
        reverseGeocode(picked.latitude, picked.longitude).then((addr) => {
          if (addr) setPlaceAddress(addr);
        });
      }
    }, [])
  );

  // 편집 모달
  const [editTarget, setEditTarget] = useState<
    | { type: "date" }
    | { type: "title" }
    | { type: "time" }
    | { type: "place" }
    | { type: "region" }
    | { type: "host" }
    | { type: "coords" }
    | { type: "categories" }
    | { type: "filterGroup" }
    | { type: "status" }
    | { type: "news"; item?: NewsItemEdit }
    | { type: "timeline"; item?: TimelineItemEdit; selectedDateLabel?: string }
    | { type: "booth"; item?: BoothEdit }
    | null
  >(null);

  const loadEvent = useCallback(async () => {
    if (!isEdit || eventId == null || !Number.isInteger(eventId)) return;
    setLoading(true);
    try {
      const res = await adminService.getAdminEventDetail(eventId);
      setTitle(res.title ?? "");
      setPlaceName(res.placeName ?? "");
      setPlaceAddress(res.placeAddress ?? "");
      setRegionName(res.regionName ?? "");
      setStartAt(res.startAt ? res.startAt.slice(0, 16) : "");
      setEndAt(res.endAt ? res.endAt.slice(0, 16) : "");
      setHostContact(res.hostContact ?? "");
      setThumbnailUrl(res.thumbnailUrl ?? "");
      setDescription(res.description ?? "");
      setLatitude(res.latitude != null ? String(res.latitude) : "");
      setLongitude(res.longitude != null ? String(res.longitude) : "");
      setCategories(Array.isArray(res.categories) ? res.categories : []);
      setFilterGroup(res.filterGroup ?? "");
      setStatus(res.status ?? "DRAFT");

      const extra = parseEventExtra(res.extraJson ?? null);
      setNewsList(Array.isArray(extra.news) ? extra.news : []);
      setTimelineItems(sortTimelineByStartTime(Array.isArray(extra.timeline) ? extra.timeline : []));
      setFoodBooths(Array.isArray(extra.foodBooths) ? extra.foodBooths : []);
      setExperienceBooths(Array.isArray(extra.experienceBooths) ? extra.experienceBooths : []);
      setFoodArea(extra.foodArea ?? null);
      setExperienceArea(extra.experienceArea ?? null);
      if (extra.timeline?.[0]?.dateLabel) {
        setTimelineDateLabel(extra.timeline[0].dateLabel);
      }
      setZonePolygon(res.zonePolygon ?? null);
    } catch {
      Alert.alert("오류", "행사 정보를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [isEdit, eventId]);

  useEffect(() => {
    if (isEdit && eventId != null) loadEvent();
    else {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      const start = d.toISOString().slice(0, 16);
      const end = new Date(d.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      setStartAt(start);
      setEndAt(end);
      setLoading(false);
    }
  }, [isEdit, eventId, loadEvent]);

  const handleSaveEvent = async () => {
    const lat = latitude.trim() ? Number(latitude) : NaN;
    const lng = longitude.trim() ? Number(longitude) : NaN;
    if (!title.trim()) {
      Alert.alert("입력 오류", "축제 이름을 입력해 주세요.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      Alert.alert("입력 오류", "상세 설정에서 위치 주소를 입력해 주세요.");
      return;
    }
    if (!startAt.trim() || !endAt.trim()) {
      Alert.alert("입력 오류", "시작 일시와 종료 일시를 입력해 주세요.");
      return;
    }
    const start = startAt.trim().length <= 16 ? `${startAt.trim()}:00` : startAt.trim();
    const end = endAt.trim().length <= 16 ? `${endAt.trim()}:00` : endAt.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(start) === false || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(end) === false) {
      Alert.alert("입력 오류", "날짜/시간 형식이 올바르지 않습니다. (예: 2025-02-15T10:00)");
      return;
    }

    setSaving(true);
    try {
      const extraJson = stringifyEventExtra({
        news: newsList,
        timeline: timelineItems,
        foodBooths,
        experienceBooths,
        foodArea: foodArea ?? undefined,
        experienceArea: experienceArea ?? undefined,
      });
      const body: adminService.AdminEventCreateRequest = {
        title: title.trim(),
        placeName: placeName.trim() || undefined,
        placeAddress: placeAddress.trim() || undefined,
        regionName: regionName.trim() || undefined,
        latitude: lat,
        longitude: lng,
        startAt: start,
        endAt: end,
        categories: categories.length ? categories : ["FESTIVAL"],
        filterGroup: filterGroup.trim() === "" ? null : (filterGroup.trim() || undefined),
        status: status || "DRAFT",
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        description: description.trim() || undefined,
        hostContact: hostContact.trim() || undefined,
        extraJson: extraJson ?? "{}",
        zonePolygon: zonePolygon || undefined,
      };
      if (isEdit && eventId != null) {
        await adminService.updateAdminEvent(eventId, body);
        Alert.alert("완료", "행사가 수정되었습니다.", [{ text: "확인", onPress: () => router.back() }]);
      } else {
        await adminService.createAdminEvent(body);
        Alert.alert("완료", "행사가 등록되었습니다.", [{ text: "확인", onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "권한 필요",
          "갤러리 접근 권한이 필요합니다. 설정에서 사진 접근을 허용해 주세요.",
          [
            { text: "취소", style: "cancel" },
            { text: "설정으로 이동", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploading(true);
      try {
        const url = await adminService.uploadAdminEventImage(result.assets[0].uri);
        setThumbnailUrl(url);
      } catch (e) {
        Alert.alert("업로드 실패", e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert(
        "갤러리를 열 수 없음",
        msg || "사진 선택 화면을 열 수 없습니다. 앱 설정에서 사진 권한을 확인해 주세요."
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  const posterUri = thumbnailUrl.trim() || DEFAULT_POSTER;
  const startDateStr = startAt ? formatDate(startAt) : "";
  const endDateStr = endAt ? formatDate(endAt) : "";
  const dateStr =
    startDateStr && endDateStr
      ? startDateStr === endDateStr
        ? startDateStr
        : `${startDateStr} ~ ${endDateStr}`
      : startDateStr || "";
  const timeStr = formatTimeRange(startAt, endAt);
  const placeStr = placeName.trim() || "장소 미정";
  const hostStr = hostContact.trim() || "—";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 관리자용 배너 */}
        <View style={styles.adminBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#FFF" />
          <Text style={styles.adminBannerText}>관리자용 페이지 · 수정 중입니다</Text>
        </View>

        {/* 상단 포스터 (탭 시 사진 등록/변경) */}
        <Pressable style={styles.posterWrap} onPress={pickAndUploadImage} disabled={uploading}>
          <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
          <View style={styles.posterOverlay} pointerEvents="none">
            <Ionicons name="camera" size={28} color="#FFF" />
            <Text style={styles.posterOverlayText}>{uploading ? "업로드 중..." : thumbnailUrl.trim() ? "사진 변경" : "사진 등록"}</Text>
          </View>
        </Pressable>

        {/* 헤더 카드 - 첫 화면: 날짜, 행사명, 시간, 장소, 주최 */}
        <View style={styles.infoCard}>
          <Pressable style={styles.editRow} onPress={() => setEditTarget({ type: "date" })}>
            <Text style={styles.dateLabel}>{dateStr || "날짜 선택"}</Text>
            <Ionicons name="pencil" size={16} color="#9CA3AF" />
          </Pressable>
          <Pressable style={styles.editRow} onPress={() => setEditTarget({ type: "title" })}>
            <Text style={styles.titleText}>{title || "축제 이름 입력"}</Text>
            <Ionicons name="pencil" size={16} color="#9CA3AF" />
          </Pressable>
          <View style={styles.infoBlock}>
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "time" })}>
              <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText}>{timeStr || "시간 입력"}</Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "place" })}>
              <Ionicons name="location-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>{placeStr}</Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "host" })}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>{hostStr}</Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* 상세 설정하기 버튼 */}
          <Pressable
            style={styles.detailSettingsBtn}
            onPress={() => setDetailSettingsExpanded((prev) => !prev)}
          >
            <Ionicons
              name={detailSettingsExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#4C8BF5"
            />
            <Text style={styles.detailSettingsBtnText}>
              {detailSettingsExpanded ? "상세 설정 접기" : "상세 설정하기"}
            </Text>
          </Pressable>

          {/* 상세 설정 (지역, 위치, 카테고리, 규모, 상태) */}
          {detailSettingsExpanded && (
            <View style={styles.detailSettingsBlock}>
              <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "region" })}>
                <Ionicons name="map-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>{regionName.trim() || "지역 입력 (목록/지도 필터용)"}</Text>
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </Pressable>
              <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "coords" })}>
                <Ionicons name="navigate-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {placeAddress.trim() || "위치 주소 (탭하여 편집)"}
                </Text>
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </Pressable>
              {/* 축제 구역 편집 */}
              <View style={styles.infoRow}>
                <Ionicons name="map-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={[styles.infoText, { flex: 1 }]} numberOfLines={1}>
                  {zonePolygon
                    ? (() => { try { return `구역 설정됨 (꼭짓점 ${JSON.parse(zonePolygon).length}개)`; } catch { return '구역 설정됨'; } })()
                    : '축제 구역 미설정 (기본 200m 원형)'}
                </Text>
                <Pressable
                  onPress={() => {
                    const lat = latitude.trim() ? Number(latitude) : 36.991;
                    const lng = longitude.trim() ? Number(longitude) : 127.926;
                    let parsedPolygon = null;
                    if (zonePolygon) { try { parsedPolygon = JSON.parse(zonePolygon); } catch { /* ignore */ } }
                    setZonePickRequest({ centerLat: lat, centerLng: lng, polygon: parsedPolygon });
                    openedZonePickerRef.current = true;
                    router.push('/(tabs)/mypage/festival-zone-picker');
                  }}
                  style={styles.zonePillBtn}
                >
                  <Text style={styles.zonePillBtnText}>구역 편집</Text>
                </Pressable>
                {zonePolygon && (
                  <Pressable onPress={() => setZonePolygon(null)} style={[styles.zonePillBtn, { backgroundColor: '#FEE2E2', marginLeft: 4 }]}>
                    <Text style={[styles.zonePillBtnText, { color: '#DC2626' }]}>초기화</Text>
                  </Pressable>
                )}
              </View>
              <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "categories" })}>
                <Ionicons name="pricetag-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {categories.length > 0
                    ? categories.map((c) => CATEGORIES.find((x) => x.value === c)?.label ?? c).join(", ")
                    : "카테고리 선택 (탭하여 편집)"}
                </Text>
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </Pressable>
              <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "filterGroup" })}>
                <Ionicons name="pin-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {FILTER_GROUP_OPTIONS.some((f) => f.value === filterGroup) ? (FILTER_GROUP_OPTIONS.find((f) => f.value === filterGroup)?.label) : "규모 (지도·달력 마커 색상, 탭하여 편집)"}
                </Text>
                {FILTER_GROUP_OPTIONS.some((f) => f.value === filterGroup) ? (
                  <View style={[styles.filterGroupBadge, { backgroundColor: FILTER_GROUP_OPTIONS.find((f) => f.value === filterGroup)!.color }]} />
                ) : null}
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </Pressable>
              <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "status" })}>
                <Ionicons name="flag-outline" size={18} color="#6B7280" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "상태 선택"}
                </Text>
                <Ionicons name="pencil" size={14} color="#9CA3AF" />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.tabsWrapper}>
          <EventDetailTabs value={tab} onChange={setTab} />
        </View>

        <View style={styles.body}>
          {tab === "news" && (
            <AdminNewsSection
              items={newsList}
              onAdd={() => setEditTarget({ type: "news" })}
              onEdit={(item) => setEditTarget({ type: "news", item })}
            />
          )}
          {tab === "timeline" && (
            <AdminTimelineSection
              dateLabel={timelineDateLabel || (startAt ? formatDate(startAt) : "")}
              items={timelineItems}
              eventDayLabels={eventDayLabels}
              selectedTimelineDateIndex={selectedTimelineDateIndex}
              selectedTimelineDateLabel={selectedTimelineDateLabel}
              isMultiDayTimeline={isMultiDayTimeline}
              onSelectPrevDate={() => setSelectedTimelineDateIndex((i) => Math.max(0, i - 1))}
              onSelectNextDate={() =>
                setSelectedTimelineDateIndex((i) => Math.min(eventDayLabels.length - 1, i + 1))
              }
              onDatePress={() => setEditTarget({ type: "date" })}
              onAdd={() =>
                setEditTarget(
                  isMultiDayTimeline
                    ? { type: "timeline", selectedDateLabel: selectedTimelineDateLabel }
                    : { type: "timeline" }
                )
              }
              onEdit={(item) => setEditTarget({ type: "timeline", item })}
            />
          )}
          {tab === "booths" && (
            <View>
              <View style={styles.areaLocationRow}>
                <Pressable
                  style={styles.areaLocationBtn}
                  onPress={() => {
                    const base = foodArea ?? (latitude.trim() && longitude.trim() ? { latitude: Number(latitude), longitude: Number(longitude) } : null);
                    const initialLat = base ? String(base.latitude) : "36.991";
                    const initialLng = base ? String(base.longitude) : "127.926";
                    router.push({
                      pathname: "/(tabs)/mypage/event-location-picker",
                      params: { initialLat, initialLng, forArea: "food" },
                    });
                  }}
                >
                  <Ionicons name="location-outline" size={18} color="#4C8BF5" />
                  <Text style={styles.areaLocationBtnText}>푸드트럭 영역 위치</Text>
                  {foodArea != null && <Text style={styles.areaLocationSet}>설정됨</Text>}
                </Pressable>
                <Pressable
                  style={styles.areaLocationBtn}
                  onPress={() => {
                    const base = experienceArea ?? (latitude.trim() && longitude.trim() ? { latitude: Number(latitude), longitude: Number(longitude) } : null);
                    const initialLat = base ? String(base.latitude) : "36.991";
                    const initialLng = base ? String(base.longitude) : "127.926";
                    router.push({
                      pathname: "/(tabs)/mypage/event-location-picker",
                      params: { initialLat, initialLng, forArea: "experience" },
                    });
                  }}
                >
                  <Ionicons name="location-outline" size={18} color="#4C8BF5" />
                  <Text style={styles.areaLocationBtnText}>체험부스 영역 위치</Text>
                  {experienceArea != null && <Text style={styles.areaLocationSet}>설정됨</Text>}
                </Pressable>
              </View>
              <AdminBoothsSection
                foodBooths={foodBooths}
                experienceBooths={experienceBooths}
                onAddFood={() => setEditTarget({ type: "booth" })}
                onAddExperience={() => setEditTarget({ type: "booth", item: { id: "", name: "", locationLabel: "", type: "experience" } })}
                onEdit={(item) => setEditTarget({ type: "booth", item })}
                onPickBoothLocation={(booth) => {
                  setEditTarget(null);
                  const initialLat = latitude.trim() || "36.991";
                  const initialLng = longitude.trim() || "127.926";
                  router.push({
                    pathname: "/(tabs)/mypage/event-location-picker",
                    params: { initialLat, initialLng, forBoothId: booth.id, forBoothType: booth.type },
                  });
                }}
              />
            </View>
          )}
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSaveEvent}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "저장 중..." : isEdit ? "수정 저장" : "행사 등록"}</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 편집 모달 */}
      <EditModal
        editTarget={editTarget}
        onClose={() => setEditTarget(null)}
        onPressMapPick={() => {
          openedLocationPickerRef.current = true;
          setEditTarget(null);
          const initialLat = latitude.trim() || "36.991";
          const initialLng = longitude.trim() || "127.926";
          router.push({
            pathname: "/(tabs)/mypage/event-location-picker",
            params: { initialLat, initialLng },
          });
        }}
        values={{
          date: startAt,
          title,
          timeStart: startAt,
          timeEnd: endAt,
          place: placeName,
          placeAddress,
          region: regionName,
          host: hostContact,
          latitude,
          longitude,
          categories,
          filterGroup,
          status,
          newsList,
          timelineItems,
          foodBooths,
          experienceBooths,
        }}
        onSave={{
          setStartAt,
          setTitle,
          setEndAt,
          setPlaceName,
          setPlaceAddress,
          setRegionName,
          setHostContact,
          setLatitude,
          setLongitude,
          setCategories,
          setFilterGroup,
          setStatus,
          setNewsList,
          setTimelineItems,
          setFoodBooths,
          setExperienceBooths,
        }}
      />
    </KeyboardAvoidingView>
  );
}

// --- 소식 섹션 (탭 시 편집) ---
function AdminNewsSection({
  items,
  onAdd,
  onEdit,
}: {
  items: NewsItemEdit[];
  onAdd: () => void;
  onEdit: (item: NewsItemEdit) => void;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최신 소식</Text>
        <Pressable onPress={onAdd} style={styles.addChip}>
          <Ionicons name="add" size={18} color="#4C8BF5" />
          <Text style={styles.addChipText}>추가</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Pressable style={styles.placeholderCard} onPress={onAdd}>
          <Text style={styles.placeholderText}>탭하여 소식 추가</Text>
        </Pressable>
      ) : (
        items.map((item) => (
          <Pressable key={item.id} style={styles.newsCard} onPress={() => onEdit(item)}>
            <Text style={styles.newsTitle}>{item.title}</Text>
            <Text style={styles.newsBody} numberOfLines={3}>{item.body}</Text>
            {Array.isArray(item.imageUrls) && item.imageUrls.length > 0 && (
              <View style={styles.newsThumbRow}>
                {item.imageUrls.slice(0, 4).map((url, i) => (
                  <Image key={`${url}-${i}`} source={{ uri: resolveNewsImageUrl(url) }} style={styles.newsThumbItem} />
                ))}
              </View>
            )}
            <Text style={styles.newsDate}>{item.date}</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

// --- 타임테이블 섹션 ---
function AdminTimelineSection({
  dateLabel,
  items,
  eventDayLabels,
  selectedTimelineDateIndex,
  selectedTimelineDateLabel,
  isMultiDayTimeline,
  onSelectPrevDate,
  onSelectNextDate,
  onDatePress,
  onAdd,
  onEdit,
}: {
  dateLabel: string;
  items: TimelineItemEdit[];
  eventDayLabels: string[];
  selectedTimelineDateIndex: number;
  selectedTimelineDateLabel: string;
  isMultiDayTimeline: boolean;
  onSelectPrevDate: () => void;
  onSelectNextDate: () => void;
  onDatePress: () => void;
  onAdd: () => void;
  onEdit: (item: TimelineItemEdit) => void;
}) {
  const displayLabel = isMultiDayTimeline ? selectedTimelineDateLabel : dateLabel;
  const itemsForDay =
    isMultiDayTimeline
      ? items.filter((i) => (i.dateLabel ?? "") === selectedTimelineDateLabel)
      : items;

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>타임테이블</Text>
        <Pressable onPress={onAdd} style={styles.addChip}>
          <Ionicons name="add" size={18} color="#4C8BF5" />
          <Text style={styles.addChipText}>추가</Text>
        </Pressable>
      </View>
      {isMultiDayTimeline ? (
        <View style={styles.timelineDateNavRow}>
          <Pressable
            onPress={onSelectPrevDate}
            style={styles.timelineDateNavBtn}
            disabled={selectedTimelineDateIndex <= 0}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={selectedTimelineDateIndex <= 0 ? "#D1D5DB" : "#374151"}
            />
          </Pressable>
          <Text style={styles.timelineDateNavLabel}>{displayLabel || "날짜"}</Text>
          <Pressable
            onPress={onSelectNextDate}
            style={styles.timelineDateNavBtn}
            disabled={selectedTimelineDateIndex >= eventDayLabels.length - 1}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={
                selectedTimelineDateIndex >= eventDayLabels.length - 1 ? "#D1D5DB" : "#374151"
              }
            />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.dateRow} onPress={onDatePress}>
          <Text style={styles.dateRowText}>{dateLabel || "날짜 선택 (탭하여 편집)"}</Text>
          <Ionicons name="pencil" size={16} color="#9CA3AF" />
        </Pressable>
      )}
      {itemsForDay.map((item) => (
        <Pressable key={item.id} style={styles.timelineCard} onPress={() => onEdit(item)}>
          <View style={styles.timelineLine} />
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTime}>
              {item.startTime}{item.endTime ? ` ~ ${item.endTime}` : ""}
            </Text>
            <Text style={styles.timelineTitle}>{item.title}</Text>
            {item.details && item.details.length > 0 && (
              <View style={styles.timelineDetails}>
                {item.details.map((line, idx) => (
                  <Text key={idx} style={styles.timelineDetailLine}>
                    • {line}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// --- 축제부스 섹션 (푸드트럭 / 체험부스) ---
function AdminBoothsSection({
  foodBooths,
  experienceBooths,
  onAddFood,
  onAddExperience,
  onEdit,
  onPickBoothLocation,
}: {
  foodBooths: BoothEdit[];
  experienceBooths: BoothEdit[];
  onAddFood: () => void;
  onAddExperience: () => void;
  onEdit: (item: BoothEdit) => void;
  onPickBoothLocation: (booth: BoothEdit) => void;
}) {
  const [boothType, setBoothType] = useState<"food" | "experience">("food");
  const list = boothType === "food" ? foodBooths : experienceBooths;
  return (
    <View>
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentItem, boothType === "food" && styles.segmentItemActive]}
          onPress={() => setBoothType("food")}
        >
          <Text style={[styles.segmentText, boothType === "food" && styles.segmentTextActive]}>푸드트럭</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentItem, boothType === "experience" && styles.segmentItemActive]}
          onPress={() => setBoothType("experience")}
        >
          <Text style={[styles.segmentText, boothType === "experience" && styles.segmentTextActive]}>체험부스</Text>
        </Pressable>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{boothType === "food" ? "푸드트럭" : "체험부스"}</Text>
        <Pressable
          onPress={boothType === "food" ? onAddFood : onAddExperience}
          style={styles.addChip}
        >
          <Ionicons name="add" size={18} color="#4C8BF5" />
          <Text style={styles.addChipText}>추가</Text>
        </Pressable>
      </View>
      {list.length === 0 ? (
        <Pressable
          style={styles.placeholderCard}
          onPress={boothType === "food" ? onAddFood : onAddExperience}
        >
          <Text style={styles.placeholderText}>탭하여 부스 추가</Text>
        </Pressable>
      ) : (
        list.map((booth) => (
          <View key={booth.id} style={styles.boothCardRow}>
            <Pressable style={styles.boothCard} onPress={() => onEdit(booth)}>
              <Text style={styles.boothName}>{booth.name}</Text>
              <Text style={styles.boothMeta}>{booth.time || ""} {booth.host ? `· ${booth.host}` : ""}</Text>
            </Pressable>
            <Pressable
              style={styles.boothLocationBtn}
              onPress={() => onPickBoothLocation(booth)}
            >
              <Ionicons name="location-outline" size={20} color="#4C8BF5" />
              <Text style={styles.boothLocationBtnText}>위치</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

// --- 단일 편집 모달 (날짜/제목/시간/장소/주최/소식/타임/부스) ---
function EditModal({
  editTarget,
  onClose,
  values,
  onSave,
  onPressMapPick,
}: {
  editTarget: { type: string; item?: NewsItemEdit | TimelineItemEdit | BoothEdit } | null;
  onClose: () => void;
  values: Record<string, unknown>;
  onSave: Record<string, (v: unknown) => void>;
  onPressMapPick?: () => void;
}) {
  const [text, setText] = useState("");
  const [text2, setText2] = useState("");
  const [text3, setText3] = useState("");
  const [text4, setText4] = useState("");
  const [text5, setText5] = useState(""); // 푸드트럭 메뉴-가격 (한 줄에 하나, 예: 타코야끼(6pcs) - 5,000원)
  const [text6, setText6] = useState(""); // 부스/푸드트럭 외부 링크
  const [editPerformers, setEditPerformers] = useState<PerformerEdit[]>([]);
  const [newsImages, setNewsImages] = useState<string[]>([]); // 소식 첨부 이미지 URL 목록
  const [newsUploading, setNewsUploading] = useState(false);
  const [coordsGeocoding, setCoordsGeocoding] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFilterGroup, setSelectedFilterGroup] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("DRAFT");
  /** 지역 피커 휠: 도·도시 인덱스 (다이얼처럼 돌려서 선택) */
  const [selectedRegionProvinceIndex, setSelectedRegionProvinceIndex] = useState(0);
  const [selectedRegionCityIndex, setSelectedRegionCityIndex] = useState(0);
  const regionProvinceScrollRef = useRef<ScrollView>(null);
  const regionCityScrollRef = useRef<ScrollView>(null);
  /** 날짜 편집: 시작일·종료일 */
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());
  /** 달력 아이콘으로 연 달력: 'start' | 'end' | null */
  const [dateCalendarOpenFor, setDateCalendarOpenFor] = useState<'start' | 'end' | null>(null);
  /** 날짜 텍스트 입력 (직접 타이핑 지원) */
  const [startRawText, setStartRawText] = useState("");
  const [endRawText, setEndRawText] = useState("");
  /** 시간 편집: 시작/종료 시·분 휠 */
  const [timeStartHour, setTimeStartHour] = useState(0);
  const [timeStartMinute, setTimeStartMinute] = useState(0);
  const [timeEndHour, setTimeEndHour] = useState(0);
  const [timeEndMinute, setTimeEndMinute] = useState(0);
  /** 시간 입력란에 그대로 보여줄 문자열 (중간 입력도 유지) */
  const [timeStartInput, setTimeStartInput] = useState("");
  const [timeEndInput, setTimeEndInput] = useState("");
  const WHEEL_ITEM_HEIGHT = 44;
  const WHEEL_VISIBLE_COUNT = 5;

  useEffect(() => {
    if (!editTarget) return;
    if (editTarget.type !== "date") setDateCalendarOpenFor(null);
    if (editTarget.type === "categories") {
      setSelectedCategories(Array.isArray(values.categories) ? [...(values.categories as string[])] : []);
    }
    if (editTarget.type === "filterGroup") {
      setSelectedFilterGroup((values.filterGroup as string) ?? "");
    }
    if (editTarget.type === "status") {
      setSelectedStatus((values.status as string) ?? "DRAFT");
    }
    if (editTarget.type === "title") setText((values.title as string) ?? "");
    if (editTarget.type === "place") setText((values.place as string) ?? "");
    if (editTarget.type === "region") {
      const regionStr = (values.region as string) ?? "";
      setText(regionStr);
      const s = regionStr.trim();
      const pi = REGION_PROVINCES.findIndex((p) => s.startsWith(p));
      if (pi >= 0) {
        setSelectedRegionProvinceIndex(pi);
        const rest = s.slice(REGION_PROVINCES[pi].length).trim();
        const cities = REGION_CITIES_BY_PROVINCE[REGION_PROVINCES[pi]] ?? [];
        const ci = cities.findIndex((c) => rest === c || rest.startsWith(c));
        setSelectedRegionCityIndex(ci >= 0 ? ci : 0);
      }
    }
    if (editTarget.type === "host") setText((values.host as string) ?? "");
    if (editTarget.type === "coords") {
      setText((values.placeAddress as string) ?? "");
    }
    if (editTarget.type === "date") {
      const startStr = (values.timeStart as string) ?? "";
      const endStr = (values.timeEnd as string) ?? "";
      const s = startStr ? new Date(startStr) : new Date();
      const e = endStr ? new Date(endStr) : new Date();
      setSelectedStartDate(s);
      setSelectedEndDate(e);
      setStartRawText(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`);
      setEndRawText(`${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`);
    }
    if (editTarget.type === "time") {
      const startStr = (values.timeStart as string) ?? "";
      const endStr = (values.timeEnd as string) ?? "";
      const start = parseDateTimeValue(startStr);
      const end = parseDateTimeValue(endStr);
      setTimeStartHour(start.hour);
      setTimeStartMinute(start.minute);
      setTimeEndHour(end.hour);
      setTimeEndMinute(end.minute);
      const startLabel = `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
      const endLabel = `${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`;
      setTimeStartInput(startLabel);
      setTimeEndInput(endLabel);
    }
    if (editTarget.type === "news") {
      if (editTarget.item) {
        const n = editTarget.item as NewsItemEdit;
        setText(n.title);
        setText2(n.body);
        setText3(n.date);
        setNewsImages(Array.isArray(n.imageUrls) ? [...n.imageUrls] : []);
      } else {
        setText("");
        setText2("");
        setText3("");
        setNewsImages([]);
      }
    }
    if (editTarget.type === "timeline") {
      if (editTarget.item) {
        const t = editTarget.item as TimelineItemEdit;
        setText(t.dateLabel ?? "");
        setText2(t.startTime);
        setText3(t.endTime ?? "");
        setText4(t.title);
        setText5(Array.isArray(t.details) && t.details.length > 0 ? t.details.join("\n") : "");
        setEditPerformers(Array.isArray(t.performers) ? t.performers.map((p) => ({ ...p, setlist: [...(p.setlist ?? [])] })) : []);
      } else {
        const selectedDateLabel = "selectedDateLabel" in editTarget ? (editTarget as { selectedDateLabel?: string }).selectedDateLabel : undefined;
        setText(selectedDateLabel ?? "");
        setText2("");
        setText3("");
        setText4("");
        setText5("");
        setEditPerformers([]);
      }
    }
    if (editTarget.type === "booth") {
      if (editTarget.item) {
        const b = editTarget.item as BoothEdit;
        setText(b.name);
        setText2(b.time ?? "");
        setText3(b.host ?? "");
        setText4(b.description ?? "");
        setText5(b.type === "food" && b.menu?.length ? b.menu.join("\n") : "");
        setText6(b.externalLink ?? "");
      } else {
        setText("");
        setText2("");
        setText3("");
        setText4("");
        setText5("");
        setText6("");
      }
    }
  }, [editTarget, values]);

  // 지역 휠 초기 스크롤 위치
  useEffect(() => {
    if (editTarget?.type !== "region") return;
    const t = setTimeout(() => {
      regionProvinceScrollRef.current?.scrollTo({
        y: selectedRegionProvinceIndex * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
      regionCityScrollRef.current?.scrollTo({
        y: selectedRegionCityIndex * WHEEL_ITEM_HEIGHT,
        animated: false,
      });
    }, 100);
    return () => clearTimeout(t);
  }, [editTarget?.type, selectedRegionProvinceIndex, selectedRegionCityIndex]);

  if (!editTarget) return null;

  const handleConfirm = async () => {
    if (editTarget.type === "coords") {
      const addr = text.trim();
      if (!addr) {
        Alert.alert("입력 오류", "위치 주소를 입력해 주세요.");
        return;
      }
      setCoordsGeocoding(true);
      try {
        const geo = await geocodeAddress(addr);
        if (!geo) {
          Alert.alert("주소 검색 실패", "입력한 주소를 찾을 수 없습니다. 정확한 주소를 입력해 주세요.");
          return;
        }
        onSave.setPlaceAddress?.(addr);
        onSave.setLatitude?.(String(geo.latitude));
        onSave.setLongitude?.(String(geo.longitude));
        onClose();
      } finally {
        setCoordsGeocoding(false);
      }
      return;
    }
    if (editTarget.type === "title") onSave.setTitle(text);
    if (editTarget.type === "place") onSave.setPlaceName(text);
    if (editTarget.type === "region") onSave.setRegionName?.(text);
    if (editTarget.type === "host") onSave.setHostContact(text);
    if (editTarget.type === "categories") {
      onSave.setCategories?.(selectedCategories.length > 0 ? selectedCategories : ["FESTIVAL"]);
    }
    if (editTarget.type === "filterGroup") {
      onSave.setFilterGroup?.(selectedFilterGroup);
    }
    if (editTarget.type === "status") {
      onSave.setStatus?.(selectedStatus);
    }
    if (editTarget.type === "date") {
      const startStr = (values.timeStart as string) ?? "";
      const endStr = (values.timeEnd as string) ?? "";
      const startParsed = parseDateTimeValue(startStr);
      const endParsed = parseDateTimeValue(endStr);
      onSave.setStartAt(toDateTimeISOSlice(selectedStartDate, startParsed.hour, startParsed.minute));
      onSave.setEndAt(toDateTimeISOSlice(selectedEndDate, endParsed.hour, endParsed.minute));
    }
    if (editTarget.type === "time") {
      // "HH:mm" 형식이 아닐 경우 저장하지 않고 안내
      const startMatch = timeStartInput.trim().match(/^(\d{1,2}):(\d{1,2})$/);
      const endMatch = timeEndInput.trim().match(/^(\d{1,2}):(\d{1,2})$/);
      if (!startMatch || !endMatch) {
        Alert.alert("입력 오류", "시간 형식이 올바르지 않습니다. 예: 08:00");
        return;
      }
      const startHour = Math.min(23, Math.max(0, parseInt(startMatch[1], 10)));
      const startMinute = Math.min(59, Math.max(0, parseInt(startMatch[2], 10)));
      const endHour = Math.min(23, Math.max(0, parseInt(endMatch[1], 10)));
      const endMinute = Math.min(59, Math.max(0, parseInt(endMatch[2], 10)));
      setTimeStartHour(startHour);
      setTimeStartMinute(startMinute);
      setTimeEndHour(endHour);
      setTimeEndMinute(endMinute);
      const startDate = parseDateTimeValue((values.timeStart as string) ?? "").date;
      const endDate = parseDateTimeValue((values.timeEnd as string) ?? "").date;
      onSave.setStartAt(toDateTimeISOSlice(startDate, startHour, startMinute));
      onSave.setEndAt(toDateTimeISOSlice(endDate, endHour, endMinute));
    }
    if (editTarget.type === "news") {
      const list = (values.newsList as NewsItemEdit[]) ?? [];
      const existing = editTarget.item as NewsItemEdit | undefined;
      const imageUrls = newsImages.length > 0 ? [...newsImages] : undefined;
      if (existing) {
        onSave.setNewsList(list.map((n) => (n.id === existing.id ? { ...n, title: text, body: text2, date: text3, imageUrls } : n)));
      } else {
        onSave.setNewsList([...list, { id: String(Date.now()), title: text, body: text2, date: text3, imageUrls }]);
      }
    }
    if (editTarget.type === "timeline") {
      const list = (values.timelineItems as TimelineItemEdit[]) ?? [];
      const existing = editTarget.item as TimelineItemEdit | undefined;
      const details = text5.trim()
        ? text5.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const item = {
        dateLabel: text.trim() || undefined,
        startTime: text2,
        endTime: text3 || undefined,
        title: text4,
        details,
        performers: editPerformers.length > 0 ? editPerformers : undefined,
      };
      let next: TimelineItemEdit[];
      if (existing) {
        next = list.map((t) => (t.id === existing.id ? { ...t, ...item } : t));
      } else {
        next = [...list, { id: String(Date.now()), ...item }];
      }
      onSave.setTimelineItems(sortTimelineByStartTime(next));
    }
    if (editTarget.type === "booth") {
      const b = editTarget.item as BoothEdit | undefined;
      const name = text;
      const time = text2;
      const host = text3;
      const description = text4.trim() || undefined;
      const externalLink = text6.trim() || undefined;
      const isFood = !b || b.type === "food";
      const menu = isFood && text5.trim()
        ? text5.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const payload = isFood
        ? { name, time, host, description, menu, externalLink }
        : { name, time, host, description, externalLink };
      const save = onSave as Record<string, (v: unknown) => void>;
      if (b?.type === "experience") {
        const list = (values.experienceBooths as BoothEdit[]) ?? [];
        if (b.id) {
          save.setExperienceBooths?.(list.map((x) => (x.id === b.id ? { ...x, ...payload } : x)));
        } else {
          save.setExperienceBooths?.([...list, { id: String(Date.now()), ...payload, locationLabel: "", type: "experience" as const }]);
        }
      } else {
        const list = (values.foodBooths as BoothEdit[]) ?? [];
        const foodPayload = { ...payload, locationLabel: "", type: "food" as const };
        if (b?.id) {
          save.setFoodBooths?.(list.map((x) => (x.id === b.id ? { ...x, ...foodPayload } : x)));
        } else {
          save.setFoodBooths?.([...list, { id: String(Date.now()), ...foodPayload }]);
        }
      }
    }
    onClose();
  };

  const labels: Record<string, string> = {
    date: "시작일·종료일",
    title: "축제 이름",
    time: "시작/종료 시간",
    place: "장소",
    region: "지역",
    host: "주최",
    coords: "위치 주소",
    categories: "카테고리",
    filterGroup: "규모 (지도·달력 마커 색상)",
    status: "상태",
    news: "소식",
    timeline: "타임테이블",
    booth: "부스",
  };

  return (
    <Modal visible={!!editTarget} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View>
              <Text style={styles.modalTitle}>{labels[editTarget?.type ?? ""] ?? "편집"}</Text>

            {editTarget?.type === "categories" && (
              <View style={styles.modalChipWrap}>
                <Text style={styles.modalChipHint}>1개 이상 선택</Text>
                {CATEGORIES.map((c) => {
                  const isSelected = selectedCategories.includes(c.value);
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.modalChip, isSelected && styles.modalChipSelected]}
                      onPress={() => {
                        setSelectedCategories((prev) =>
                          isSelected ? prev.filter((x) => x !== c.value) : [...prev, c.value]
                        );
                      }}
                    >
                      <Text style={[styles.modalChipText, isSelected && styles.modalChipTextSelected]}>
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {editTarget?.type === "filterGroup" && (
              <View style={styles.modalChipWrap}>
                {FILTER_GROUP_OPTIONS.map((f) => {
                  const isSelected = selectedFilterGroup === f.value;
                  return (
                    <Pressable
                      key={f.value || "PERSONAL"}
                      style={[styles.modalChip, styles.modalChipRow, isSelected && styles.modalChipSelected]}
                      onPress={() => setSelectedFilterGroup(f.value)}
                    >
                      <View style={[styles.filterGroupChipBadge, { backgroundColor: f.color }]} />
                      <Text style={[styles.modalChipText, isSelected && styles.modalChipTextSelected]}>
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {editTarget?.type === "status" && (
              <View style={styles.modalChipWrap}>
                {STATUS_OPTIONS.map((s) => {
                  const isSelected = selectedStatus === s.value;
                  return (
                    <Pressable
                      key={s.value}
                      style={[styles.modalChip, isSelected && styles.modalChipSelected]}
                      onPress={() => setSelectedStatus(s.value)}
                    >
                      <Text style={[styles.modalChipText, isSelected && styles.modalChipTextSelected]}>
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {editTarget?.type === "date" && (
              <View style={styles.dateTimePickerWrap}>
                <Text style={styles.dateTimePickerLabel}>시작일 (직접 입력 또는 달력 아이콘)</Text>
                <View style={styles.dateInputRow}>
                  <TextInput
                    style={[styles.modalInput, styles.dateInputFlex]}
                    value={startRawText}
                    onChangeText={(t) => {
                      setStartRawText(t);
                      const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                      if (m) {
                        const y = parseInt(m[1], 10);
                        const mo = parseInt(m[2], 10) - 1;
                        const d = parseInt(m[3], 10);
                        if (y >= 2000 && y <= 2100 && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
                          setSelectedStartDate(new Date(y, mo, d));
                        }
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numbers-and-punctuation"
                  />
                  <Pressable
                    style={styles.calendarIconBtn}
                    onPress={() => setDateCalendarOpenFor("start")}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#4C8BF5" />
                  </Pressable>
                </View>
                <Text style={[styles.dateTimePickerLabel, styles.dateTimePickerLabelSecond]}>종료일 (직접 입력 또는 달력 아이콘)</Text>
                <View style={styles.dateInputRow}>
                  <TextInput
                    style={[styles.modalInput, styles.dateInputFlex]}
                    value={endRawText}
                    onChangeText={(t) => {
                      setEndRawText(t);
                      const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                      if (m) {
                        const y = parseInt(m[1], 10);
                        const mo = parseInt(m[2], 10) - 1;
                        const d = parseInt(m[3], 10);
                        if (y >= 2000 && y <= 2100 && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
                          setSelectedEndDate(new Date(y, mo, d));
                        }
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numbers-and-punctuation"
                  />
                  <Pressable
                    style={styles.calendarIconBtn}
                    onPress={() => setDateCalendarOpenFor("end")}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#4C8BF5" />
                  </Pressable>
                </View>
                {/* 달력 아이콘 누르면 네이티브 달력만 표시 (팝업 없음) */}
                {dateCalendarOpenFor !== null && NativeDateTimePicker && (
                  <NativeDateTimePicker
                    value={dateCalendarOpenFor === "start" ? selectedStartDate : selectedEndDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "calendar"}
                    onChange={(_, selected) => {
                      if (selected) {
                        const fmt = (d: Date) =>
                          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        if (dateCalendarOpenFor === "start") {
                          setSelectedStartDate(selected);
                          setStartRawText(fmt(selected));
                        } else {
                          setSelectedEndDate(selected);
                          setEndRawText(fmt(selected));
                        }
                      }
                      setDateCalendarOpenFor(null);
                    }}
                    minimumDate={new Date(2000, 0, 1)}
                    maximumDate={new Date(2100, 11, 31)}
                  />
                )}
              </View>
            )}
            {editTarget?.type === "time" && (
              <View style={styles.dateTimePickerWrap}>
                <Text style={styles.dateTimePickerLabel}>시작 시간 (시 분)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={timeStartInput}
                  onChangeText={(t) => {
                    setTimeStartInput(t);
                    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
                    if (m) {
                      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
                      const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
                      setTimeStartHour(h);
                      setTimeStartMinute(min);
                    }
                  }}
                  placeholder="09:00"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={[styles.dateTimePickerLabel, styles.dateTimePickerLabelSecond]}>종료 시간 (시 분)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={timeEndInput}
                  onChangeText={(t) => {
                    setTimeEndInput(t);
                    const m = t.match(/^(\d{1,2}):(\d{1,2})$/);
                    if (m) {
                      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
                      const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
                      setTimeEndHour(h);
                      setTimeEndMinute(min);
                    }
                  }}
                  placeholder="18:00"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}
            {editTarget?.type !== "categories" && editTarget?.type !== "filterGroup" && editTarget?.type !== "status" && editTarget?.type !== "date" && editTarget?.type !== "time" && !(editTarget?.type === "timeline" && (editTarget as { selectedDateLabel?: string }).selectedDateLabel) && (
            <TextInput
              style={styles.modalInput}
              value={text}
              onChangeText={setText}
              placeholder={
                editTarget?.type === "title" ? "축제 이름" :
                editTarget?.type === "place" ? "장소" :
                editTarget?.type === "region" ? "직접 입력 또는 아래 휠에서 선택 (목록/지도 필터용)" :
                editTarget?.type === "host" ? "주최" :
                editTarget?.type === "coords" ? "주소 입력 (예: 충청북도 충주시 호반로 123)" :
                editTarget?.type === "timeline" ? "날짜 (예: 11.29(목))" :
                editTarget?.type === "booth" ? "부스 이름" : ""
              }
              placeholderTextColor="#9CA3AF"
              keyboardType="default"
            />
            )}
            {editTarget?.type === "region" && (
              <View style={styles.regionWheelWrap}>
                <Text style={styles.regionWheelLabel}>도 · 도시 선택 (휠)</Text>
                <View style={styles.regionWheelRow}>
                  <View style={styles.regionWheelColumn}>
                    <Text style={styles.regionWheelColumnTitle}>도</Text>
                    <ScrollView
                      ref={regionProvinceScrollRef}
                      style={[styles.regionWheelScroll, { height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT }]}
                      contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={WHEEL_ITEM_HEIGHT}
                      snapToAlignment="center"
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const y = e.nativeEvent.contentOffset.y;
                        const index = Math.round(y / WHEEL_ITEM_HEIGHT);
                        const i = Math.max(0, Math.min(index, REGION_PROVINCES.length - 1));
                        setSelectedRegionProvinceIndex(i);
                        const prov = REGION_PROVINCES[i];
                        const cities = REGION_CITIES_BY_PROVINCE[prov] ?? [];
                        const j = Math.min(selectedRegionCityIndex, cities.length - 1);
                        setSelectedRegionCityIndex(j);
                        setText(cities[j] ? `${prov} ${cities[j]}` : prov);
                      }}
                    >
                      {REGION_PROVINCES.map((p, i) => (
                        <View key={p} style={[styles.regionWheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                          <Text style={styles.regionWheelItemText}>{p}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.regionWheelColumn}>
                    <Text style={styles.regionWheelColumnTitle}>도시</Text>
                    <ScrollView
                      ref={regionCityScrollRef}
                      style={[styles.regionWheelScroll, { height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT }]}
                      contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={WHEEL_ITEM_HEIGHT}
                      snapToAlignment="center"
                      decelerationRate="fast"
                      onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                        const y = e.nativeEvent.contentOffset.y;
                        const index = Math.round(y / WHEEL_ITEM_HEIGHT);
                        const prov = REGION_PROVINCES[selectedRegionProvinceIndex];
                        const cities = REGION_CITIES_BY_PROVINCE[prov] ?? [];
                        const j = Math.max(0, Math.min(index, cities.length - 1));
                        setSelectedRegionCityIndex(j);
                        setText(cities[j] ? `${prov} ${cities[j]}` : prov);
                      }}
                    >
                      {(REGION_CITIES_BY_PROVINCE[REGION_PROVINCES[selectedRegionProvinceIndex]] ?? []).map((c, i) => (
                        <View key={c} style={[styles.regionWheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
                          <Text style={styles.regionWheelItemText}>{c}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            )}
            {(editTarget?.type === "news" || editTarget?.type === "timeline" || editTarget?.type === "booth") && (
              <TextInput
                style={[styles.modalInput, editTarget?.type === "news" && styles.modalInputMultiline]}
                value={text2}
                onChangeText={setText2}
                placeholder={
                  editTarget?.type === "news" ? "내용 (줄바꿈 가능)" :
                  editTarget?.type === "timeline" ? "시작 시간 (예: 12:00)" : "운영시간"
                }
                placeholderTextColor="#9CA3AF"
                keyboardType="default"
                multiline={editTarget?.type === "news"}
                numberOfLines={editTarget?.type === "news" ? 6 : 1}
                textAlignVertical={editTarget?.type === "news" ? "top" : "center"}
              />
            )}
            {editTarget?.type === "coords" && onPressMapPick && (
              <TouchableOpacity style={styles.modalMapPickButton} onPress={onPressMapPick} activeOpacity={0.85}>
                <Ionicons name="map-outline" size={20} color="#4C8BF5" />
                <Text style={styles.modalMapPickButtonText}>지도에서 위치 선택</Text>
              </TouchableOpacity>
            )}
            {(editTarget?.type === "news" || editTarget?.type === "timeline" || editTarget?.type === "booth") && (
              <TextInput
                style={styles.modalInput}
                value={text3}
                onChangeText={setText3}
                placeholder={
                  editTarget?.type === "news" ? "날짜" :
                  editTarget?.type === "timeline" ? "종료 시간 (예: 18:00)" : "주최"
                }
                placeholderTextColor="#9CA3AF"
              />
            )}
            {editTarget?.type === "news" && (
              <View style={styles.newsImagesWrap}>
                <View style={styles.newsImagesRow}>
                  {newsImages.map((url, i) => (
                    <View key={`${url}-${i}`} style={styles.newsImageItem}>
                      <Image source={{ uri: resolveNewsImageUrl(url) }} style={styles.newsImageThumb} />
                      <Pressable
                        style={styles.newsImageRemove}
                        onPress={() => setNewsImages((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={[styles.newsImageAddBtn, newsUploading && { opacity: 0.5 }]}
                    onPress={async () => {
                      try {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== "granted") {
                          Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
                          return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          allowsEditing: false,
                          quality: 0.8,
                        });
                        if (result.canceled || !result.assets?.[0]?.uri) return;
                        setNewsUploading(true);
                        try {
                          const url = await adminService.uploadAdminEventImage(result.assets[0].uri);
                          setNewsImages((prev) => [...prev, url]);
                        } catch (e) {
                          Alert.alert("업로드 실패", e instanceof Error ? e.message : "사진 업로드에 실패했습니다.");
                        } finally {
                          setNewsUploading(false);
                        }
                      } catch (e) {
                        Alert.alert("오류", e instanceof Error ? e.message : String(e));
                      }
                    }}
                    disabled={newsUploading}
                  >
                    <Ionicons name="add" size={20} color="#4C8BF5" />
                    <Text style={styles.newsImageAddText}>{newsUploading ? "업로드 중" : "사진 추가"}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {(editTarget?.type === "timeline" || editTarget?.type === "booth") && (
              <TextInput
                style={[styles.modalInput, editTarget?.type === "booth" && styles.modalInputMultiline]}
                value={text4}
                onChangeText={setText4}
                placeholder={editTarget?.type === "timeline" ? "제목 (행사명)" : "부스 설명"}
                placeholderTextColor="#9CA3AF"
                multiline={editTarget?.type === "booth"}
                numberOfLines={editTarget?.type === "booth" ? 4 : 1}
              />
            )}
            {editTarget?.type === "timeline" && (
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={text5}
                onChangeText={setText5}
                placeholder="내용 (한 줄에 하나, 예: 노래 제목 1)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            )}
            {editTarget?.type === "timeline" && (
              <View style={styles.perfSection}>
                <View style={styles.perfSectionHeader}>
                  <Text style={styles.perfSectionTitle}>공연팀</Text>
                  <Pressable
                    style={styles.perfAddBtn}
                    onPress={() =>
                      setEditPerformers([...editPerformers, { name: "", genre: "", startTime: "", setlist: [] }])
                    }
                  >
                    <Text style={styles.perfAddBtnText}>+ 팀 추가</Text>
                  </Pressable>
                </View>
                {editPerformers.map((perf, pi) => (
                  <View key={pi} style={styles.perfCard}>
                    <View style={styles.perfCardHeader}>
                      <TextInput
                        style={[styles.modalInput, { flex: 1, marginRight: 6, marginBottom: 0 }]}
                        value={perf.name}
                        onChangeText={(v) => {
                          const next = editPerformers.map((p, i) => i === pi ? { ...p, name: v } : p);
                          setEditPerformers(next);
                        }}
                        placeholder="팀 이름"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        onPress={() => setEditPerformers(editPerformers.filter((_, i) => i !== pi))}
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </Pressable>
                    </View>
                    <View style={styles.perfCardRow}>
                      <TextInput
                        style={[styles.modalInput, { flex: 1, marginRight: 6 }]}
                        value={perf.genre}
                        onChangeText={(v) => {
                          const next = editPerformers.map((p, i) => i === pi ? { ...p, genre: v } : p);
                          setEditPerformers(next);
                        }}
                        placeholder="장르 (예: 밴드)"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.modalInput, { flex: 1 }]}
                        value={perf.startTime}
                        onChangeText={(v) => {
                          const next = editPerformers.map((p, i) => i === pi ? { ...p, startTime: v } : p);
                          setEditPerformers(next);
                        }}
                        placeholder="시작시간 (예: 19:00)"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <Text style={styles.perfSetlistTitle}>셋리스트</Text>
                    {perf.setlist.map((song, si) => (
                      <View key={si} style={styles.perfSongRow}>
                        <Text style={styles.perfSongNum}>{si + 1}.</Text>
                        <TextInput
                          style={[styles.modalInput, { flex: 1 }]}
                          value={song}
                          onChangeText={(v) => {
                            const next = editPerformers.map((p, i) => {
                              if (i !== pi) return p;
                              const songs = p.setlist.map((s, j) => j === si ? v : s);
                              return { ...p, setlist: songs };
                            });
                            setEditPerformers(next);
                          }}
                          placeholder="곡명 - 아티스트"
                          placeholderTextColor="#9CA3AF"
                        />
                        <Pressable
                          onPress={() => {
                            const next = editPerformers.map((p, i) => {
                              if (i !== pi) return p;
                              return { ...p, setlist: p.setlist.filter((_, j) => j !== si) };
                            });
                            setEditPerformers(next);
                          }}
                          hitSlop={8}
                          style={{ paddingLeft: 4 }}
                        >
                          <Ionicons name="remove-circle-outline" size={20} color="#9CA3AF" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      style={styles.perfAddSongBtn}
                      onPress={() => {
                        const next = editPerformers.map((p, i) =>
                          i === pi ? { ...p, setlist: [...p.setlist, ""] } : p
                        );
                        setEditPerformers(next);
                      }}
                    >
                      <Text style={styles.perfAddSongBtnText}>+ 곡 추가</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {editTarget?.type === "booth" && (!editTarget.item || (editTarget.item as BoothEdit).type === "food") && (
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={text5}
                onChangeText={setText5}
                placeholder="메뉴-가격 (한 줄에 하나, 예: 타코야끼(6pcs) - 5,000원)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
              />
            )}
            {editTarget?.type === "booth" && (
              <TextInput
                style={styles.modalInput}
                value={text6}
                onChangeText={setText6}
                placeholder="외부 링크 (예: 인스타그램, 예약 페이지 URL)"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={onClose} disabled={coordsGeocoding}>
                <Text style={styles.modalBtnTextCancel}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleConfirm} disabled={coordsGeocoding}>
                <Text style={styles.modalBtnText}>{editTarget?.type === "coords" && coordsGeocoding ? "검색 중..." : "확인"}</Text>
              </Pressable>
            </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  adminBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    backgroundColor: "#DC2626",
  },
  adminBannerText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  posterWrap: { width: "100%", position: "relative" },
  poster: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#F3F4F6" },
  posterOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  posterOverlayText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  infoCard: {
    backgroundColor: "#FFF",
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 3,
  },
  editRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  dateLabel: { fontSize: 13, color: "#777", marginBottom: 4 },
  titleText: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  infoBlock: { marginTop: 8, gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", minHeight: 24 },
  infoIcon: { marginRight: 10, width: 18 },
  infoText: { flex: 1, fontSize: 14, color: "#374151" },
  zonePillBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#DBEAFE" },
  zonePillBtnText: { fontSize: 12, color: "#1D4ED8", fontWeight: "600" },
  tabsWrapper: { backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#eee" },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  addChipText: { fontSize: 14, color: "#4C8BF5", fontWeight: "500" },
  placeholderCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    padding: 24,
    alignItems: "center",
  },
  placeholderText: { color: "#9CA3AF", fontSize: 14 },
  newsCard: {
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
    padding: 14,
    marginBottom: 10,
  },
  newsTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  newsBody: { fontSize: 13, color: "#555", marginBottom: 4 },
  newsDate: { fontSize: 11, color: "#9CA3AF" },
  newsThumbRow: { flexDirection: "row", gap: 6, marginTop: 6, marginBottom: 6 },
  newsThumbItem: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#E5E7EB" },
  newsImagesWrap: { marginTop: 8, marginBottom: 8 },
  newsImagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  newsImageItem: { position: "relative" },
  newsImageThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#E5E7EB" },
  newsImageRemove: {
    position: "absolute", top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#111827", alignItems: "center", justifyContent: "center",
  },
  newsImageAddBtn: {
    width: 72, height: 72, borderRadius: 8,
    borderWidth: 1, borderStyle: "dashed", borderColor: "#9CA3AF",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  newsImageAddText: { fontSize: 11, color: "#4C8BF5" },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingVertical: 8 },
  dateRowText: { fontSize: 16, fontWeight: "600" },
  timelineCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  timelineLine: { width: 4, height: 40, borderRadius: 2, backgroundColor: "#00C853", marginRight: 12 },
  timelineBody: { flex: 1 },
  timelineTime: { fontSize: 12, color: "#888", marginBottom: 4 },
  timelineTitle: { fontSize: 14, fontWeight: "600" },
  timelineDetails: { marginTop: 6 },
  timelineDetailLine: { fontSize: 13, color: "#6B7280", marginBottom: 2 },
  timelineDateNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    paddingVertical: 2,
    paddingBottom: 8,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  timelineDateNavBtn: { padding: 2 },
  timelineDateNavLabel: { fontSize: 16, fontWeight: "600", color: "#111827", minWidth: 100, textAlign: "center" },
  areaLocationRow: { flexDirection: "row", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  areaLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    borderWidth: 1,
    borderColor: "#C7E0FF",
  },
  areaLocationBtnText: { fontSize: 13, color: "#1E40AF", fontWeight: "500" },
  areaLocationSet: { fontSize: 11, color: "#4C8BF5" },
  segmentContainer: { flexDirection: "row", backgroundColor: "#F3F3F3", borderRadius: 999, padding: 4, marginBottom: 16 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 999 },
  segmentItemActive: { backgroundColor: "#FFF", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  segmentText: { fontSize: 13, color: "#777" },
  segmentTextActive: { fontWeight: "bold", color: "#111" },
  boothCardRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  boothCard: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E5E5" },
  boothName: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  boothMeta: { fontSize: 12, color: "#777" },
  boothLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  boothLocationBtnText: { fontSize: 13, color: "#4C8BF5", fontWeight: "500" },
  star: { fontSize: 18, color: "#FFCC00", marginLeft: 8 },
  saveBtn: { marginTop: 24, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: "#4C8BF5", alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 400, maxHeight: "85%", backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  dateTimePickerWrap: { marginBottom: 16 },
  dateTimePickerLabel: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  dateTimePickerLabelSecond: { marginTop: 12 },
  dateInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dateInputFlex: { flex: 1, marginBottom: 0 },
  calendarIconBtn: { padding: 8 },
  calendarOnlyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  dateTimePicker: { height: 200 },
  timeWheelRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  timeWheelColumn: { flex: 1 },
  timeWheelColumnTitle: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4, textAlign: "center" },
  timeWheelScroll: { backgroundColor: "#F3F4F6", borderRadius: 12 },
  modalInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  modalInputMultiline: { minHeight: 80, textAlignVertical: "top" },
  modalMapPickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  modalMapPickButtonText: { fontSize: 15, color: "#4C8BF5", fontWeight: "500" },
  modalChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  modalChipHint: { width: "100%", fontSize: 12, color: "#6B7280", marginBottom: 4 },
  modalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalChipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalChipSelected: { backgroundColor: "#4C8BF5", borderColor: "#4C8BF5" },
  modalChipText: { fontSize: 14, color: "#374151" },
  modalChipTextSelected: { color: "#FFF", fontWeight: "600" },
  filterGroupBadge: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
  filterGroupChipBadge: { width: 14, height: 14, borderRadius: 7 },
  detailSettingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailSettingsBtnText: { fontSize: 15, fontWeight: "600", color: "#4C8BF5" },
  detailSettingsBlock: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  regionWheelWrap: { marginTop: 16, marginBottom: 8 },
  regionWheelLabel: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  regionWheelRow: { flexDirection: "row", gap: 12 },
  regionWheelColumn: { flex: 1 },
  regionWheelColumnTitle: { fontSize: 12, color: "#9CA3AF", marginBottom: 4, textAlign: "center" },
  regionWheelScroll: { backgroundColor: "#F3F4F6", borderRadius: 12 },
  regionWheelItem: { justifyContent: "center", alignItems: "center" },
  regionWheelItemText: { fontSize: 16, color: "#111827", fontWeight: "500" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalBtnPrimary: { backgroundColor: "#4C8BF5" },
  modalBtnText: { color: "#FFF", fontWeight: "600" },
  modalBtnTextCancel: { color: "#6B7280" },
  perfSection: { marginBottom: 12 },
  perfSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  perfSectionTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  perfAddBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  perfAddBtnText: { fontSize: 13, color: "#4C8BF5", fontWeight: "600" },
  perfCard: { backgroundColor: "#F9FAFB", borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#E5E7EB" },
  perfCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  perfCardRow: { flexDirection: "row", gap: 6 },
  perfSetlistTitle: { fontSize: 12, color: "#6B7280", fontWeight: "600", marginTop: 4, marginBottom: 6 },
  perfSongRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  perfSongNum: { fontSize: 13, color: "#9CA3AF", width: 22, textAlign: "right", marginRight: 6 },
  perfAddSongBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#F3F4F6", alignSelf: "flex-start", marginTop: 4 },
  perfAddSongBtnText: { fontSize: 12, color: "#4C8BF5", fontWeight: "500" },
});
