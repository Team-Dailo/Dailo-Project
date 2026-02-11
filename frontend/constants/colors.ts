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
  // Scale legend pin colors (5 items, 진한 색): 시·군·구(빨강), 대학교(주황), 단과대/학생회(노랑), 동아리/소모임(초록), 개인(파랑)
  scaleBadge: ['#C62828', '#E65100', '#F9A825', '#2E7D32', '#1565C0'] as const,
};
