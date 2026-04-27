// frontend/components/detail/BoothDetailModal.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  GestureResponderEvent,
  Linking,
  Modal,
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

  const formatPriceLabel = (raw: string): string | null => {
    const s = raw.trim();
    // 이미 "5천원" 같은 형태가 들어오는 경우
    const wonThousand = s.match(/(\d+)\s*천원/i);
    if (wonThousand) return `${wonThousand[1]}천원`;

    const won = s.match(/([\d,]+)\s*원/i);
    if (!won) return null;
    const value = parseInt(won[1].replace(/,/g, ""), 10);
    if (Number.isNaN(value)) return null;

    if (value % 1000 === 0) return `${value / 1000}천원`;
    if (value >= 1000) return `${Math.round(value / 1000)}천원`;
    return `${value}원`;
  };

  const formatQuantityLabel = (raw: string): string | null => {
    const s = raw.trim();
    const asKorean = s.match(/(\d+)\s*개/i);
    if (asKorean) return `${asKorean[1]}개`;

    // admin input 예: (6pcs)
    const asPcs = s.match(/(\d+)\s*pcs/i);
    if (asPcs) return `${asPcs[1]}개`;

    const asEa = s.match(/(\d+)\s*ea/i);
    if (asEa) return `${asEa[1]}개`;

    return null;
  };

  const formatFoodMenuLine = (line: string): string => {
    const normalized = line.replace(/[—–]/g, "-");
    const parts = normalized
      .split("-")
      .map((p) => p.trim())
      .filter(Boolean);
    const left = parts[0] ?? normalized;
    const right = parts[parts.length - 1] ?? "";

    const qty = formatQuantityLabel(left);
    const price = formatPriceLabel(right);
    if (qty && price) return `${qty} — ${price}`;

    // fallback: 구분자만 화면용으로 바꿔줌
    return line.replace(/[—–]/g, "—").replace(/\s*-\s*/g, " — ");
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalRoot} pointerEvents="box-none">
        {/* 어두운 배경 */}
        <Pressable style={styles.backdrop} onPress={() => onClose()} />

        {/* 가운데 카드 */}
        <View style={styles.card}>
        {/* 상단 아이콘 + 이름/운영시간 + 즐겨찾기 */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="megaphone-outline" size={18} color="#4C8BF5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.boothName}>{booth.name}</Text>
              {!!booth.time && (
                <Text style={styles.metaText}>운영시간: {booth.time}</Text>
              )}
              {!!booth.host && (
                <Text style={styles.metaText}>주최: {booth.host}</Text>
              )}
            </View>
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

        {/* 내용 영역 — 스크롤 가능 */}
        <ScrollView
          style={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {booth.type === "food" && booth.menu && booth.menu.length > 0 && (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>메뉴</Text>
                {booth.menu.map((m) => (
                  <View key={m} style={styles.menuCard}>
                    <Text style={styles.menuCardText}>{formatFoodMenuLine(m)}</Text>
                  </View>
                ))}
              </View>
            </>
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
          <View style={styles.scrollBottomPad} />
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
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
    maxHeight: "78%",
    borderRadius: 20,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 0,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollBottomPad: {
    height: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFE9C7",
    justifyContent: "center",
    alignItems: "center",
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
  infoDivider: {
    marginTop: 10,
    marginBottom: 10,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
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
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  menuCardText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
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
