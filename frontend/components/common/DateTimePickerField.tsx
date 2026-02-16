/**
 * 행사 등록/수정용 날짜·시간 선택
 * - 입력란에 직접 입력 (YYYY-MM-DD HH:mm) 가능
 * - 달력 아이콘을 누르면 달력에서만 날짜 선택 (한 번만 표시)
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** 네이티브 모듈이 없을 수 있음(Expo Go 등) → 로드 실패 시 null */
let NativeDateTimePicker: React.ComponentType<{
  value: Date;
  mode: "date" | "time";
  display?: string;
  onChange: (event: unknown, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: unknown;
}> | null = null;
try {
  NativeDateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  // RNCDatePicker not in native binary - use fallback
}

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_COUNT = 5;

function parseValue(iso: string): { date: Date; hour: number; minute: number } {
  try {
    const d = new Date(iso || new Date().toISOString());
    if (Number.isNaN(d.getTime())) {
      const now = new Date();
      return { date: now, hour: now.getHours(), minute: now.getMinutes() };
    }
    return {
      date: d,
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
  } catch {
    const now = new Date();
    return { date: now, hour: now.getHours(), minute: now.getMinutes() };
  }
}

function toISOSlice(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatDisplay(iso: string): string {
  const { date, hour, minute } = parseValue(iso);
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 입력란용 표시 (YYYY-MM-DD HH:mm) */
function formatForInput(iso: string): string {
  const { date, hour, minute } = parseValue(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

/** 사용자 입력(YYYY-MM-DD HH:mm / YYYY-MM-DD / HH:mm)을 ISO 슬라이스로 변환 */
function parseInputToISO(text: string, fallbackDate: Date): string | null {
  const t = text.trim();
  const withTime = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/);
  const dateOnly = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const timeOnly = t.match(/^(\d{1,2}):(\d{1,2})$/);
  if (withTime) {
    const [, y, mo, d, h, min] = withTime;
    const year = parseInt(y!, 10);
    const month = parseInt(mo!, 10) - 1;
    const day = parseInt(d!, 10);
    const hour = Math.min(23, Math.max(0, parseInt(h!, 10)));
    const minute = Math.min(59, Math.max(0, parseInt(min!, 10)));
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return toISOSlice(new Date(year, month, day), hour, minute);
    }
  }
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    const year = parseInt(y!, 10);
    const month = parseInt(mo!, 10) - 1;
    const day = parseInt(d!, 10);
    if (year >= 2000 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return toISOSlice(new Date(year, month, day), fallbackDate.getHours(), fallbackDate.getMinutes());
    }
  }
  if (timeOnly) {
    const hour = Math.min(23, Math.max(0, parseInt(timeOnly[1], 10)));
    const minute = Math.min(59, Math.max(0, parseInt(timeOnly[2], 10)));
    return toISOSlice(fallbackDate, hour, minute);
  }
  return null;
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  placeholder?: string;
  /** 모달이 아닌 인라인 표시 시(예: 다른 모달 안에서 사용) */
  inline?: boolean;
};

export function DateTimePickerField({
  value,
  onChange,
  label,
  placeholder = "YYYY-MM-DD HH:mm",
  inline = false,
}: Props) {
  const parsed = parseValue(value);
  const [date, setDate] = useState(parsed.date);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [inputText, setInputText] = useState(formatForInput(value || toISOSlice(new Date(), 0, 0)));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    const p = parseValue(value);
    setDate(p.date);
    setHour(p.hour);
    setMinute(p.minute);
    setInputText(formatForInput(value || toISOSlice(new Date(), 0, 0)));
  }, [value]);

  const applyInput = (text: string) => {
    const iso = parseInputToISO(text, date);
    if (iso) {
      const out = iso.length <= 16 ? iso : iso.slice(0, 16);
      onChange(out);
      const p = parseValue(out);
      setDate(p.date);
      setHour(p.hour);
      setMinute(p.minute);
      setInputText(formatForInput(out));
    }
  };

  const onDateChangeFromCalendar = (ev: unknown, selected?: Date) => {
    if (selected) {
      const iso = toISOSlice(selected, hour, minute);
      const out = iso.length <= 16 ? iso : iso.slice(0, 16);
      onChange(out);
      setDate(selected);
      setInputText(formatForInput(out));
      prevValueRef.current = out;
    }
    setCalendarVisible(false);
  };

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            const iso = parseInputToISO(text, date);
            if (iso) {
              const out = iso.length <= 16 ? iso : iso.slice(0, 16);
              onChange(out);
              const p = parseValue(out);
              setDate(p.date);
              setHour(p.hour);
              setMinute(p.minute);
              prevValueRef.current = out;
            }
          }}
          onBlur={() => applyInput(inputText)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType="numbers-and-punctuation"
        />
        <Pressable
          style={styles.calendarIconBtn}
          onPress={() => setCalendarVisible(true)}
          accessibilityLabel="달력에서 날짜 선택"
        >
          <Ionicons name="calendar-outline" size={24} color="#4C8BF5" />
        </Pressable>
      </View>
      <Text style={styles.inputHint}>날짜·시간(시 분) 직접 입력 가능. 예: 2025-02-15 14:30 또는 14:30 · 달력 아이콘으로 날짜 선택</Text>

      {/* 달력 아이콘을 눌렀을 때만 달력 모달 표시 */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={styles.calendarOnlyCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>날짜 선택</Text>
            {NativeDateTimePicker ? (
              <NativeDateTimePicker
                value={date}
                mode="date"
                display="calendar"
                onChange={onDateChangeFromCalendar}
                minimumDate={new Date(2000, 0, 1)}
                maximumDate={new Date(2100, 11, 31)}
                style={styles.datePicker}
              />
            ) : (
              <TextInput
                style={styles.fallbackDateInput}
                value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
                onChangeText={(t) => {
                  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                  if (m) {
                    const y = parseInt(m[1], 10);
                    const mo = parseInt(m[2], 10) - 1;
                    const d = parseInt(m[3], 10);
                    if (y >= 2000 && y <= 2100 && mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
                      setDate(new Date(y, mo, d));
                    }
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            )}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  const iso = toISOSlice(date, hour, minute);
                  onChange(iso.length <= 16 ? iso : iso.slice(0, 16));
                  setInputText(formatForInput(iso));
                  setCalendarVisible(false);
                }}
              >
                <Text style={styles.modalBtnText}>확인</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** 시간만 휠로 선택 (시작/종료 두 개). 날짜는 기존 값 유지. */
export function TimeRangeWheel({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  onConfirm,
  onCancel,
  visible,
}: {
  startValue: string;
  endValue: string;
  onStartChange: (iso: string) => void;
  onEndChange: (iso: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}) {
  const parse = (iso: string) => {
    const { date, hour, minute } = parseValue(iso);
    return { date, hour, minute };
  };
  const start = parse(startValue);
  const end = parse(endValue);

  const [startHour, setStartHour] = useState(start.hour);
  const [startMinute, setStartMinute] = useState(start.minute);
  const [endHour, setEndHour] = useState(end.hour);
  const [endMinute, setEndMinute] = useState(end.minute);
  const startHRef = useRef<ScrollView>(null);
  const startMRef = useRef<ScrollView>(null);
  const endHRef = useRef<ScrollView>(null);
  const endMRef = useRef<ScrollView>(null);

  useEffect(() => {
    const s = parse(startValue);
    const e = parse(endValue);
    setStartHour(s.hour);
    setStartMinute(s.minute);
    setEndHour(e.hour);
    setEndMinute(e.minute);
  }, [startValue, endValue, visible]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      startHRef.current?.scrollTo({ y: startHour * WHEEL_ITEM_HEIGHT, animated: false });
      startMRef.current?.scrollTo({ y: startMinute * WHEEL_ITEM_HEIGHT, animated: false });
      endHRef.current?.scrollTo({ y: endHour * WHEEL_ITEM_HEIGHT, animated: false });
      endMRef.current?.scrollTo({ y: endMinute * WHEEL_ITEM_HEIGHT, animated: false });
    }, 150);
    return () => clearTimeout(t);
  }, [visible, startHour, startMinute, endHour, endMinute]);

  const handleConfirm = () => {
    const startDate = parseValue(startValue).date;
    const endDate = parseValue(endValue).date;
    onStartChange(toISOSlice(startDate, startHour, startMinute));
    onEndChange(toISOSlice(endDate, endHour, endMinute));
    onConfirm();
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const wheel = (
    ref: React.RefObject<ScrollView | null>,
    value: number,
    setValue: (n: number) => void,
    options: number[],
    isHour: boolean
  ) => (
    <ScrollView
      ref={ref}
      style={[styles.wheelScroll, { height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_COUNT }]}
      contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      snapToAlignment="center"
      decelerationRate="fast"
      onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const index = Math.round(y / WHEEL_ITEM_HEIGHT);
        const max = isHour ? 23 : 59;
        setValue(Math.max(0, Math.min(index, max)));
      }}
    >
      {options.map((n) => (
        <View key={n} style={[styles.wheelItem, { height: WHEEL_ITEM_HEIGHT }]}>
          <Text style={styles.wheelItemText}>{String(n).padStart(2, "0")}</Text>
        </View>
      ))}
    </ScrollView>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalBackdrop} onPress={onCancel}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <Text style={styles.modalTitle}>시작 · 종료 시간 (휠)</Text>
          <View style={styles.timeWheelRow}>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnTitle}>시작 시</Text>
              {wheel(startHRef, startHour, setStartHour, hours, true)}
            </View>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnTitle}>시작 분</Text>
              {wheel(startMRef, startMinute, setStartMinute, minutes, false)}
            </View>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnTitle}>종료 시</Text>
              {wheel(endHRef, endHour, setEndHour, hours, true)}
            </View>
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelColumnTitle}>종료 분</Text>
              {wheel(endMRef, endMinute, setEndMinute, minutes, false)}
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable style={styles.modalBtn} onPress={onCancel}>
              <Text style={styles.modalBtnTextCancel}>취소</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={handleConfirm}>
              <Text style={styles.modalBtnText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { parseValue, toISOSlice, formatDisplay };

/** 네이티브 달력 사용 가능 여부 (다른 화면에서 날짜만 쓸 때 사용) */
export const isNativeDatePickerAvailable = (): boolean => NativeDateTimePicker != null;
export { NativeDateTimePicker };

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFF",
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111827",
  },
  calendarIconBtn: {
    padding: 8,
  },
  inputHint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
  },
  calendarOnlyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  calendarWrap: { marginBottom: 16 },
  datePicker: { height: 200 },
  fallbackDateInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
  },
  timeWheelRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  wheelColumn: { flex: 1 },
  wheelColumnTitle: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  wheelScroll: {},
  wheelItem: { justifyContent: "center", alignItems: "center" },
  wheelItemText: { fontSize: 18, color: "#111827" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  modalBtnTextCancel: { fontSize: 15, color: "#6B7280" },
  modalBtnPrimary: { backgroundColor: "#4C8BF5", borderRadius: 8 },
  modalBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
