// utils/logger.ts
export const logger = (...args: unknown[]) => {
  if (__DEV__) {
    // 개발 모드에서만 로그 출력
    // eslint-disable-next-line no-console
    console.log('[Dailo]', ...args);
  }
};
