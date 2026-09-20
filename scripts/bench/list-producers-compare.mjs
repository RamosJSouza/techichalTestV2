#!/usr/bin/env node
/**
 * Compara listagem de produtores: latência, payload, queries, memória.
 * Uso: BENCH_INSTRUMENT=1 node --env-file=.env scripts/bench/list-producers-compare.mjs --label=before|after
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const label = (() => {
  const arg = process.argv.find((a) => a.startsWith('--label='));
  return arg ? arg.slice('--label='.length) : 'run';
})();

const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const scenarios = [
  { id: 'L0', pageSize: 20, samples: 40 },
  { id: 'L1', pageSize: 100, samples: 30 },
];

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

function estimateQueriesFromShape(body) {
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return { mode: 'empty', estimatedQueries: 2 };
  }
  const first = items[0];
  if (first && Array.isArray(first.farms)) {
    return { mode: 'full_hydrate', estimatedQueries: 5 };
  }
  if (first && typeof first.farmsCount === 'number') {
    return { mode: 'summary', estimatedQueries: 3 };
  }
  return { mode: 'unknown', estimatedQueries: null };
}

async function measure(pageSize, samples) {
  const path = `/api/v1/producers?page=1&pageSize=${pageSize}`;
  const times = [];
  const payloads = [];
  const queryCounts = [];
  const heapDeltas = [];
  let lastBody = null;
  let errors = 0;
  const heapBefore = process.memoryUsage().heapUsed;

  for (let i = 0; i < samples; i += 1) {
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
      const buf = await res.arrayBuffer();
      times.push(performance.now() - t0);
      payloads.push(buf.byteLength);
      if (!res.ok) {
        errors += 1;
      } else {
        lastBody = JSON.parse(Buffer.from(buf).toString('utf8'));
      }
    } catch {
      errors += 1;
      times.push(performance.now() - t0);
      payloads.push(0);
    }
  }

  global.gc?.();
  const heapAfter = process.memoryUsage().heapUsed;
  const sortedT = [...times].sort((a, b) => a - b);
  const sortedP = [...payloads].sort((a, b) => a - b);
  const queryInfo = estimateQueriesFromShape(lastBody);
  const dbQueriesMedian =
    queryCounts.length > 0 ? Number(median(queryCounts).toFixed(1)) : null;
  const heapDeltaMbMedian =
    heapDeltas.length > 0 ? Number(median(heapDeltas).toFixed(3)) : null;

  return {
    path,
    pageSize,
    samples: times.length,
    errors,
    p50Ms: Number(percentile(sortedT, 50).toFixed(2)),
    p95Ms: Number(percentile(sortedT, 95).toFixed(2)),
    payloadP50Bytes: percentile(sortedP, 50),
    payloadP95Bytes: percentile(sortedP, 95),
    itemsInLastResponse: Array.isArray(lastBody?.items)
      ? lastBody.items.length
      : 0,
    shapeMode: queryInfo.mode,
    estimatedQueries: queryInfo.estimatedQueries,
    dbQueriesMedian,
    queries:
      dbQueriesMedian !== null ? dbQueriesMedian : queryInfo.estimatedQueries,
    heapDeltaMbMedian,
    heapDeltaBytes: heapAfter - heapBefore,
    heapAfterBytes: heapAfter,
  };
}

console.log(`Warm-up ${baseUrl} label=${label}…`);
for (let i = 0; i < 5; i += 1) {
  await fetch(`${baseUrl}/api/v1/producers?page=1&pageSize=20`);
}

const results = [];
for (const scenario of scenarios) {
  const result = await measure(scenario.pageSize, scenario.samples);
  results.push({ id: scenario.id, ...result });
  console.log(
    `${scenario.id} p95=${result.p95Ms}ms payloadP50=${result.payloadP50Bytes}B q=${result.queries} shape=${result.shapeMode} heapΔMb=${result.heapDeltaMbMedian}`,
  );
}

const report = {
  label,
  scale: 'S',
  baseUrl,
  at: new Date().toISOString(),
  instrument: process.env.BENCH_INSTRUMENT === '1',
  results,
};

const outDir = join(process.cwd(), 'docs', 'bench', 'artifacts', 'S');
await mkdir(outDir, { recursive: true });
const outFile = join(outDir, `list-producers-${label}.json`);
await writeFile(outFile, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`wrote ${outFile}`);
