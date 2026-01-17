// components/map/FilterModals.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type CommonProps = {
  visible: boolean;
  onClose: () => void;
};

/* ===========================
   날짜 선택 바텀 시트
   =========================== */

export function DateFilterModal({ visible, onClose }: CommonProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* 뒤 배경 */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* 바텀 영역 */}
      <View style={styles.bottomSheet}>
        {/* 실제 흰색 카드 부분 */}
        <View style={styles.sheetCard}>
          {/* 헤더 */}
          <View style={styles.bottomHeader}>
            <Text style={styles.bottomTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* 월 표시 */}
          <View style={styles.monthHeader}>
            <TouchableOpacity hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.monthText}>2026년 1월</Text>
            <TouchableOpacity hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* 요일 */}
          <View style={styles.weekRow}>
            {weekDays.map(d => (
              <Text key={d} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* 날짜 그리드 */}
          <View style={styles.daysGrid}>
            {days.map(day => {
              const active = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, active && styles.dayCellActive]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.dayText, active && styles.dayTextActive]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 적용하기 버튼 */}
          <TouchableOpacity
            style={styles.applyButton}
            activeOpacity={0.9}
            onPress={onClose}
          >
            <Text style={styles.applyButtonText}>적용하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ===========================
   공통 리스트 모달
   =========================== */

type ListOption = { label: string; value: string };

type ListModalProps = CommonProps & {
  title: string;
  options: ListOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
};

function ListFilterModal({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: ListModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.centerOverlay}>
        <View style={styles.card}>
          {/* 상단 타이틀 & 닫기 */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* 옵션 리스트 */}
          {options.map(option => {
            const active = selectedValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => onSelect(option.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                {active && (
                  <View style={styles.radioOuter}>
                    <View style={styles.radioInner} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

/* ===========================
   카테고리 / 인기 / 지역 / 규모 모달
   =========================== */

export function CategoryFilterModal(props: CommonProps) {
  const [selected, setSelected] = useState('performance');
  return (
    <ListFilterModal
      {...props}
      title="카테고리 선택"
      selectedValue={selected}
      onSelect={setSelected}
      options={[
        { label: '전체', value: 'all' },
        { label: '공연', value: 'performance' },
        { label: '푸드트럭', value: 'foodtruck' },
        { label: '체험·부스', value: 'booth' },
        { label: '전시', value: 'exhibition' },
      ]}
    />
  );
}

export function PopularFilterModal(props: CommonProps) {
  const [selected, setSelected] = useState('popular');
  return (
    <ListFilterModal
      {...props}
      title="인기 추천"
      selectedValue={selected}
      onSelect={setSelected}
      options={[
        { label: '전체', value: 'all' },
        { label: '지금 뜨는 축제', value: 'trending' },
        { label: '조회수 많은 순', value: 'views' },
        { label: '인기순', value: 'popular' },
      ]}
    />
  );
}

export function RegionFilterModal(props: CommonProps) {
  const [selected, setSelected] = useState('nearby');
  return (
    <ListFilterModal
      {...props}
      title="지역"
      selectedValue={selected}
      onSelect={setSelected}
      options={[
        { label: '전체', value: 'all' },
        { label: '내 주변', value: 'nearby' },
        { label: '캠퍼스', value: 'campus' },
        { label: '시·구 선택', value: 'city' },
      ]}
    />
  );
}

export function ScaleFilterModal(props: CommonProps) {
  const [selected, setSelected] = useState('univ');
  return (
    <ListFilterModal
      {...props}
      title="규모"
      selectedValue={selected}
      onSelect={setSelected}
      options={[
        { label: '전체', value: 'all' },
        { label: '시·군·구', value: 'city' },
        { label: '대학교', value: 'univ' },
        { label: '단과대/학생회', value: 'college' },
        { label: '동아리/소모임', value: 'club' },
        { label: '개인', value: 'personal' },
      ]}
    />
  );
}

/* ===========================
   스타일
   =========================== */

const styles = StyleSheet.create({
  // 공통 반투명 배경
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  // 날짜 바텀시트 컨테이너
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },

  // 실제 흰색 카드 (양옆 여백 주기)
  sheetCard: {
    marginHorizontal: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  bottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  monthText: {
    marginHorizontal: 32,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },

  // 요일 / 날짜 정렬
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayText: {
    width: '14.2857%', // 100 / 7
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  dayCell: {
    width: '14.2857%',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellActive: {
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },
  dayText: {
    fontSize: 13,
    color: '#111827',
  },
  dayTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  applyButton: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#2563eb',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // 리스트형 모달 공통
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '86%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  optionLabel: {
    fontSize: 14,
    color: '#111827',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
});
