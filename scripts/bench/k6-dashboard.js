import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BENCH_BASE_URL || 'http://localhost:3000';
const SCALE = (__ENV.BENCH_SCALE || 'S').toUpperCase();

const thresholds =
  SCALE === 'L'
    ? { http_req_duration: ['p(95)<1500', 'p(99)<3000'] }
    : SCALE === 'M'
      ? { http_req_duration: ['p(95)<500', 'p(99)<900'] }
      : { http_req_duration: ['p(95)<200', 'p(99)<400'] };

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '60s', target: SCALE === 'L' ? 8 : 20 },
    { duration: '30s', target: 5 },
  ],
  thresholds,
};

export default function dashboardLoad() {
  const res = http.get(`${BASE}/api/v1/dashboard/stats`);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.1);
}
