// 관리자 - 행사 추가 (POST /api/admin/events). eventId 없으면 신규, 있으면 수정.
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../hooks/useAuth";
import * as adminService from "../../../services/admin.service";
import * as authService from "../../../services/auth.service";
import {
  getPickedLocation,
  clearPickedLocation,
} from "../../../services/eventLocationPickStore";

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

/** 규모(지도·달력 마커 색상) - 행사 등록 시 지정 시 지도/달력에서 해당 색으로 표시 */
const FILTER_GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: "CHUNGJU_CITY", label: "충주시" },
  { value: "UNIVERSITY", label: "대학교" },
  { value: "STUDENT_COUNCIL", label: "총학생회" },
  { value: "COLLEGE", label: "단과대" },
  { value: "CLUB", label: "동아리" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "초안(비공개)" },
  { value: "ACTIVE", label: "진행 중(공개)" },
  { value: "ENDED", label: "종료됨" },
  { value: "INACTIVE", label: "비활성화" },
];

const defaultStart = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
};
const defaultEnd = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
};

export default function AdminEventEditScreen() {
  const { user } = useAuth();
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId?: string }>();
  const isEdit = !!eventIdParam && eventIdParam !== "";
  const eventId = eventIdParam ? Number(eventIdParam) : null;

  // 로그인된 회원 ID를 저장소에 동기화 (관리자 API X-User-Id용, getMe 실패해도 로그인 시 받은 id 사용)
  useEffect(() => {
    if (user?.id != null && user.id > 0) {
      authService.setStoredUserId(user.id);
    }
  }, [user?.id]);

  const [title, setTitle] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [regionName, setRegionName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [startAt, setStartAt] = useState(defaultStart());
  const [endAt, setEndAt] = useState(defaultEnd());
  const [categories, setCategories] = useState<string[]>([]);
  const [filterGroup, setFilterGroup] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [description, setDescription] = useState("");
  const [hostContact, setHostContact] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadDetail, setLoadDetail] = useState(isEdit);
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

  useEffect(() => {
    if (!isEdit || eventId == null || !Number.isInteger(eventId)) return;
    (async () => {
      try {
        const res = await adminService.getAdminEventDetail(eventId);
        setTitle(res.title ?? "");
        setPlaceName(res.placeName ?? "");
        setPlaceAddress(res.placeAddress ?? "");
        setRegionName(res.regionName ?? "");
        setLatitude(res.latitude != null ? String(res.latitude) : "");
        setLongitude(res.longitude != null ? String(res.longitude) : "");
        setStartAt(res.startAt ? res.startAt.slice(0, 16) : defaultStart());
        setEndAt(res.endAt ? res.endAt.slice(0, 16) : defaultEnd());
        setCategories(Array.isArray(res.categories) ? res.categories : []);
        setFilterGroup(res.filterGroup ?? "");
        setStatus(res.status ?? "DRAFT");
        setThumbnailUrl(res.thumbnailUrl ?? "");
        setDescription(res.description ?? "");
        setHostContact(res.hostContact ?? "");
      } catch {
        // ignore
      } finally {
        setLoadDetail(false);
      }
    })();
  }, [isEdit, eventId]);

  const toggleCategory = (value: string) => {
    setCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
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

  const buildBody = (): adminService.AdminEventCreateRequest => {
    const lat = latitude.trim() ? Number(latitude.trim()) : NaN;
    const lng = longitude.trim() ? Number(longitude.trim()) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error("위도·경도를 숫자로 입력해 주세요.");
    }
    if (!title.trim()) throw new Error("제목을 입력해 주세요.");
    if (categories.length === 0) throw new Error("카테고리를 1개 이상 선택해 주세요.");
    const start = startAt.trim() || defaultStart();
    const end = endAt.trim() || defaultEnd();
    return {
      title: title.trim(),
      placeName: placeName.trim() || undefined,
      placeAddress: placeAddress.trim() || undefined,
      regionName: regionName.trim() || undefined,
      latitude: lat,
      longitude: lng,
      startAt: start.length <= 16 ? `${start}:00` : start,
      endAt: end.length <= 16 ? `${end}:00` : end,
      categories,
      filterGroup: filterGroup.trim() || undefined,
      status: status || "DRAFT",
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      description: description.trim() || undefined,
      hostContact: hostContact.trim() || undefined,
    };
  };

  const handleSubmit = async () => {
    try {
      const body = buildBody();
      setLoading(true);
      if (isEdit && eventId != null) {
        await adminService.updateAdminEvent(eventId, body);
        Alert.alert("완료", "행사가 수정되었습니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      } else {
        await adminService.createAdminEvent(body);
        Alert.alert("완료", "행사가 등록되었습니다.", [
          { text: "확인", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setLoading(false);
    }
  };

  if (loadDetail) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

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
        <Field label="제목 *" value={title} onChangeText={setTitle} placeholder="행사 제목" />
        <Field label="장소명" value={placeName} onChangeText={setPlaceName} placeholder="장소 이름" />
        <Field label="상세 주소" value={placeAddress} onChangeText={setPlaceAddress} placeholder="주소" />
        <Field label="지역 *" value={regionName} onChangeText={setRegionName} placeholder="예: 충북 충주, 서울 (현재 위치 기준 목록/지도 필터용)" />
        <Text style={styles.label}>위치 (지도 표시용) *</Text>
        <Pressable
          style={styles.locationPickRow}
          onPress={() => {
            openedLocationPickerRef.current = true;
            const initialLat = latitude.trim() || "36.991";
            const initialLng = longitude.trim() || "127.926";
            router.push({
              pathname: "/(tabs)/mypage/event-location-picker",
              params: { initialLat, initialLng },
            });
          }}
        >
          <Text style={styles.locationPickText} numberOfLines={1}>
            {latitude.trim() && longitude.trim()
              ? "위치 설정됨 (탭하여 주소 검색 또는 지도에서 다시 선택)"
              : "주소 검색 또는 지도에서 위치 선택 (탭하여 열기)"}
          </Text>
        </Pressable>
        <Field
          label="시작 일시 *"
          value={startAt}
          onChangeText={setStartAt}
          placeholder="2025-02-15T10:00"
        />
        <Field
          label="종료 일시 *"
          value={endAt}
          onChangeText={setEndAt}
          placeholder="2025-02-16T18:00"
        />

        <Text style={styles.label}>규모 (지도·달력 마커 색상)</Text>
        <View style={styles.chipRow}>
          {FILTER_GROUP_OPTIONS.map((f) => (
            <Pressable
              key={f.value}
              style={[styles.chip, filterGroup === f.value && styles.chipSelected]}
              onPress={() => setFilterGroup(f.value)}
            >
              <Text style={[styles.chipText, filterGroup === f.value && styles.chipTextSelected]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>카테고리 * (1개 이상)</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              style={[styles.chip, categories.includes(c.value) && styles.chipSelected]}
              onPress={() => toggleCategory(c.value)}
            >
              <Text style={[styles.chipText, categories.includes(c.value) && styles.chipTextSelected]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>상태</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((s) => (
            <Pressable
              key={s.value}
              style={[styles.chip, status === s.value && styles.chipSelected]}
              onPress={() => setStatus(s.value)}
            >
              <Text style={[styles.chipText, status === s.value && styles.chipTextSelected]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>대표 사진</Text>
        {thumbnailUrl ? (
          <View style={styles.photoSection}>
            <Image source={{ uri: thumbnailUrl }} style={styles.photoPreview} resizeMode="cover" />
            <Pressable
              style={[styles.photoBtn, uploading && styles.photoBtnDisabled]}
              onPress={pickAndUploadImage}
              disabled={uploading}
            >
              <Text style={styles.photoBtnText}>{uploading ? "업로드 중..." : "다른 사진 선택"}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.photoBtn, styles.photoBtnOutlined, uploading && styles.photoBtnDisabled]}
            onPress={pickAndUploadImage}
            disabled={uploading}
          >
            <Text style={styles.photoBtnTextOutlined}>{uploading ? "업로드 중..." : "갤러리에서 사진 선택"}</Text>
          </Pressable>
        )}
        <Field label="썸네일 URL (직접 입력)" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="또는 URL 입력" />
        <Field
          label="설명"
          value={description}
          onChangeText={setDescription}
          placeholder="행사 설명"
          multiline
        />
        <Field label="주최 연락처" value={hostContact} onChangeText={setHostContact} placeholder="연락처" />

        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? "저장 중..." : isEdit ? "수정하기" : "행사 추가"}
          </Text>
        </Pressable>
        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "decimal-pad" | "default";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  locationPickRow: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  locationPickText: { fontSize: 14, color: "#374151" },
  locationPickHint: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  chipSelected: { backgroundColor: "#2563EB" },
  chipText: { fontSize: 14, color: "#374151" },
  chipTextSelected: { color: "#FFF", fontWeight: "600" },
  submitBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  photoSection: { marginBottom: 16 },
  photoPreview: { width: "100%", aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: "#F3F4F6", marginBottom: 8 },
  photoBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" },
  photoBtnOutlined: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#2563EB" },
  photoBtnDisabled: { opacity: 0.6 },
  photoBtnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  photoBtnTextOutlined: { color: "#2563EB", fontSize: 15, fontWeight: "600" },
});
