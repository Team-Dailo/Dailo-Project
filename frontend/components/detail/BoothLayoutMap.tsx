import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Modal, TouchableOpacity,
} from 'react-native';
import type { EventBoothItem } from '../../types/event';

interface Props {
  foodBooths?: EventBoothItem[] | null;
  experienceBooths?: EventBoothItem[] | null;
  eventId?: number;
  eventTitle?: string;
}

// 푸드트럭 = 주황 라인, 체험부스 = 파랑 라인, 배경은 모두 흰색
const FOOD = { bg: '#FFFFFF', border: '#E8763A', text: '#C05E25' };
const EXP  = { bg: '#FFFFFF', border: '#4D86CC', text: '#2D66AA' };

type SelectedBooth = EventBoothItem & { colorType: 'food' | 'exp' };

export default function BoothLayoutMap({ foodBooths, experienceBooths }: Props) {
  const [selected, setSelected] = useState<SelectedBooth | null>(null);

  const food = foodBooths ?? [];
  const exp  = experienceBooths ?? [];

  // 앞절반 = 왼쪽 열, 뒷절반 = 오른쪽 열
  const foodMid = Math.ceil(food.length / 2);
  const foodLeft  = food.slice(0, foodMid);
  const foodRight = food.slice(foodMid);

  const expMid = Math.ceil(exp.length / 2);
  const expLeft  = exp.slice(0, expMid);
  const expRight = exp.slice(expMid);

  function BoothCard({ booth, colorType }: { booth: EventBoothItem; colorType: 'food' | 'exp' }) {
    const c = colorType === 'food' ? FOOD : EXP;
    return (
      <Pressable
        style={[styles.boothCard, { borderColor: c.border }]}
        onPress={() => setSelected({ ...booth, colorType })}
      >
        <Text style={styles.boothText} numberOfLines={2}>
          {booth.name}
        </Text>
      </Pressable>
    );
  }

  // 한 열: 푸드트럭 → 구분 → 체험부스
  function BoothColumn({ foodItems, expItems }: { foodItems: EventBoothItem[]; expItems: EventBoothItem[] }) {
    return (
      <View style={styles.column}>
        {foodItems.map(b => <BoothCard key={b.id} booth={b} colorType="food" />)}
        {foodItems.length > 0 && expItems.length > 0 && <View style={styles.sectionGap} />}
        {expItems.map(b => <BoothCard key={b.id} booth={b} colorType="exp" />)}
      </View>
    );
  }

  function Tooltip() {
    if (!selected) return null;
    const isFood = selected.colorType === 'food';
    const c = isFood ? FOOD : EXP;
    return (
      <View style={[styles.tooltipCard, { borderColor: c.border }]}>
        <View style={[styles.tooltipHeader, { borderBottomColor: '#F3F4F6' }]}>
          <Text style={styles.tooltipTitle}>{selected.name}</Text>
          {selected.time && <Text style={styles.tooltipMeta}>운영시간: {selected.time}</Text>}
          {selected.host && <Text style={styles.tooltipMeta}>주최: {selected.host}</Text>}
        </View>
        <View style={styles.tooltipBody}>
          {!!selected.description && (
            <Text style={styles.tooltipDesc}>{selected.description}</Text>
          )}
          {isFood && !!selected.menu?.length && (
            <View style={styles.tooltipSection}>
              <Text style={styles.tooltipSectionTitle}>메뉴</Text>
              {selected.menu.map((item, i) => (
                <Text key={i} style={styles.tooltipBullet}>• {item}</Text>
              ))}
            </View>
          )}
          {!isFood && !!selected.prizes?.length && (
            <View style={styles.tooltipSection}>
              <Text style={styles.tooltipSectionTitle}>시상 및 상품</Text>
              {selected.prizes.map((item, i) => (
                <Text key={i} style={styles.tooltipBullet}>• {item}</Text>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.tooltipClose} onPress={() => setSelected(null)}>
          <Text style={styles.tooltipCloseText}>닫기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* 범례 */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: FOOD.border }]} />
          <Text style={styles.legendLabel}>푸드트럭</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: EXP.border }]} />
          <Text style={styles.legendLabel}>체험부스</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
          <Text style={styles.legendLabel}>공간</Text>
        </View>
      </View>

      {/* 지도 */}
      <View style={styles.mapWrapper}>
        <View style={styles.mapRow}>

          {/* 왼쪽: 피크닉존 + 동아리무대 */}
          <View style={styles.leftArea}>
            <View style={styles.picnicZone}>
              <Text style={styles.picnicText}>피크닉존</Text>
            </View>
            <View style={styles.stageBox}>
              <Text style={styles.stageText}>동아리{'\n'}무대</Text>
            </View>
          </View>

          {/* 오른쪽: 클린존 + 두 부스 열 */}
          <View style={styles.rightArea}>
            {/* 클린존 - 두 열 사이 상단 */}
            <View style={styles.cleanZoneRow}>
              <View style={styles.cleanZone}>
                <Text style={styles.cleanZoneText}>클린존</Text>
              </View>
            </View>

            {/* 두 부스 열 */}
            <View style={styles.boothsArea}>
              <BoothColumn foodItems={foodLeft} expItems={expLeft} />
              <View style={styles.columnDivider} />
              <BoothColumn foodItems={foodRight} expItems={expRight} />
            </View>
          </View>

        </View>
      </View>

      <Text style={styles.tapHint}>부스를 탭하면 상세 정보를 볼 수 있어요</Text>

      {/* 툴팁 오버레이 */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1}>
            <Tooltip />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: '#6B7280' },

  mapWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    paddingBottom: 4,
  },

  mapRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },

  // 왼쪽 랜드마크 (피크닉존 + 동아리무대)
  leftArea: {
    width: 66,
    gap: 6,
  },
  picnicZone: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  picnicText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  stageBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },

  // 오른쪽 부스 영역
  rightArea: {
    flex: 1,
    gap: 4,
  },
  cleanZoneRow: {
    alignItems: 'center',
  },
  cleanZone: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  cleanZoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },

  // 두 부스 열
  boothsArea: {
    flexDirection: 'row',
    gap: 4,
  },
  column: {
    flex: 1,
    gap: 3,
  },
  columnDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  sectionGap: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 1,
  },

  // 부스 카드
  boothCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  boothText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 16,
  },

  tapHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 10,
  },

  // 툴팁
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  tooltipMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tooltipBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tooltipDesc: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
  },
  tooltipSection: { gap: 4 },
  tooltipSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  tooltipBullet: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  tooltipClose: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 12,
    alignItems: 'center',
  },
  tooltipCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
});
