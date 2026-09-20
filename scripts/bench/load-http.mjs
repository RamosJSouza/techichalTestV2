#!/usr/bin/env node
/**
 * Carga HTTP com p50/p95/p99 e throughput (alternativa Node ao k6).
 * Uso: node scripts/bench/load-http.mjs --scale=S
 */
import { parseScale } from './lib/scale.mjs';

const scale = parseScale();
const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const SLO = {
  S: { D0_p95: 200, D0_p99: 400, D0_rps: 15, L0_p95: 80, L1_p95: 150 },
  M: { D0_p95: 500, D0_p99: 900, D0_rps: 8, L0_p95: 120, L1_p95: 250 },
  L: { D0_p95: 1500, D0_p99: 3000, D0_rps: 2, L0_p95: 200, L1_p95: 400 },
}[scale];

const scenarios = [
  { id: 'H0', path: '/api/v1/health/live', samples: 50 },
  { id: 'D0', path: '/api/v1/dashboard/stats', samples: 80 },
  { id: 'D1', path: '/api/v1/dashboard/stats?state=SP', samples: 40 },
  { id: 'D2', path: '/api/v1/dashboard/stats?crop=Soja', samples: 40 },
  { id: 'D3', path: '/api/v1/dashboard/stats?minClimateRisk=10&maxClimateRisk=40', samples: 40 },
  { id: 'L0', path: '/api/v1/producers?page=1&pageSize=20', samples: 60 },
  { id: 'L1', path: '/api/v1/producers?page=1&pageSize=100', samples: 40 },
];

if (scale !== 'S') {
  scenarios.push({
    id: 'L2',
    path: '/api/v1/producers?page=500&pageSize=100',
    samples: 20,
  });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, idx)];
}

async function measure(path, samples, concurrency = 5) {
  const times = [];
  let errors = 0;
  const start = Date.now();

  let next = 0;
  async function worker() {
    while (next < samples) {
      const i = next;
      next += 1;
      const t0 = performance.now();
      try {
        const res = await fetch(`${baseUrl}${path}`);
        if (res.status === 429) {
          errors += 1;
          await new Promise((r) => setTimeout(r, 1000));
        } else if (!res.ok) {
          errors += 1;
        } else {
          await res.arrayBuffer();
        }
      } catch {
        errors += 1;
      }
      times.push(performance.now() - t0);
      void i;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, samples) }, () => worker()),
  );

  const elapsedSec = (Date.now() - start) / 1000;
  const sorted = [...times].sort((a, b) => a - b);
  return {
    path,
    samples: times.length,
    errors,
    p50: Number(percentile(sorted, 50).toFixed(2)),
    p95: Number(percentile(sorted, 95).toFixed(2)),
    p99: Number(percentile(sorted, 99).toFixed(2)),
    rps: Number((times.length / elapsedSec).toFixed(2)),
  };
}

console.log(`Warm-up against ${baseUrl}…`);
for (let i = 0; i < 10; i += 1) {
  await fetch(`${baseUrl}/api/v1/dashboard/stats`);
  await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=20`);
}

const results = [];
for (const scenario of scenarios) {
  const concurrency = scenario.id.startsWith('D') ? 5 : 8;
  const result = await measure(scenario.path, scenario.samples, concurrency);
  results.push({ id: scenario.id, ...result });
  console.log(
    `${scenario.id} p95=${result.p95}ms p99=${result.p99}ms rps=${result.rps} err=${result.errors}`,
  );
}

const d0 = results.find((r) => r.id === 'D0');
const l0 = results.find((r) => r.id === 'L0');
const l1 = results.find((r) => r.id === 'L1');

const gates = [
  { name: 'D0_p95', ok: d0.p95 <= SLO.D0_p95, actual: d0.p95, limit: SLO.D0_p95 },
  { name: 'D0_p99', ok: d0.p99 <= SLO.D0_p99, actual: d0.p99, limit: SLO.D0_p99 },
  { name: 'D0_rps', ok: d0.rps >= SLO.D0_rps, actual: d0.rps, limit: SLO.D0_rps },
  { name: 'L0_p95', ok: l0.p95 <= SLO.L0_p95, actual: l0.p95, limit: SLO.L0_p95 },
  { name: 'L1_p95', ok: l1.p95 <= SLO.L1_p95, actual: l1.p95, limit: SLO.L1_p95 },
];

const pass = gates.every((g) => g.ok);
const report = { scale, baseUrl, at: new Date().toISOString(), results, gates, pass };
console.log(JSON.stringify(report, null, 2));
if (!pass) {
  process.exitCode = 1;
}
