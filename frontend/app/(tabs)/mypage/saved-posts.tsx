// 저장한 게시글 목록 (로컬 저장) - UI는 내가 쓴 게시글(board-history)과 동일
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as savedPostService from "../../../services/savedPost.service";
import { formatRelativeTime } from "../../../utils/formatDate";

type SavedRow = {
  id: string;
  title: string;
  time: string;
};

export default function SavedPostsScreen() {
  const router = useRouter();
  const [list, setList] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const filteredList = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      (item.title ?? "").toLowerCase().includes(q)
    );
  }, [list, appliedSearch]);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await savedPostService.getSavedPostSummaries();
      setList(
        (data ?? []).map((p) => ({
          id: String(p.id),
          title: p.title || `게시글 #${p.id}`,
          time: p.createdAt ? formatRelativeTime(p.createdAt) : "",
        }))
      );
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

  const handleUnsave = (postId: string) => {
    setMenuPostId(null);
    const id = Number(postId);
    if (!Number.isFinite(id)) return;
    savedPostService.toggleSavedPost(id, "", "").then(() => load(true));
  };

  const handleCopyLink = async (postId: string) => {
    setMenuPostId(null);
    const link = `https://dailo.app/board/${postId}`;
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert("복사됨", "링크가 클립보드에 복사되었습니다.");
    } catch {
      Alert.alert("오류", "링크 복사에 실패했습니다.");
    }
  };

  const renderPost = ({ item }: { item: SavedRow }) => (
    <Pressable style={styles.postRow} onPress={() => router.push(`/board/${item.id}`)}>
      <View style={styles.postRowBody}>
        <View style={styles.postRowTop}>
          <Text style={styles.timeText}>{item.time || "저장한 글"}</Text>
        </View>
        {item.title ? (
          <Text style={styles.postTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
        ) : null}
        <View style={styles.postRowFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="bookmark" size={14} color="#6366F1" />
            <Text style={styles.footerText}>저장됨</Text>
          </View>
        </View>
      </View>
      <Pressable
        style={styles.dotsBtn}
        onPress={(e) => {
          e.stopPropagation();
          setMenuPostId(item.id);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={styles.headerTitleWrap} pointerEvents="box-none">
            <Text style={styles.headerTitle}>저장한 게시글</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {list.length > 0 ? (
          <View style={styles.searchBarWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="제목 검색"
              placeholderTextColor="#9CA3AF"
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              returnKeyType="search"
              onSubmitEditing={() => setAppliedSearch(searchKeyword.trim())}
            />
            {searchKeyword.length > 0 ? (
              <Pressable
                onPress={() => setSearchKeyword("")}
                style={styles.searchClear}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setAppliedSearch(searchKeyword.trim())}
              style={styles.searchButton}
              hitSlop={8}
            >
              <Ionicons name="search" size={22} color="#4C8BF5" />
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
        >
          {loading && list.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#4C8BF5" />
              <Text style={styles.loadingText}>불러오는 중...</Text>
            </View>
          ) : list.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>저장한 게시글이 없습니다.</Text>
            </View>
          ) : (
            <>
              <View style={styles.listWrap}>
                <FlatList
                  data={filteredList}
                  keyExtractor={(item) => item.id}
                  renderItem={renderPost}
                  scrollEnabled={false}
                />
              </View>
              {filteredList.length === 0 && appliedSearch.trim() ? (
                <Text style={styles.searchEmpty}>조건에 맞는 게시글이 없어요</Text>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      {/* 더보기 메뉴: 저장 해제, 링크 복사 */}
      <Modal visible={!!menuPostId} transparent animationType="fade">
        <Pressable style={styles.menuOverlay} onPress={() => setMenuPostId(null)}>
          <View style={styles.menuCard}>
            <Pressable
              style={styles.menuItem}
              onPress={() => menuPostId && handleUnsave(menuPostId)}
            >
              <Text style={[styles.menuText, styles.menuTextDanger]}>저장 해제</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => menuPostId && handleCopyLink(menuPostId)}
            >
              <Text style={styles.menuText}>링크 복사</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
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
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 8,
  },
  searchClear: { padding: 4 },
  searchButton: { padding: 4, marginLeft: 4 },
  searchEmpty: {
    paddingVertical: 24,
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  listWrap: {
    marginHorizontal: -24,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6B7280" },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  emptyText: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  postRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  postRowBody: { flex: 1, minWidth: 0, marginRight: 8 },
  dotsBtn: { padding: 8, margin: -8 },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: { paddingVertical: 14, paddingHorizontal: 20 },
  menuText: { fontSize: 15, color: "#111827" },
  menuTextDanger: { color: "#DC2626" },
  postRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  postTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  postRowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
