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
