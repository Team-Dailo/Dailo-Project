// constants/colors.ts
export const COLORS = {
  primary: '#2F80ED',
  background: '#ffffff',
  text: '#222222',
  gray: '#BDBDBD',
  border: '#E5E5E5',
};

// Map screen / Material-style UI (9:19.5 baseline)
export const MAP_UI = {
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textDark: '#111827',
  cardBg: '#FFFFFF',
  divider: '#E5E7EB',
  shadow: 'rgba(0,0,0,0.15)',
  scaleActive: '#3B82F6',
  scalePressed: '#F3F4F6',
  fabDisabledBg: '#F9FAFB',
  fabDisabledIcon: '#9CA3AF',
  // Scale legend pin colors (5 items, 사진 참고): 시·군·구, 대학교, 단과대/학생회, 동아리/소모임, 개인
  scaleBadge: ['#F86E6E', '#F89B6B', '#F8C76B', '#5BE09B', '#6294F8'] as const,
};

/** 관리자·지도·캘린더 공통: 백엔드 filterGroup → 마커/점 색상 (동일 규칙) */
export function getEventColorByFilterGroup(filterGroup: string | null | undefined): string {
  const idx = getScaleIndexByFilterGroup(filterGroup);
  return MAP_UI.scaleBadge[idx];
}

/** filterGroup → scaleBadge 인덱스 (0=시군구, 1=대학교, 2=단과대/학생회, 3=동아리, 4=개인) */
export function getScaleIndexByFilterGroup(filterGroup: string | null | undefined): number {
  if (filterGroup == null || String(filterGroup).trim() === '') return 4;
  switch (String(filterGroup).trim()) {
    case 'CHUNGJU_CITY':
      return 0;
    case 'UNIVERSITY':
      return 1;
    case 'COLLEGE':
    case 'STUDENT_COUNCIL':
      return 2;
    case 'CLUB':
      return 3;
    default:
      return 4;
  }
}
