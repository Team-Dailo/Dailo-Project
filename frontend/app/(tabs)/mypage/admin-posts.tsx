// 관리자 - 게시글 작성자 변경 (PATCH /api/admin/posts/{postId}/author)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import * as adminService from "../../../services/admin.service";

export default function AdminPostsScreen() {
  const [postId, setPostId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const pId = postId.trim() ? Number(postId.trim()) : NaN;
    const aId = authorId.trim() ? Number(authorId.trim()) : NaN;
    if (!Number.isInteger(pId) || pId < 1) {
      Alert.alert("입력 오류", "게시글 ID를 숫자로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(aId) || aId < 1) {
      Alert.alert("입력 오류", "작성자 ID(회원 ID)를 숫자로 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await adminService.updatePostAuthor(pId, aId);
      Alert.alert("완료", "해당 게시글의 작성자가 변경되었습니다.");
      setPostId("");
      setAuthorId("");
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "작성자 변경 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.desc}>
        기존에 author_id가 잘못 저장된 게시글의 작성자 회원 ID를 변경합니다.
      </Text>
      <View style={styles.field}>
        <Text style={styles.label}>게시글 ID (postId)</Text>
        <TextInput
          style={styles.input}
          value={postId}
          onChangeText={setPostId}
          placeholder="예: 123"
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>새 작성자 회원 ID (authorId)</Text>
        <TextInput
          style={styles.input}
          value={authorId}
          onChangeText={setAuthorId}
          placeholder="예: 2"
          keyboardType="number-pad"
        />
      </View>
      <Pressable
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? "처리 중..." : "작성자 변경"}</Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  desc: { fontSize: 14, color: "#6B7280", marginBottom: 20, lineHeight: 20 },
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
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
