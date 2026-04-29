// app/(tabs)/mypage/block-list.tsx – GET /api/blocks/me, DELETE /api/blocks/{blockedId} 연동
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as blockService from "../../../services/block.service";
import { formatRelativeTime } from "../../../utils/formatDate";

export default function BlockListScreen() {
  const [blocks, setBlocks] = useState<blockService.BlockResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await blockService.getMyBlocks();
      setBlocks(list ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchList();
    }, [fetchList])
  );

  const handleUnblock = (blockedId: number) => {
    Alert.alert("차단 해제", "이 사용자의 차단을 해제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "차단 해제",
        onPress: async () => {
          setUnblockingId(blockedId);
          try {
            await blockService.unblockUser(blockedId);
            setBlocks((prev) => prev.filter((b) => b.blockedId !== blockedId));
          } catch {
            Alert.alert("오류", "차단 해제에 실패했습니다.");
          } finally {
            setUnblockingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={styles.headerTitleWrap} pointerEvents="box-none">
            <Text style={styles.headerTitle}>차단 목록</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#4C8BF5" />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>목록을 불러올 수 없습니다.</Text>
              <Pressable style={styles.retryBtn} onPress={() => fetchList()}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : blocks.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>차단한 사용자가 없습니다.</Text>
            </View>
          ) : (
            blocks.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.userLabel}>{b.blockedNickname ?? `사용자 #${b.blockedId}`}</Text>
                  <Pressable
                    style={[styles.unblockBtn, unblockingId === b.blockedId && styles.unblockBtnDisabled]}
                    onPress={() => handleUnblock(b.blockedId)}
                    disabled={unblockingId === b.blockedId}
                  >
                    {unblockingId === b.blockedId ? (
                      <ActivityIndicator size="small" color="#4C8BF5" />
                    ) : (
                      <Text style={styles.unblockBtnText}>차단 해제</Text>
                    )}
                  </Pressable>
                </View>
                <Text style={styles.date}>{formatRelativeTime((b as Record<string, unknown>).createdAt as string ?? (b as Record<string, unknown>).created_at as string)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerBack: {
    position: "absolute",
    left: 0,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    position: "absolute",
    right: 0,
    width: 44,
    height: 56,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  errorWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontSize: 14, color: "#6B7280", marginBottom: 12 },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4C8BF5",
    borderRadius: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 14, color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  unblockBtnDisabled: { opacity: 0.7 },
  unblockBtnText: { fontSize: 13, fontWeight: "600", color: "#4C8BF5" },
  date: { fontSize: 12, color: "#9CA3AF" },
});
