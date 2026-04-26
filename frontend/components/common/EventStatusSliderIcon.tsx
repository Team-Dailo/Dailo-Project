// 행사 상태 필터 — Ionicons 슬라이더(options). 번들/런타임 단순화
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export type EventStatusSliderIconProps = {
  variant: 'ongoing' | 'ended';
  size?: number;
  color?: string;
  fillColor?: string;
};

export function EventStatusSliderIcon(props: EventStatusSliderIconProps) {
  const size = props.size ?? 16;
  const color = props.color ?? '#374151';
  return <Ionicons name="options" size={size} color={color} />;
}
