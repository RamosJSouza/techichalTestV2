#!/usr/bin/env node
/**
 * Carga HTTP com p50/p95/p99, RPS, erros, queries (X-Db-Queries) e heap delta.
 * Uso: BENCH_INSTRUMENT=1 node --env-file=.env scripts/bench/load-http.mjs --scale=S
 */
import { parseScale } from './lib/scale.mjs';

const scale = parseScale();
const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const SLO = {
  S: {
    D0_p95: 200,
    D0_p99: 400,
    D0_rps: 15,
    D0a_p95: 300,
    L0_p95: 80,
    L1_p95: 150,
  },
  M: {
    D0_p95: 500,
    D0_p99: 900,
    D0_rps: 8,
    D0a_p95: 600,
    L0_p95: 120,
    L1_p95: 250,
  },
  L: {
    D0_p95: 1500,
    D0_p99: 3000,
    D0_rps: 2,
    D0a_p95: 1800,
    L0_p95: 200,
    L1_p95: 400,
  },
}[scale];

const scenarios = [
  { id: 'H0', path: '/api/v1/health/live', samples: 50 },
  { id: 'D0s', path: '/api/v1/dashboard/summary', samples: 80 },
  { id: 'D0a', path: '/api/v1/dashboard/analytics', samples: 60 },
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

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 50);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveDetailPath() {
  try {
    const res = await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=1`);
    if (!res.ok) return null;
    const body = await res.json();
    const id = body?.items?.[0]?.id;
    return typeof id === 'string' ? `/api/v1/producers/${id}` : null;
  } catch {
    return null;
  }
}

async function measure(path, samples, concurrency = 5) {
  const times = [];
  const queryCounts = [];
  const heapDeltas = [];
  let errors = 0;
  const start = Date.now();

  let next = 0;
  async function worker() {
    while (next < samples) {
      next += 1;
      const t0 = performance.now();
      try {
        const res = await fetch(`${baseUrl}${path}`);
        const q = res.headers.get('x-db-queries');
        const h = res.headers.get('x-heap-delta-mb');
        if (q !== null && q !== '') {
          queryCounts.push(Number(q));
        }
        if (h !== null && h !== '') {
          heapDeltas.push(Number(h));
        }
        if (res.status === 429) {
          errors += 1;
          await sleep(1000);
        } else if (!res.ok) {
          errors += 1;
        } else {
          await res.arrayBuffer();
        }
      } catch {
        errors += 1;
      }
      times.push(performance.now() - t0);
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
    dbQueriesMedian:
      queryCounts.length > 0
        ? Number(median(queryCounts).toFixed(1))
        : null,
    heapDeltaMbMedian:
      heapDeltas.length > 0 ? Number(median(heapDeltas).toFixed(3)) : null,
  };
}

console.log(`Warm-up against ${baseUrl}…`);
for (let i = 0; i < 10; i += 1) {
  await fetch(`${baseUrl}/api/v1/dashboard/summary`);
  await fetch(`${baseUrl}/api/v1/dashboard/analytics`);
  await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=20`);
}

const detailPath = await resolveDetailPath();
if (detailPath) {
  scenarios.push({ id: 'P1', path: detailPath, samples: 30 });
}

const results = [];
for (const scenario of scenarios) {
  // Cooldown + warm-up dedicados para L* e D0a (reduz ruído de GC / cache expire).
  if (scenario.id === 'D0s') {
    await sleep(500);
    for (let i = 0; i < 5; i += 1) {
      await fetch(`${baseUrl}${scenario.path}`);
    }
  }
  if (scenario.id === 'D0a') {
    await sleep(2000);
    for (let i = 0; i < 8; i += 1) {
      await fetch(`${baseUrl}${scenario.path}`);
    }
  }
  if (scenario.id === 'L0') {
    await sleep(2000);
    for (let i = 0; i < 8; i += 1) {
      await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=20`);
    }
  }
  if (scenario.id === 'L1') {
    await sleep(2000);
    for (let i = 0; i < 8; i += 1) {
      await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=100`);
    }
  }
  if (scenario.id === 'P1') {
    await sleep(500);
  }

  let concurrency = 5;
  if (
    scenario.id === 'L0' ||
    scenario.id === 'L1' ||
    scenario.id === 'P1' ||
    scenario.id === 'D0a'
  ) {
    concurrency = 1;
  } else if (scenario.id.startsWith('D')) {
    concurrency = 4;
  } else if (scenario.id === 'H0') {
    concurrency = 8;
  }

  const result = await measure(scenario.path, scenario.samples, concurrency);
  results.push({ id: scenario.id, ...result });
  console.log(
    `${scenario.id} p95=${result.p95}ms p99=${result.p99}ms rps=${result.rps} err=${result.errors} q=${result.dbQueriesMedian} heapΔ=${result.heapDeltaMbMedian}`,
  );
}

const d0 = results.find((r) => r.id === 'D0');
const d0s = results.find((r) => r.id === 'D0s');
const d0a = results.find((r) => r.id === 'D0a');
const l0 = results.find((r) => r.id === 'L0');
const l1 = results.find((r) => r.id === 'L1');
const p1 = results.find((r) => r.id === 'P1');

const gates = [
  {
    name: 'D0s_p95',
    ok: d0s.p95 <= SLO.D0_p95,
    actual: d0s.p95,
    limit: SLO.D0_p95,
  },
  {
    name: 'D0s_p99',
    ok: d0s.p99 <= SLO.D0_p99,
    actual: d0s.p99,
    limit: SLO.D0_p99,
  },
  {
    name: 'D0s_rps',
    ok: d0s.rps >= SLO.D0_rps,
    actual: d0s.rps,
    limit: SLO.D0_rps,
  },
  { name: 'D0s_errors', ok: d0s.errors === 0, actual: d0s.errors, limit: 0 },
  {
    name: 'D0a_p95',
    ok: d0a.p95 <= SLO.D0a_p95,
    actual: d0a.p95,
    limit: SLO.D0a_p95,
  },
  { name: 'D0a_errors', ok: d0a.errors === 0, actual: d0a.errors, limit: 0 },
  {
    name: 'D0_stats_p95_info',
    ok: true,
    actual: d0.p95,
    limit: SLO.D0_p95,
    informational: true,
    note: 'Residual /dashboard/stats — não bloqueante',
  },
  { name: 'L0_p95', ok: l0.p95 <= SLO.L0_p95, actual: l0.p95, limit: SLO.L0_p95 },
  { name: 'L0_errors', ok: l0.errors === 0, actual: l0.errors, limit: 0 },
  { name: 'L1_p95', ok: l1.p95 <= SLO.L1_p95, actual: l1.p95, limit: SLO.L1_p95 },
  { name: 'L1_errors', ok: l1.errors === 0, actual: l1.errors, limit: 0 },
];

if (p1) {
  gates.push({
    name: 'P1_detail_p95_info',
    ok: true,
    actual: p1.p95,
    limit: null,
    informational: true,
    note: 'GET /producers/:id hydrate completo — informativo',
  });
}

const pass = gates.every((g) => g.ok);
const report = {
  scale,
  baseUrl,
  at: new Date().toISOString(),
  sloPolicy:
    'Blocking: D0s (/summary) + D0a (/analytics) + L0/L1. D0 (/stats) and P1 (detail) are residual/info.',
  instrument: process.env.BENCH_INSTRUMENT === '1',
  results,
  gates,
  pass,
};
console.log(JSON.stringify(report, null, 2));
if (!pass) {
  process.exitCode = 1;
}
