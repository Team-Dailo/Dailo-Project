// 관리자 - 신고 기록 (GET /api/admin/reports/post-record): 게시글별 누적 신고 수
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as adminService from "../../../services/admin.service";

export default function AdminReportRecordScreen() {
  const router = useRouter();
  const [list, setList] = useState<adminService.ReportedPostSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminReportRecord();
      setList(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "조회 실패";
      const is403 = msg.includes("403") || msg.includes("관리자");
      setError(is403 ? "관리자 권한이 필요합니다." : msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const handleDeletePost = useCallback(
    (item: adminService.ReportedPostSummaryDto) => {
      Alert.alert(
        "게시글 삭제",
        `"${item.title}" 게시글을 삭제하시겠습니까? 삭제된 글은 목록에서 보이지 않습니다.`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: async () => {
              setDeletingId(item.postId);
              try {
                await adminService.deleteAdminPost(item.postId);
                setList((prev) => prev.filter((p) => p.postId !== item.postId));
              } catch (e) {
                Alert.alert("오류", e instanceof Error ? e.message : "삭제에 실패했습니다.");
              } finally {
                setDeletingId(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : list.length === 0 ? (
        <Text style={styles.empty}>신고 기록이 없습니다.</Text>
      ) : (
        <>
          <Text style={styles.summary}>
            게시글별 신고 수 (총 {list.length}건, 신고 많은 순)
          </Text>
          {list.map((item) => (
            <View key={item.postId} style={styles.card}>
              <Pressable onPress={() => router.push(`/board/${item.postId}`)} style={styles.cardMain}>
                <View style={styles.cardRow}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>신고 {item.reportCount}건</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  작성자: {item.authorNickname || `#${item.authorId}`} · 게시글 #{item.postId}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.deleteBtn, deletingId === item.postId && styles.deleteBtnDisabled]}
                onPress={() => handleDeletePost(item)}
                disabled={deletingId === item.postId}
              >
                <Text style={styles.deleteBtnText}>
                  {deletingId === item.postId ? "삭제 중..." : "삭제"}
                </Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#DC2626", marginBottom: 12, fontSize: 14 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 24 },
  summary: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardMain: { flex: 1 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  meta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#DC2626",
    borderRadius: 8,
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
});
