// 관리자 - 행사 추가 (POST /api/admin/events). eventId 없으면 신규, 있으면 수정.
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "../../../hooks/useAuth";
import * as adminService from "../../../services/admin.service";
import * as authService from "../../../services/auth.service";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "FESTIVAL", label: "축제" },
  { value: "EXHIBITION", label: "전시" },
  { value: "TRAFFIC", label: "교통" },
  { value: "CONSTRUCTION", label: "공사" },
  { value: "ETC", label: "기타" },
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
  const [status, setStatus] = useState("DRAFT");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [description, setDescription] = useState("");
  const [hostContact, setHostContact] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadDetail, setLoadDetail] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || eventId == null || !Number.isInteger(eventId)) return;
    (async () => {
      try {
        const res = await adminService.getAdminEventDetail(eventId);
        setTitle(res.title ?? "");
        setPlaceName(res.placeName ?? "");
        setLatitude(res.latitude != null ? String(res.latitude) : "");
        setLongitude(res.longitude != null ? String(res.longitude) : "");
        setStartAt(res.startAt ? res.startAt.slice(0, 16) : defaultStart());
        setEndAt(res.endAt ? res.endAt.slice(0, 16) : defaultEnd());
        setCategories(Array.isArray(res.categories) ? res.categories : []);
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
        <Field label="지역명" value={regionName} onChangeText={setRegionName} placeholder="예: 서울, 경기" />
        <Field
          label="위도 *"
          value={latitude}
          onChangeText={setLatitude}
          placeholder="예: 37.5665"
          keyboardType="decimal-pad"
        />
        <Field
          label="경도 *"
          value={longitude}
          onChangeText={setLongitude}
          placeholder="예: 126.978"
          keyboardType="decimal-pad"
        />
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

        <Field label="썸네일 URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="https://..." />
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
});
