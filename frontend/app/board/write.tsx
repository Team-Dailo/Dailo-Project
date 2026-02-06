import { View, Text, Pressable, TextInput, SafeAreaView , Keyboard , ScrollView , Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

export default function WriteScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<"후기" | "질문" | "자유">("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const pickMedia = async () => {
    const { status } = 
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if ( status !== "granted") {
      Alert.alert(
        "권한 필요",
        "사진 및 동영상 업로드를 위해 갤러리 접근 권한이 필요합니다."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes : ImagePicker .MediaTypeOptions.All, //사진 + 동영상
      allowsMultipleSelection: false, 
      quality : 1,
    });

    if (!result.canceled) {
      console.log(result.assets[0]);
      // retulst.assets[0].uri -> 실제 파일 경로
    }
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Pressable style={{ flex: 1}} onPress={Keyboard.dismiss}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1}}
        keyboardShouldPersistTaps="handled"
      >
      {/* 헤더 */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 16,
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 16 }}>취소</Text>
        </Pressable>

        <Text style={{ fontSize: 16, fontWeight: "600" }}>새 게시물</Text>

        <Pressable>
          <Text style={{ fontSize: 16, color: "#2563EB" }}>공유</Text>
        </Pressable>
      </View>

      {/* 카테고리 */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
        {["후기", "질문", "자유"].map((item) => (
          <Pressable
            key={item}
            onPress={() => setCategory(item as any)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor:
                category === item ? "#2563EB" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: category === item ? "#fff" : "#374151",
              }}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 제목 */}
      <TextInput
        placeholder="제목"
        value={title}
        onChangeText={setTitle}
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
        multiline
        style={{
          padding: 16,
          fontSize: 15,
          flex: 1,
          textAlignVertical: "top",
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
      <Pressable onPress={pickMedia}>
        <Text>사진/동영상</Text>
      </Pressable>
        <Text>태그</Text>
      </View>
    </ScrollView>
    </Pressable>
    </SafeAreaView>
  );
}
