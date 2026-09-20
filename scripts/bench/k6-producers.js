import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BENCH_BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 15 },
    { duration: '20s', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<250'],
  },
};

export default function producersLoad() {
  const r20 = http.get(`${BASE}/api/v1/producers?page=1&pageSize=20`);
  const r100 = http.get(`${BASE}/api/v1/producers?page=1&pageSize=100`);
  check(r20, { 'L0 200': (r) => r.status === 200 });
  check(r100, { 'L1 200': (r) => r.status === 200 });
  sleep(0.15);
}
