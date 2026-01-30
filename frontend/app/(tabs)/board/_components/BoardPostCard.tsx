import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BoardPost } from "../../../../types/board";

type Props = {
  post: BoardPost;
  timeLabel: string;
  onPress: () => void;
  onMorePress?: () => void;
};

export default function BoardPostCard({
  post,
  timeLabel,
  onPress,
  onMorePress,
}: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* 상단: 프로필 + 닉네임 + 시간 + 더보기 */}
      <View style={styles.topRow}>
        <View style={styles.profileRow}>
          {post.authorAvatarUrl ? (
            <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}

          <View>
            <Text style={styles.name}>{post.authorName}</Text>
            <Text style={styles.meta}>
              {timeLabel} · <Text style={styles.badge}>{post.category}</Text>
            </Text>
          </View>
        </View>

        <Pressable onPress={onMorePress} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
        </Pressable>
      </View>

      {/* 본문 */}
      <Text style={styles.content} numberOfLines={4}>
        {post.content}
      </Text>

      {/* 하단: 좋아요/댓글 */}
      <View style={styles.bottomRow}>
        <View style={styles.iconRow}>
          <Ionicons name="heart-outline" size={18} color="#444" />
          <Text style={styles.count}>{post.likeCount}</Text>
        </View>

        <View style={styles.iconRow}>
          <Ionicons name="chatbubble-outline" size={18} color="#444" />
          <Text style={styles.count}>{post.commentCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  topRow: { flexDirection: "row", justifyContent: "space-between" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEE" },
  avatarFallback: { backgroundColor: "#E7E7E7" },
  name: { fontSize: 14, fontWeight: "800", color: "#111" },
  meta: { fontSize: 12, color: "#777", marginTop: 2 },
  badge: { color: "#555", fontWeight: "800" },
  content: { marginTop: 10, fontSize: 13.5, lineHeight: 19, color: "#111" },
  bottomRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 12, color: "#444", fontWeight: "700" },
});
