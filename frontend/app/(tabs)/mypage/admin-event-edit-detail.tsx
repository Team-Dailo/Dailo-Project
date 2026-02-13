// 관리자 - 행사 등록/수정 (상세보기와 동일 레이아웃, 탭 시 편집)
// 상단에 "관리자용 페이지 · 수정 중입니다" 배너 표시
import React, { useEffect, useState, useCallback, useRef } from "react";
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
import { MAP_UI } from "../../../constants/colors";
import {
  getPickedLocation,
  clearPickedLocation,
} from "../../../services/eventLocationPickStore";

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
export type NewsItemEdit = { id: string; title: string; body: string; date: string };
export type TimelineItemEdit = {
  id: string;
  dateLabel?: string;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
  details?: string[];
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
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
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
  const [foodBooths, setFoodBooths] = useState<BoothEdit[]>([]);
  const [experienceBooths, setExperienceBooths] = useState<BoothEdit[]>([]);

  const [uploading, setUploading] = useState(false);
  const openedLocationPickerRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      const picked = getPickedLocation();
      if (openedLocationPickerRef.current && picked) {
        setLatitude(String(picked.latitude));
        setLongitude(String(picked.longitude));
        clearPickedLocation();
        openedLocationPickerRef.current = false;
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
    | { type: "timeline"; item?: TimelineItemEdit }
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
      if (extra.timeline?.[0]?.dateLabel) {
        setTimelineDateLabel(extra.timeline[0].dateLabel);
      }
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
      Alert.alert("입력 오류", "위도·경도를 숫자로 입력해 주세요.");
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
        extraJson,
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
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const posterUri = thumbnailUrl.trim() || DEFAULT_POSTER;
  const dateStr = startAt ? formatDate(startAt) : "";
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

        {/* 헤더 카드 - 탭 시 편집 */}
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
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "region" })}>
              <Ionicons name="map-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>{regionName.trim() || "지역 입력 (목록/지도 필터용)"}</Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "host" })}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>{hostStr}</Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
            <Pressable style={styles.infoRow} onPress={() => setEditTarget({ type: "coords" })}>
              <Ionicons name="navigate-outline" size={18} color="#6B7280" style={styles.infoIcon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {latitude.trim() && longitude.trim()
                  ? "위치 설정됨 (탭하여 주소 검색 또는 지도에서 다시 선택)"
                  : "주소 검색 또는 지도에서 위치 선택 (탭하여 편집)"}
              </Text>
              <Ionicons name="pencil" size={14} color="#9CA3AF" />
            </Pressable>
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
              onDatePress={() => setEditTarget({ type: "date" })}
              onAdd={() => setEditTarget({ type: "timeline" })}
              onEdit={(item) => setEditTarget({ type: "timeline", item })}
            />
          )}
          {tab === "booths" && (
            <AdminBoothsSection
              foodBooths={foodBooths}
              experienceBooths={experienceBooths}
              onAddFood={() => setEditTarget({ type: "booth" })}
              onAddExperience={() => setEditTarget({ type: "booth", item: { id: "", name: "", locationLabel: "", type: "experience" } })}
              onEdit={(item) => setEditTarget({ type: "booth", item })}
            />
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
          <Ionicons name="add" size={18} color="#2563EB" />
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
            <Text style={styles.newsBody} numberOfLines={2}>{item.body}</Text>
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
  onDatePress,
  onAdd,
  onEdit,
}: {
  dateLabel: string;
  items: TimelineItemEdit[];
  onDatePress: () => void;
  onAdd: () => void;
  onEdit: (item: TimelineItemEdit) => void;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>타임테이블</Text>
        <Pressable onPress={onAdd} style={styles.addChip}>
          <Ionicons name="add" size={18} color="#2563EB" />
          <Text style={styles.addChipText}>추가</Text>
        </Pressable>
      </View>
      <Pressable style={styles.dateRow} onPress={onDatePress}>
        <Text style={styles.dateRowText}>{dateLabel || "날짜 선택 (탭하여 편집)"}</Text>
        <Ionicons name="pencil" size={16} color="#9CA3AF" />
      </Pressable>
      {items.map((item, index) => (
        <Pressable key={item.id} style={styles.timelineCard} onPress={() => onEdit(item)}>
          <View style={styles.timelineLine} />
          <View style={styles.timelineBody}>
            <Text style={styles.timelineTime}>
              {item.startTime}{item.endTime ? ` ~ ${item.endTime}` : ""}
            </Text>
            <Text style={styles.timelineTitle}>{item.title}</Text>
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
}: {
  foodBooths: BoothEdit[];
  experienceBooths: BoothEdit[];
  onAddFood: () => void;
  onAddExperience: () => void;
  onEdit: (item: BoothEdit) => void;
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
          <Ionicons name="add" size={18} color="#2563EB" />
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
          <Pressable key={booth.id} style={styles.boothCard} onPress={() => onEdit(booth)}>
            <Text style={styles.boothName}>{booth.name}</Text>
            <Text style={styles.boothMeta}>{booth.time || ""} {booth.host ? `· ${booth.host}` : ""}</Text>
            <Text style={styles.star}>★</Text>
          </Pressable>
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFilterGroup, setSelectedFilterGroup] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("DRAFT");
  /** 지역 피커 휠: 도·도시 인덱스 (다이얼처럼 돌려서 선택) */
  const [selectedRegionProvinceIndex, setSelectedRegionProvinceIndex] = useState(0);
  const [selectedRegionCityIndex, setSelectedRegionCityIndex] = useState(0);
  const regionProvinceScrollRef = useRef<ScrollView>(null);
  const regionCityScrollRef = useRef<ScrollView>(null);

  const WHEEL_ITEM_HEIGHT = 44;
  const WHEEL_VISIBLE_COUNT = 5;

  useEffect(() => {
    if (!editTarget) return;
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
      setText((values.latitude as string) ?? "");
      setText2((values.longitude as string) ?? "");
    }
    if (editTarget.type === "date") setText(((values.date as string) ?? "").slice(0, 16));
    if (editTarget.type === "time") {
      setText(((values.timeStart as string) ?? "").slice(0, 16));
      setText2(((values.timeEnd as string) ?? "").slice(0, 16));
    }
    if (editTarget.type === "news") {
      if (editTarget.item) {
        const n = editTarget.item as NewsItemEdit;
        setText(n.title);
        setText2(n.body);
        setText3(n.date);
      } else {
        setText("");
        setText2("");
        setText3("");
      }
    }
    if (editTarget.type === "timeline") {
      if (editTarget.item) {
        const t = editTarget.item as TimelineItemEdit;
        setText(t.dateLabel ?? "");
        setText2(t.startTime);
        setText3(t.endTime ?? "");
        setText4(t.title);
      } else {
        setText("");
        setText2("");
        setText3("");
        setText4("");
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
      } else {
        setText("");
        setText2("");
        setText3("");
        setText4("");
        setText5("");
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

  const handleConfirm = () => {
    if (editTarget.type === "title") onSave.setTitle(text);
    if (editTarget.type === "place") onSave.setPlaceName(text);
    if (editTarget.type === "region") onSave.setRegionName?.(text);
    if (editTarget.type === "host") onSave.setHostContact(text);
    if (editTarget.type === "coords") {
      onSave.setLatitude?.(text);
      onSave.setLongitude?.(text2);
    }
    if (editTarget.type === "categories") {
      onSave.setCategories?.(selectedCategories.length > 0 ? selectedCategories : ["FESTIVAL"]);
    }
    if (editTarget.type === "filterGroup") {
      onSave.setFilterGroup?.(selectedFilterGroup);
    }
    if (editTarget.type === "status") {
      onSave.setStatus?.(selectedStatus);
    }
    if (editTarget.type === "date") onSave.setStartAt(text);
    if (editTarget.type === "time") {
      onSave.setStartAt(text);
      onSave.setEndAt(text2);
    }
    if (editTarget.type === "news") {
      const list = (values.newsList as NewsItemEdit[]) ?? [];
      const existing = editTarget.item as NewsItemEdit | undefined;
      if (existing) {
        onSave.setNewsList(list.map((n) => (n.id === existing.id ? { ...n, title: text, body: text2, date: text3 } : n)));
      } else {
        onSave.setNewsList([...list, { id: String(Date.now()), title: text, body: text2, date: text3 }]);
      }
    }
    if (editTarget.type === "timeline") {
      const list = (values.timelineItems as TimelineItemEdit[]) ?? [];
      const existing = editTarget.item as TimelineItemEdit | undefined;
      const item = { dateLabel: text.trim() || undefined, startTime: text2, endTime: text3 || undefined, title: text4 };
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
      const isFood = !b || b.type === "food";
      const menu = isFood && text5.trim()
        ? text5.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const payload = isFood ? { name, time, host, description, menu } : { name, time, host, description };
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
    date: "날짜",
    title: "축제 이름",
    time: "시작/종료 시간",
    place: "장소",
    region: "지역",
    host: "주최",
    coords: "위도 / 경도",
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

            {editTarget?.type !== "categories" && editTarget?.type !== "filterGroup" && editTarget?.type !== "status" && (
            <TextInput
              style={styles.modalInput}
              value={text}
              onChangeText={setText}
              placeholder={
                editTarget?.type === "title" ? "축제 이름" :
                editTarget?.type === "place" ? "장소" :
                editTarget?.type === "region" ? "직접 입력 또는 아래 휠에서 선택 (목록/지도 필터용)" :
                editTarget?.type === "host" ? "주최" :
                editTarget?.type === "coords" ? "위도 (예: 37.5665)" :
                editTarget?.type === "date" ? "예: 2025-02-15T10:00" :
                editTarget?.type === "timeline" ? "날짜 (예: 11.29(목))" :
                editTarget?.type === "booth" ? "부스 이름" : ""
              }
              placeholderTextColor="#9CA3AF"
              keyboardType={editTarget?.type === "coords" ? "decimal-pad" : "default"}
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
            {(editTarget?.type === "time" || editTarget?.type === "coords" || editTarget?.type === "news" || editTarget?.type === "timeline" || editTarget?.type === "booth") && (
              <TextInput
                style={styles.modalInput}
                value={text2}
                onChangeText={setText2}
                placeholder={
                  editTarget?.type === "coords" ? "경도 (예: 126.978)" :
                  editTarget?.type === "news" ? "내용" :
                  editTarget?.type === "timeline" ? "시작 시간 (예: 12:00)" : "운영시간"
                }
                placeholderTextColor="#9CA3AF"
                keyboardType={editTarget?.type === "coords" ? "decimal-pad" : "default"}
              />
            )}
            {editTarget?.type === "coords" && onPressMapPick && (
              <TouchableOpacity style={styles.modalMapPickButton} onPress={onPressMapPick} activeOpacity={0.85}>
                <Ionicons name="map-outline" size={20} color="#2563EB" />
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
            {(editTarget?.type === "timeline" || editTarget?.type === "booth") && (
              <TextInput
                style={[styles.modalInput, editTarget?.type === "booth" && styles.modalInputMultiline]}
                value={text4}
                onChangeText={setText4}
                placeholder={editTarget?.type === "timeline" ? "행사명" : "부스 설명"}
                placeholderTextColor="#9CA3AF"
                multiline={editTarget?.type === "booth"}
                numberOfLines={editTarget?.type === "booth" ? 4 : 1}
              />
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
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={onClose}>
                <Text style={styles.modalBtnTextCancel}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleConfirm}>
                <Text style={styles.modalBtnText}>확인</Text>
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
  tabsWrapper: { backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#eee" },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  addChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  addChipText: { fontSize: 14, color: "#2563EB", fontWeight: "500" },
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
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingVertical: 8 },
  dateRowText: { fontSize: 16, fontWeight: "600" },
  timelineCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  timelineLine: { width: 4, height: 40, borderRadius: 2, backgroundColor: "#00C853", marginRight: 12 },
  timelineBody: { flex: 1 },
  timelineTime: { fontSize: 12, color: "#888", marginBottom: 4 },
  timelineTitle: { fontSize: 14, fontWeight: "600" },
  segmentContainer: { flexDirection: "row", backgroundColor: "#F3F3F3", borderRadius: 999, padding: 4, marginBottom: 16 },
  segmentItem: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 999 },
  segmentItemActive: { backgroundColor: "#FFF", shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  segmentText: { fontSize: 13, color: "#777" },
  segmentTextActive: { fontWeight: "bold", color: "#111" },
  boothCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E5E5", marginBottom: 8 },
  boothName: { flex: 1, fontSize: 14, fontWeight: "bold" },
  boothMeta: { fontSize: 12, color: "#777" },
  star: { fontSize: 18, color: "#FFCC00", marginLeft: 8 },
  saveBtn: { marginTop: 24, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 400, maxHeight: "85%", backgroundColor: "#FFF", borderRadius: 16, padding: 20 },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
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
  modalMapPickButtonText: { fontSize: 15, color: "#2563EB", fontWeight: "500" },
  modalChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  modalChipHint: { width: "100%", fontSize: 12, color: "#6B7280", marginBottom: 4 },
  modalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalChipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalChipSelected: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  modalChipText: { fontSize: 14, color: "#374151" },
  modalChipTextSelected: { color: "#FFF", fontWeight: "600" },
  filterGroupBadge: { width: 12, height: 12, borderRadius: 6, marginLeft: 4 },
  filterGroupChipBadge: { width: 14, height: 14, borderRadius: 7 },
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
  modalBtnPrimary: { backgroundColor: "#2563EB" },
  modalBtnText: { color: "#FFF", fontWeight: "600" },
  modalBtnTextCancel: { color: "#6B7280" },
});
