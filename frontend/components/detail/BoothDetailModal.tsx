// frontend/components/detail/BoothDetailModal.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Booth } from "./EventBoothTab"; // 아래에서 export 해줄 거라 이 경로 그대로 사용

interface Props {
  visible: boolean;
  booth: Booth | null;
  eventId?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClose: (e?: GestureResponderEvent) => void;
}

export default function BoothDetailModal({
  visible,
  booth,
  eventId,
  isFavorite = false,
  onToggleFavorite,
  onClose,
}: Props) {
  if (!visible || !booth) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* 어두운 배경 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* 가운데 카드 */}
      <View style={styles.card}>
        {/* 상단 이름 + 즐겨찾기 */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boothName}>{booth.name}</Text>
            {!!booth.time && (
              <Text style={styles.metaText}>운영시간: {booth.time}</Text>
            )}
            {!!booth.host && (
              <Text style={styles.metaText}>주최: {booth.host}</Text>
            )}
          </View>
          {eventId != null && onToggleFavorite ? (
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={10}
              style={styles.starButton}
            >
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={24}
                color={isFavorite ? "#EAB308" : "#D1D5DB"}
              />
            </Pressable>
          ) : (
            <Ionicons name="star-outline" size={24} color="#D1D5DB" />
          )}
        </View>

        {/* 내용 영역 */}
        {booth.type === "food" && booth.menu && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>메뉴</Text>
            {booth.menu.map((m) => (
              <Text key={m} style={styles.bodyText}>
                {m}
              </Text>
            ))}
          </View>
        )}

        {booth.type === "experience" && (
          <>
            {booth.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>이벤트 방식</Text>
                <Text style={styles.bodyText}>{booth.description}</Text>
              </View>
            )}
            {booth.rules && booth.rules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>진행 규칙</Text>
                {booth.rules.map((r) => (
                  <Text key={r} style={styles.bodyText}>
                    • {r}
                  </Text>
                ))}
              </View>
            )}
            {booth.prizes && booth.prizes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>시상 및 상품 안내</Text>
                {booth.prizes.map((p) => (
                  <Text key={p} style={styles.bodyText}>
                    • {p}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}

        {/* 외부 링크 (맨 아래) */}
        {booth.externalLink && booth.externalLink.trim() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>외부 링크</Text>
            <Pressable
              onPress={() => {
                const url = booth.externalLink!.trim();
                const toOpen = url.startsWith("http") ? url : `https://${url}`;
                Linking.openURL(toOpen).catch(() => {});
              }}
              style={styles.linkRow}
            >
              <Ionicons name="link" size={16} color="#4C8BF5" />
              <Text style={styles.linkText} numberOfLines={1}>
                {booth.externalLink!.trim()}
              </Text>
              <Ionicons name="open-outline" size={14} color="#4C8BF5" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    width: "82%",
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  boothName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
  },
  starButton: {
    marginLeft: 8,
    padding: 4,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  bodyText: {
    fontSize: 12,
    color: "#444",
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    color: "#4C8BF5",
    flex: 1,
  },
});
