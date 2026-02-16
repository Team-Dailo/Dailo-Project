// 관리자 - 게시글 관리: 검색, 카테고리 필터, 목록, 삭제
import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as boardService from "../../../services/board.service";
import * as adminService from "../../../services/admin.service";
import type { PostListItem } from "../../../types/board";

const CATEGORIES = ["전체", "후기", "질문", "자유"] as const;
type CategoryType = (typeof CATEGORIES)[number];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export default function AdminPostsScreen() {
  const [keyword, setKeyword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryType>("전체");
  const [page, setPage] = useState({ content: [] as PostListItem[], totalPages: 0, number: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false, search = searchQuery, cat = category) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const pageNum = refresh ? 0 : page.number;
      try {
        let data: boardService.PageResponse<PostListItem>;
        if (search.trim()) {
          data = await boardService.searchPosts(search.trim(), { page: pageNum, size: 20 });
        } else if (cat === "전체") {
          data = await boardService.getPostList({ page: pageNum, size: 20 });
        } else {
          data = await boardService.getPostListByCategory(cat, { page: pageNum, size: 20 });
        }
        setPage({
          content: data.content ?? [],
          totalPages: data.totalPages ?? 0,
          number: data.number ?? 0,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "목록 조회 실패");
        setPage((prev) => ({ ...prev, content: [] }));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, category, page.number]
  );

  useFocusEffect(
    useCallback(() => {
      load(true, searchQuery, category);
    }, [load, searchQuery, category])
  );

  const handleSearch = () => {
    setSearchQuery(keyword.trim());
    load(true, keyword.trim(), category);
  };

  const handleCategoryChange = (cat: CategoryType) => {
    setCategory(cat);
    load(true, searchQuery, cat);
  };

  const handleDelete = (item: PostListItem) => {
    Alert.alert(
      "게시글 삭제",
      `"${item.title}"을(를) 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await adminService.deleteAdminPost(item.id);
              load(true, searchQuery, category);
            } catch (e) {
              Alert.alert("오류", e instanceof Error ? e.message : "삭제 실패");
            }
          },
        },
      ]
    );
  };

  if (loading && page.content.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4C8BF5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 검색창 - 저장한 축제/행사관리와 동일 스타일(흰 배경) */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="제목·내용 또는 게시글 ID(숫자)로 검색"
          placeholderTextColor="#9CA3AF"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {keyword.length > 0 ? (
          <Pressable
            onPress={() => {
              setKeyword("");
              setSearchQuery("");
              load(true, "", category);
            }}
            style={styles.searchClear}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {/* 카테고리 */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const selected = category === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.categoryChip, selected && styles.categoryChipSelected]}
              onPress={() => handleCategoryChange(cat)}
            >
              <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {page.content.length === 0 ? (
        <Text style={styles.empty}>해당하는 게시글이 없습니다.</Text>
      ) : (
        <FlatList
          data={page.content}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true, searchQuery, category)} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                style={styles.row}
                onPress={() => {}}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.title} numberOfLines={1}>
                    [{item.id}] {item.title}
                  </Text>
                  <Text style={styles.meta}>
                    {item.authorNickname ?? `ID ${item.authorId}`} · {item.categoryType} · {formatDate(item.createdAt)}
                  </Text>
                  {item.contentPreview ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      {item.contentPreview}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </Pressable>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    paddingRight: 8,
  },
  searchClear: { padding: 4 },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  categoryChipSelected: {
    backgroundColor: "#4C8BF5",
  },
  categoryChipText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  categoryChipTextSelected: { color: "#FFFFFF" },
  error: { color: "#DC2626", marginHorizontal: 16, marginBottom: 8, fontSize: 14 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 24, fontSize: 14 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  cardBody: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  preview: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: { fontSize: 13, color: "#DC2626", fontWeight: "600" },
});
