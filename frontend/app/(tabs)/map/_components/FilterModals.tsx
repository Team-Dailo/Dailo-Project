// components/map/FilterModals.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAP_UI } from '../../../../constants/colors';

const MARKER_ICON = require('../../../../assets/images/marker-pin.png');

type CommonProps = {
  visible: boolean;
  onClose: () => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_DATE_RANGE_DAYS = 10;

function dayCountInclusive(startYmd: string, endYmd: string): number {
  const start = new Date(startYmd).getTime();
  const end = new Date(endYmd).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstDay = first.getDay();
  const daysCount = last.getDate();
  const leadingBlanks = Array.from({ length: firstDay }, (_, i) => ({ type: 'blank' as const, day: 0 }));
  const days = Array.from({ length: daysCount }, (_, i) => ({ type: 'day' as const, day: i + 1 }));
  return { leadingBlanks, days, year, month };
}

export type DateRange = { start: string; end: string };

type DateFilterModalProps = CommonProps & {
  selectedDateRange: DateRange | null;
  onSelectDateRange: (range: DateRange | null) => void;
};

export function DateFilterModal({ visible, onClose, selectedDateRange, onSelectDateRange }: DateFilterModalProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [rangeStart, setRangeStart] = useState<string | null>(selectedDateRange?.start ?? null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(selectedDateRange?.end ?? null);

  useEffect(() => {
    if (visible) {
      setRangeStart(selectedDateRange?.start ?? null);
      setRangeEnd(selectedDateRange?.end ?? null);
    }
  }, [visible, selectedDateRange?.start, selectedDateRange?.end]);

  const toYmd = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const { leadingBlanks, days, year, month } = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const handleDayPress = (day: number) => {
    const dateStr = toYmd(viewYear, viewMonth, day);
    if (!rangeStart || !rangeEnd) {
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
      return;
    }
    const newStart = dateStr < rangeStart ? dateStr : rangeStart;
    const newEnd = dateStr > rangeEnd ? dateStr : rangeEnd;
    const days = dayCountInclusive(newStart, newEnd);
    if (days > MAX_DATE_RANGE_DAYS) {
      Alert.alert('안내', '최대 10일까지 선택 가능합니다.');
      return;
    }
    setRangeStart(newStart);
    setRangeEnd(newEnd);
  };

  const isInRange = (day: number) => {
    const dateStr = toYmd(viewYear, viewMonth, day);
    if (!rangeStart || !rangeEnd) return dateStr === rangeStart || dateStr === rangeEnd;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  };
  const isStartOrEnd = (day: number) => {
    const dateStr = toYmd(viewYear, viewMonth, day);
    return dateStr === rangeStart || dateStr === rangeEnd;
  };

  const handleApply = () => {
    if (rangeStart && rangeEnd) {
      onSelectDateRange({ start: rangeStart, end: rangeEnd });
    } else {
      onSelectDateRange(null);
    }
    onClose();
  };

  const handleClear = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onSelectDateRange(null);
    onClose();
  };

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.bottomSheet}>
        <View style={styles.sheetCard}>
          <View style={[styles.sheetCardPadding, styles.bottomHeader]}>
            <Text style={styles.bottomTitle}>날짜 선택</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          <View style={[styles.sheetCardPadding, styles.monthHeader]}>
            <TouchableOpacity onPress={prevMonth} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{year}년 {month}월</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.calendarWrap}>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((d) => (
                <Text key={d} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
            {leadingBlanks.map((_, i) => (
              <View key={`b-${i}`} style={styles.dayCell} />
            ))}
            {days.map(({ day }) => {
              const inRange = isInRange(day);
              const isEdge = isStartOrEnd(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    inRange && styles.dayCellInRange,
                    isEdge && styles.dayCellActive,
                  ]}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isEdge && styles.dayTextActive,
                      inRange && !isEdge && styles.dayTextInRange,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
            </View>
          </View>
          <View style={[styles.sheetCardPadding, styles.dateActionsRow]}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear} activeOpacity={0.8}>
              <Text style={styles.clearButtonText}>전체 해제</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.9}>
              <Text style={styles.applyButtonText}>적용하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ===========================
   공통 리스트 모달
   =========================== */

type ListOption = { label: string; value: string; /** 규모 모달용: 마커 tint 색상 */ iconColor?: string };

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

          {/* 옵션 리스트 (iconColor 있으면 왼쪽에 마커 아이콘 표시) */}
          {options.map(option => {
            const active = selectedValue === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.optionRow}
                onPress={() => onSelect(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionLabelWrap}>
                  {option.iconColor != null ? (
                    <Image
                      source={MARKER_ICON}
                      style={[styles.optionMarkerIcon, { tintColor: option.iconColor }]}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </View>
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

/** 백엔드 EventCategory와 동일 (FESTIVAL, EXHIBITION, TRAFFIC, CONSTRUCTION, ETC) */
type CategoryModalProps = CommonProps & {
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function CategoryFilterModal({ selectedValue, onSelect, ...rest }: CategoryModalProps) {
  return (
    <ListFilterModal
      {...rest}
      title="카테고리 선택"
      selectedValue={selectedValue}
      onSelect={onSelect}
      options={[
        { label: '전체', value: 'all' },
        { label: '축제', value: 'FESTIVAL' },
        { label: '전시', value: 'EXHIBITION' },
        { label: '기타', value: 'ETC' },
      ]}
    />
  );
}

type PopularModalProps = CommonProps & {
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function PopularFilterModal({ selectedValue, onSelect, ...rest }: PopularModalProps) {
  return (
    <ListFilterModal
      {...rest}
      title="인기 추천"
      selectedValue={selectedValue}
      onSelect={onSelect}
      options={[
        { label: '전체', value: 'all' },
        { label: '지금 뜨는 축제', value: 'trending' },
        { label: '조회수 많은 순', value: 'views' },
        { label: '인기순', value: 'popular' },
      ]}
    />
  );
}

type DistanceModalProps = CommonProps & {
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function DistanceFilterModal({ selectedValue, onSelect, ...rest }: DistanceModalProps) {
  return (
    <ListFilterModal
      {...rest}
      title="거리"
      selectedValue={selectedValue}
      onSelect={onSelect}
      options={[
        { label: '전체', value: 'all' },
        { label: '300m', value: '300m' },
        { label: '500m', value: '500m' },
        { label: '1km', value: '1km' },
        { label: '2km', value: '2km' },
        { label: '5km', value: '5km' },
      ]}
    />
  );
}

/** 규모: 백엔드 filterGroup → 프론트 EventScale (CITY, UNIVERSITY, DEPARTMENT, CLUB, PERSONAL) */
type ScaleModalProps = CommonProps & {
  selectedValue: string;
  onSelect: (value: string) => void;
};

export function ScaleFilterModal({ selectedValue, onSelect, ...rest }: ScaleModalProps) {
  return (
    <ListFilterModal
      {...rest}
      title="규모"
      selectedValue={selectedValue}
      onSelect={onSelect}
      options={[
        { label: '전체', value: 'all' },
        { label: '시·군·구', value: 'CITY', iconColor: MAP_UI.scaleBadge[0] },
        { label: '대학교', value: 'UNIVERSITY', iconColor: MAP_UI.scaleBadge[1] },
        { label: '단과대/학생회', value: 'DEPARTMENT', iconColor: MAP_UI.scaleBadge[2] },
        { label: '동아리/소모임', value: 'CLUB', iconColor: MAP_UI.scaleBadge[3] },
        { label: '개인', value: 'PERSONAL', iconColor: MAP_UI.scaleBadge[4] },
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

  // 실제 흰색 카드 (폰 가장자리까지)
  sheetCard: {
    marginHorizontal: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingTop: 18,
    paddingBottom: 24,
  },
  sheetCardPadding: {
    paddingHorizontal: 20,
  },
  calendarWrap: {
    paddingHorizontal: 16,
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
  dayCellInRange: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: 4,
  },
  dayText: {
    fontSize: 13,
    color: '#111827',
  },
  dayTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayTextInRange: {
    color: '#2563eb',
  },
  dateActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyButton: {
    flex: 1,
    marginTop: 0,
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
  optionLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  optionMarkerIcon: {
    width: 20,
    height: 26,
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
