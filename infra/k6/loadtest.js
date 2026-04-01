import http from 'k6/http';
import { check, sleep } from 'k6';

// 실행 예: k6 run -e BASE_URL=https://example.com infra/k6/loadtest.js
// 대상 URL을 환경변수로 주입 (미지정 시 로컬 기본값 사용)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  // 최대 동시 사용자 1000명까지 램프업 → 유지 → 램프다운
  scenarios: {
    max_1000_vus: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // 2분 동안 0 → 1000 VU
        { duration: '2m', target: 1000 },
        // 5분 동안 1000 VU 유지
        { duration: '5m', target: 1000 },
        // 2분 동안 1000 → 0 VU
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },                   
  thresholds: {
    // 실패율 1% 미만, p95 응답시간 1초 미만 목표
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  // 기본 엔드포인트 호출 (필요시 경로/메서드 변경)
  const res = http.get(`${BASE_URL}/`);
  // 상태코드 200 확인
  check(res, { 'status is 200': (r) => r.status === 200 });
  // 각 VU가 1초 간격으로 반복 호출
  sleep(1);
}
