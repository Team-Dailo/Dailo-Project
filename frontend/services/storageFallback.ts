/**
 * AsyncStorage API 호환 인메모리 스토리지.
 * @react-native-async-storage/async-storage 미설치 시 사용.
 * 설치 후 auth.service.ts에서 실제 패키지를 import 하세요.
 */
const memory: Record<string, string> = {};

export default {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(memory[key] ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    memory[key] = value;
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    delete memory[key];
    return Promise.resolve();
  },
  multiSet: (pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => { memory[k] = v; });
    return Promise.resolve();
  },
  multiRemove: (keys: string[]): Promise<void> => {
    keys.forEach((k) => delete memory[k]);
    return Promise.resolve();
  },
};
