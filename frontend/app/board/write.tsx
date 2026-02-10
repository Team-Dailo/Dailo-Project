import { View, Text, Pressable, TextInput, SafeAreaView, Keyboard, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { API_BASE_URL } from "@/constants/api";

export default function WriteScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<"후기" | "질문" | "자유">("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE_URL,
        timeout: 10000,
        headers: { "Content-Type": "application/json" },
      }),
    []
  );

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "사진 및 동영상 업로드를 위해 갤러리 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (!result.canceled) {
      console.log(result.assets[0]);
      // result.assets[0].uri -> 실제 파일 경로
      Alert.alert("선택 완료", "미디어 선택은 됐고, 업로드는 아직 연결 전이야!");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!title.trim()) {
      Alert.alert("제목 입력", "제목을 입력해줘!");
      return;
    }
    if (!content.trim()) {
      Alert.alert("내용 입력", "내용을 입력해줘!");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ 백엔드가 원하는 필드명은 프로젝트마다 다를 수 있음.
      // 우선 가장 흔한 형태로 보냄: title, content, categoryType
      const payload = {
        title: title.trim(),
        content: content.trim(),
        categoryType: category, // 서버가 'categoryType'을 안 쓰면 로그 보고 수정
      };

      console.log("POST URL:", `${API_BASE_URL}/api/posts`);
      console.log("POST payload:", payload);

      const res = await api.post("/api/posts", payload);

      console.log("POST status:", res.status);
      console.log("POST data:", res.data);

      Alert.alert("완료", "게시글이 저장됐어!");
      router.back(); // 게시판으로 돌아가면 useFocusEffect로 목록 다시 불러올 거야
    } catch (e: any) {
      console.log("❌ POST ERROR");
      console.log("message:", e?.message);
      console.log("status:", e?.response?.status);
      console.log("data:", e?.response?.data);

      Alert.alert(
        "저장 실패",
        typeof e?.response?.data === "string"
          ? e.response.data
          : JSON.stringify(e?.response?.data ?? { message: e?.message })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* 헤더 */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
              alignItems: "center",
            }}
          >
            <Pressable onPress={() => router.back()} disabled={submitting}>
              <Text style={{ fontSize: 16, opacity: submitting ? 0.5 : 1 }}>취소</Text>
            </Pressable>

            <Text style={{ fontSize: 16, fontWeight: "600" }}>새 게시물</Text>

            {/* ✅ 공유 버튼에 저장 연결 */}
            <Pressable onPress={handleSubmit} disabled={submitting}>
              <Text style={{ fontSize: 16, color: "#2563EB", opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "저장중..." : "공유"}
              </Text>
            </Pressable>
          </View>

          {/* 카테고리 */}
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
            {["후기", "질문", "자유"].map((item) => (
              <Pressable
                key={item}
                onPress={() => setCategory(item as any)}
                disabled={submitting}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: category === item ? "#2563EB" : "#E5E7EB",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                <Text style={{ color: category === item ? "#fff" : "#374151" }}>{item}</Text>
              </Pressable>
            ))}
          </View>

          {/* 제목 */}
          <TextInput
            placeholder="제목"
            value={title}
            onChangeText={setTitle}
            editable={!submitting}
            style={{
              padding: 16,
              fontSize: 16,
              borderBottomWidth: 1,
              borderColor: "#E5E7EB",
              marginTop: 12,
            }}
          />

          {/* 내용 */}
          <TextInput
            placeholder="자유롭게 기록해보세요!"
            value={content}
            onChangeText={setContent}
            editable={!submitting}
            multiline
            style={{
              padding: 16,
              fontSize: 15,
              flex: 1,
              textAlignVertical: "top",
              minHeight: 240,
            }}
          />

          {/* 하단 액션 */}
          <View
            style={{
              flexDirection: "row",
              gap: 16,
              padding: 16,
              borderTopWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Pressable onPress={pickMedia} disabled={submitting}>
              <Text style={{ opacity: submitting ? 0.6 : 1 }}>사진/동영상</Text>
            </Pressable>
            <Text style={{ opacity: 0.6 }}>태그(추후)</Text>
          </View>
        </ScrollView>
      </Pressable>
    </SafeAreaView>
  );
}
