// frontend/components/detail/BoothLayoutMap.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventBoothItem } from "../../types/event";
import {
  getBoothVisual,
  type BoothIconName,
  type BoothKind,
} from "../../utils/boothVisual";

interface Props {
  foodBooths?: EventBoothItem[] | null;
  experienceBooths?: EventBoothItem[] | null;
  eventId?: number;
  eventTitle?: string;
}

const FOOD = {
  border: "#E8763A",
  chipBg: "#FFE7D8",
  text: "#B85721",
};

const EXP = {
  border: "#4D86CC",
  chipBg: "#E8F1FD",
  text: "#2F63A7",
};

const CARD_HEIGHT = 78;
const CARD_GAP = 10;
const SECTION_HEADER_HEIGHT = 48;
const SECTION_GAP = 34;

type SelectedBooth = EventBoothItem & { colorType: BoothKind };

function splitColumns<T>(items: T[]) {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

function sectionHeight(rowCount: number) {
  const rows = Math.max(rowCount, 1);
  return (
    SECTION_HEADER_HEIGHT +
    rows * CARD_HEIGHT +
    Math.max(rows - 1, 0) * CARD_GAP
  );
}

function normalizeExternalLink(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("@")) return `https://instagram.com/${trimmed.slice(1)}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function MapLabel({
  label,
  subLabel,
  icon,
  backgroundColor,
  borderColor,
  textColor = "#374151",
  style,
}: {
  label: string;
  subLabel?: string;
  icon?: BoothIconName;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.mapLabel, { backgroundColor, borderColor }, style]}>
      <View style={styles.mapLabelRow}>
        {icon ? <Ionicons name={icon} size={14} color={textColor} /> : null}
        <Text
          style={[styles.mapLabelText, { color: textColor }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </View>

      {subLabel ? (
        <Text
          style={[styles.mapLabelSubText, { color: textColor }]}
          numberOfLines={2}
        >
          {subLabel}
        </Text>
      ) : null}
    </View>
  );
}

function BoothCard({
  booth,
  colorType,
  spotCode,
  onPress,
}: {
  booth: EventBoothItem;
  colorType: BoothKind;
  spotCode: string;
  onPress: () => void;
}) {
  const theme = colorType === "food" ? FOOD : EXP;
  const visual = getBoothVisual(booth, colorType);

  return (
    <Pressable
      style={[styles.boothCard, { borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.boothCardTop}>
        <View style={[styles.boothIconBubble, { backgroundColor: theme.chipBg }]}>
          <Ionicons name={visual.icon} size={14} color={theme.text} />
        </View>
        <Text style={[styles.spotCode, { color: theme.text }]}>{spotCode}</Text>
      </View>

      <Text style={styles.boothName} numberOfLines={2}>
        {booth.name}
      </Text>

      <Text style={[styles.boothCategory, { color: theme.text }]} numberOfLines={1}>
        {visual.label}
      </Text>
    </Pressable>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {items.map((item, idx) => (
        <Text key={`${title}-${idx}`} style={styles.detailBullet}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export default function BoothLayoutMap({
  foodBooths,
  experienceBooths,
}: Props) {
  const [selected, setSelected] = useState<SelectedBooth | null>(null);

  const food = foodBooths ?? [];
  const exp = experienceBooths ?? [];

  const [foodLeft, foodRight] = useMemo(() => splitColumns(food), [food]);
  const [expLeft, expRight] = useMemo(() => splitColumns(exp), [exp]);

  const foodRows = Math.max(foodLeft.length, foodRight.length, 1);
  const expRows = Math.max(expLeft.length, expRight.length, 1);

  const foodHeight = sectionHeight(foodRows);
  const expHeight = sectionHeight(expRows);

  const foodTop = 82;
  const expTop = foodTop + foodHeight + SECTION_GAP;
  const canvasHeight = expTop + expHeight + 84;

  const selectedTheme = selected?.colorType === "food" ? FOOD : EXP;
  const selectedVisual = selected
    ? getBoothVisual(selected, selected.colorType)
    : null;

  const openExternalLink = async () => {
    if (!selected?.externalLink) return;

    const url = normalizeExternalLink(selected.externalLink);

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (e) {
      console.warn("외부 링크 열기 실패", e);
    }
  };

  const renderGrid = (
    items: EventBoothItem[],
    leftItems: EventBoothItem[],
    rightItems: EventBoothItem[],
    kind: BoothKind
  ) => {
    const prefix = kind === "food" ? "F" : "B";

    if (items.length === 0) {
      return (
        <View style={styles.emptyArea}>
          <Ionicons name="information-circle-outline" size={18} color="#94A3B8" />
          <Text style={styles.emptyText}>
            {kind === "food"
              ? "등록된 푸드트럭 정보가 없습니다."
              : "등록된 동아리 / 체험부스 정보가 없습니다."}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.gridRow}>
        <View style={styles.gridColumn}>
          {leftItems.map((booth, idx) => (
            <BoothCard
              key={`${kind}-left-${booth.id}-${idx}`}
              booth={booth}
              colorType={kind}
              spotCode={`${prefix}${String(idx + 1).padStart(2, "0")}`}
              onPress={() => setSelected({ ...booth, colorType: kind })}
            />
          ))}
        </View>

        <View style={styles.gridColumn}>
          {rightItems.map((booth, idx) => (
            <BoothCard
              key={`${kind}-right-${booth.id}-${idx}`}
              booth={booth}
              colorType={kind}
              spotCode={`${prefix}${String(leftItems.length + idx + 1).padStart(
                2,
                "0"
              )}`}
              onPress={() => setSelected({ ...booth, colorType: kind })}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={styles.headerCard}>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: FOOD.border }]} />
            <Text style={styles.legendText}>푸드트럭</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EXP.border }]} />
            <Text style={styles.legendText}>동아리 / 체험부스</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#94A3B8" }]} />
            <Text style={styles.legendText}>시설 / 공간</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mapCanvas, { height: canvasHeight }]}>
        <View style={styles.baseGround} />

        <View style={styles.leftGreenArea} />
        <View style={styles.mainRoad} />
        <View style={styles.parkingArea} />

        <View style={styles.topRoadJoint} />
        <View style={styles.bottomRoadJoint} />
        <View style={styles.roadCenterLine} />

        <View style={styles.parkingTitleBox}>
          <Ionicons name="car-outline" size={16} color="#64748B" />
          <Text style={styles.parkingTitle}>주차장</Text>
        </View>

        {Array.from({ length: 13 }).map((_, idx) => (
          <View
            key={`parking-${idx}`}
            style={[styles.parkingLine, { top: 92 + idx * 38 }]}
          />
        ))}

        <View style={styles.crosswalk}>
          {Array.from({ length: 8 }).map((_, idx) => (
            <View key={`cw-${idx}`} style={styles.crosswalkLine} />
          ))}
        </View>

        <MapLabel
          label="중앙도서관"
          subLabel="좌측 건물"
          icon="library-outline"
          backgroundColor="#F8FAFC"
          borderColor="#D7DEE8"
          style={styles.libraryLabel}
        />

        <MapLabel
          label="피크닉존"
          subLabel="잔디광장"
          icon="leaf-outline"
          backgroundColor="#EAF6E8"
          borderColor="#B6D8AE"
          textColor="#497342"
          style={styles.picnicLabel}
        />

        <MapLabel
          label="노천극장"
          subLabel="동아리 무대"
          icon="musical-notes-outline"
          backgroundColor="#FFF6EE"
          borderColor="#E9CDB8"
          textColor="#8A5C4B"
          style={styles.stageLabel}
        />

        <MapLabel
          label="클린존"
          icon="trash-outline"
          backgroundColor="#F8FAFC"
          borderColor="#D7DEE8"
          style={styles.cleanZone}
        />

        <View style={[styles.roadSection, { top: foodTop, height: foodHeight }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionChip, { backgroundColor: FOOD.chipBg }]}>
              <Ionicons name="fast-food-outline" size={14} color={FOOD.text} />
              <Text style={[styles.sectionChipText, { color: FOOD.text }]}>
                푸드트럭 존
              </Text>
            </View>
            <Text style={styles.sectionHint}>도로 상단 구간</Text>
          </View>

          {renderGrid(food, foodLeft, foodRight, "food")}
        </View>

        <View style={[styles.zoneDivider, { top: expTop - 18 }]} />

        <View style={[styles.roadSection, { top: expTop, height: expHeight }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionChip, { backgroundColor: EXP.chipBg }]}>
              <Ionicons name="people-outline" size={14} color={EXP.text} />
              <Text style={[styles.sectionChipText, { color: EXP.text }]}>
                동아리 / 체험부스 존
              </Text>
            </View>
            <Text style={styles.sectionHint}>도로 하단 구간</Text>
          </View>

          {renderGrid(exp, expLeft, expRight, "experience")}
        </View>

        <View style={styles.bottomInfoCard}>
          <Ionicons name="information-circle-outline" size={14} color="#64748B" />
          <Text style={styles.bottomInfoText}>
            부스를 탭하면 운영시간, 메뉴, 설명 등 상세 정보를 확인할 수 있어요.
          </Text>
        </View>
      </View>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} />
          {selected && selectedVisual ? (
              <View style={[styles.modalCard, { borderColor: selectedTheme.border }]}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTop}>
                    <View
                      style={[
                        styles.modalTypeChip,
                        {
                          backgroundColor: selectedTheme.chipBg,
                          borderColor: selectedTheme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalTypeChipText,
                          { color: selectedTheme.text },
                        ]}
                      >
                        {selected.colorType === "food"
                          ? "푸드트럭"
                          : "동아리 / 체험부스"}
                      </Text>
                    </View>

                    <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                      <Ionicons name="close" size={24} color="#6B7280" />
                    </Pressable>
                  </View>

                  <View style={styles.modalTitleRow}>
                    <View
                      style={[
                        styles.modalVisualBubble,
                        { backgroundColor: selectedTheme.chipBg },
                      ]}
                    >
                      <Ionicons name={selectedVisual.icon} size={30} color={selectedTheme.text} />
                    </View>

                    <View style={styles.modalTitleTextArea}>
                      <Text style={styles.modalTitle}>{selected.name}</Text>
                      <Text
                        style={[
                          styles.modalCategory,
                          { color: selectedTheme.text },
                        ]}
                      >
                        {selectedVisual.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaList}>
                    {selected.time ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={15} color="#6B7280" />
                        <Text style={styles.metaText}>운영시간: {selected.time}</Text>
                      </View>
                    ) : null}

                    {selected.host ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="person-outline" size={15} color="#6B7280" />
                        <Text style={styles.metaText}>운영주체: {selected.host}</Text>
                      </View>
                    ) : null}

                    {selected.locationLabel ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={15} color="#6B7280" />
                        <Text style={styles.metaText}>위치: {selected.locationLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalBodyContent}
                  showsVerticalScrollIndicator={false}
                >
                  {selected.description ? (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>소개</Text>
                      <Text style={styles.detailDescription}>
                        {selected.description}
                      </Text>
                    </View>
                  ) : null}

                  {selected.menu && selected.menu.length > 0 ? (
                    <DetailSection title="메뉴" items={selected.menu} />
                  ) : null}

                  {selected.rules && selected.rules.length > 0 ? (
                    <DetailSection
                      title="참여 방법 / 유의사항"
                      items={selected.rules}
                    />
                  ) : null}

                  {selected.prizes && selected.prizes.length > 0 ? (
                    <DetailSection title="상품 / 혜택" items={selected.prizes} />
                  ) : null}
                </ScrollView>

                <View style={styles.modalFooter}>
                  {selected.externalLink ? (
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonLight]}
                      onPress={openExternalLink}
                    >
                      <Ionicons name="open-outline" size={15} color="#374151" />
                      <Text style={styles.modalButtonLightText}>외부 링크</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={() => setSelected(null)}
                  >
                    <Text style={styles.modalButtonPrimaryText}>닫기</Text>
                  </Pressable>
                </View>
              </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginTop: 6,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  mapCanvas: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F8FAFC",
  },
  baseGround: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8FAFC",
  },

  leftGreenArea: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "25%",
    backgroundColor: "#EAF6E8",
  },
  mainRoad: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "25%",
    width: "58%",
    backgroundColor: "#D1D7DF",
  },
  parkingArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "17%",
    backgroundColor: "#E8EDF3",
  },
  topRoadJoint: {
    position: "absolute",
    top: 0,
    left: "25%",
    width: "58%",
    height: 46,
    backgroundColor: "#BFC7D1",
  },
  bottomRoadJoint: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    width: "58%",
    height: 46,
    backgroundColor: "#BFC7D1",
  },
  roadCenterLine: {
    position: "absolute",
    top: 20,
    bottom: 20,
    left: "54%",
    width: 3,
    backgroundColor: "rgba(255,255,255,0.68)",
  },

  parkingTitleBox: {
    position: "absolute",
    top: 56,
    right: "2.5%",
    width: "12%",
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    gap: 2,
  },
  parkingTitle: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#64748B",
  },
  parkingLine: {
    position: "absolute",
    right: "3%",
    width: "11%",
    height: 1.2,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  crosswalk: {
    position: "absolute",
    left: "39%",
    bottom: 18,
    width: "32%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  crosswalkLine: {
    width: 7,
    height: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },

  mapLabel: {
    position: "absolute",
    borderWidth: 1.2,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  mapLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  mapLabelText: {
    fontSize: 10.5,
    fontWeight: "900",
    lineHeight: 14,
    flexShrink: 1,
  },
  mapLabelSubText: {
    marginTop: 3,
    fontSize: 9.3,
    fontWeight: "700",
    lineHeight: 12,
    opacity: 0.85,
  },

  libraryLabel: {
    top: 22,
    left: 10,
    width: "21%",
  },
  picnicLabel: {
    top: 154,
    left: 14,
    width: "19%",
    minHeight: 92,
    justifyContent: "center",
  },
  stageLabel: {
    top: 1000,
    left: 9,
    width: "22%",
    minHeight: 96,
    justifyContent: "center",
  },
  cleanZone: {
    top: 110,
    left: "4%",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  roadSection: {
    position: "absolute",
    left: "31%",
    width: "46%",
  },
  sectionHeader: {
    height: SECTION_HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  sectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  sectionHint: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "700",
  },

  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  gridColumn: {
    flex: 1,
    gap: CARD_GAP,
  },

  boothCard: {
    height: CARD_HEIGHT,
    borderRadius: 17,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  boothCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boothIconBubble: {
    width: 27,
    height: 27,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  spotCode: {
    fontSize: 10,
    fontWeight: "900",
  },
  boothName: {
    fontSize: 11,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    lineHeight: 14,
  },
  boothCategory: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  zoneDivider: {
    position: "absolute",
    left: "30%",
    width: "48%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
  },

  emptyArea: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    backgroundColor: "rgba(255,255,255,0.68)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  bottomInfoCard: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bottomInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: "#64748B",
    fontWeight: "700",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "88%",
    maxWidth: 420,
    maxHeight: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTypeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  modalTypeChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    marginBottom: 14,
  },
  modalVisualBubble: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitleTextArea: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 5,
    lineHeight: 28,
  },
  modalCategory: {
    fontSize: 14,
    fontWeight: "900",
  },
  metaList: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  modalBody: {
    maxHeight: 360,
  },
  modalBodyContent: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 18,
  },
  detailSection: {
    gap: 9,
  },
  detailSectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
  },
  detailBullet: {
    fontSize: 15,
    lineHeight: 23,
    color: "#4B5563",
  },

  modalFooter: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 10,
  },
  modalButton: {
    width: "100%",
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  modalButtonLight: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonPrimary: {
    backgroundColor: "#111827",
  },
  modalButtonLightText: {
    color: "#374151",
    fontWeight: "800",
    fontSize: 14,
  },
  modalButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
});