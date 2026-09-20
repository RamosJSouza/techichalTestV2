#!/usr/bin/env node
/**
 * Captura EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) — N runs, GUCs fixos, mediana/MAD.
 * Uso: node --env-file=.env scripts/bench/explain-capture.mjs --scale=S
 *
 * Gate Seq Scan (M/L): FAIL se Node Type raiz ou primeiro filho dominante em
 * farms/harvests for shapes dash_* for Seq Scan (exceto S, onde Seq Scan é aceito).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';
import { parseScale } from './lib/scale.mjs';

const scale = parseScale();
const RUNS = Number(process.env.BENCH_EXPLAIN_RUNS ?? 5);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const outDir = join(process.cwd(), 'docs', 'bench', 'artifacts', scale);
await mkdir(outDir, { recursive: true });

const sql = postgres(databaseUrl, { max: 1 });

await sql.unsafe(`SET jit = off`);
await sql.unsafe(`SET work_mem = '64MB'`);
await sql.unsafe(`SET statement_timeout = '120s'`);

/** Packs alinhados ao drizzle-dashboard.repository (CTE f + active_crops). */
const queries = {
  dash_farms_pack_summary: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH f AS (
      SELECT id, state, city, total_area, arable_area, vegetation_area,
             car_status, climate_risk_score, created_at
      FROM farms WHERE deleted_at IS NULL
    )
    SELECT
      (SELECT count(*)::int FROM f) AS total_farms,
      (SELECT coalesce(sum(total_area), 0)::float8 FROM f) AS total_hectares,
      (SELECT avg(climate_risk_score)::float8 FROM f WHERE climate_risk_score IS NOT NULL) AS climate_avg,
      (SELECT count(*)::int FROM f WHERE climate_risk_score IS NOT NULL) AS climate_count,
      coalesce((
        SELECT json_agg(row_to_json(s) ORDER BY s.state)
        FROM (
          SELECT state, count(*)::int AS count, coalesce(sum(total_area), 0)::float8 AS hectares
          FROM f GROUP BY state
        ) s
      ), '[]'::json) AS by_state,
      coalesce((
        SELECT json_agg(row_to_json(c))
        FROM (
          SELECT car_status AS status, count(*)::int AS count
          FROM f GROUP BY car_status
        ) c
      ), '[]'::json) AS by_car
  `,
  dash_crops_pack_summary: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH f AS (
      SELECT id FROM farms WHERE deleted_at IS NULL
    ),
    active_crops AS (
      SELECT fc.crop_name, h.year, f.id AS farm_id
      FROM farm_crops fc
      INNER JOIN harvests h ON fc.harvest_id = h.id
      INNER JOIN f ON h.farm_id = f.id
      WHERE h.status = 'ACTIVE'
    )
    SELECT crop_name, count(*)::int AS count
    FROM active_crops
    GROUP BY crop_name
  `,
  dash_crops_pack_analytics: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH f AS (
      SELECT id, climate_risk_score FROM farms WHERE deleted_at IS NULL
    ),
    active_crops AS (
      SELECT fc.crop_name, h.year, f.id AS farm_id, f.climate_risk_score
      FROM farm_crops fc
      INNER JOIN harvests h ON fc.harvest_id = h.id
      INNER JOIN f ON h.farm_id = f.id
      WHERE h.status = 'ACTIVE'
    )
    SELECT
      coalesce((
        SELECT json_agg(row_to_json(c))
        FROM (
          SELECT crop_name,
                 avg(climate_risk_score)::float8 AS "averageScore",
                 count(DISTINCT farm_id)::int AS "farmsWithScore"
          FROM active_crops
          WHERE climate_risk_score IS NOT NULL
          GROUP BY crop_name
        ) c
      ), '[]'::json) AS climate_by_crop,
      coalesce((
        SELECT json_agg(row_to_json(y))
        FROM (
          SELECT year, crop_name, count(*)::int AS count
          FROM active_crops
          GROUP BY year, crop_name
        ) y
      ), '[]'::json) AS crops_by_year
  `,
  dash_by_esg: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT p.esg_status, count(DISTINCT p.id)
    FROM farms f
    INNER JOIN producers p ON f.producer_id = p.id
    WHERE f.deleted_at IS NULL AND p.deleted_at IS NULL
    GROUP BY p.esg_status
  `,
  dash_climate_by_crop: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT crop_name, avg(climate_risk_score), count(DISTINCT farms.id)
    FROM farm_crops
    INNER JOIN harvests ON farm_crops.harvest_id = harvests.id
    INNER JOIN farms ON harvests.farm_id = farms.id
    WHERE farms.deleted_at IS NULL AND harvests.status = 'ACTIVE'
      AND climate_risk_score IS NOT NULL
    GROUP BY crop_name
  `,
  list_producers_page: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id, name, created_at FROM producers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id ASC
    LIMIT 20 OFFSET 0
  `,
  list_producers_offset_deep: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id, name, created_at FROM producers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id ASC
    LIMIT 100 OFFSET 49900
  `,
  list_producers_keyset: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id, name, created_at FROM producers
    WHERE deleted_at IS NULL
      AND (created_at, id) < (
        SELECT created_at, id FROM producers
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
        LIMIT 1 OFFSET 99
      )
    ORDER BY created_at DESC, id ASC
    LIMIT 100
  `,
  farms_agg_for_list: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT
      producer_id,
      count(*)::int AS farms_count,
      coalesce(sum(total_area), 0)::float8 AS total_area_ha,
      coalesce(sum(arable_area), 0)::float8 AS arable_area_ha,
      coalesce(sum(vegetation_area), 0)::float8 AS vegetation_area_ha,
      coalesce(array_agg(DISTINCT state ORDER BY state), '{}'::text[]) AS farm_states
    FROM farms
    WHERE deleted_at IS NULL
      AND producer_id IN (
        SELECT id FROM producers
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
        LIMIT 20
      )
    GROUP BY producer_id
  `,
};

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mad(values, med) {
  if (med === null || values.length === 0) return null;
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

function walkPlan(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  const plans = node.Plans;
  if (Array.isArray(plans)) {
    for (const child of plans) walkPlan(child, visitor);
  }
}

function dominantSeqScanOnHotTables(root) {
  let seqOnHot = false;
  walkPlan(root, (node) => {
    const type = node['Node Type'];
    const rel = node['Relation Name'];
    if (
      type === 'Seq Scan' &&
      (rel === 'farms' || rel === 'harvests' || rel === 'farm_crops')
    ) {
      seqOnHot = true;
    }
  });
  return seqOnHot;
}

function extractMetrics(plan) {
  const root = Array.isArray(plan) ? plan[0]?.Plan : plan?.Plan;
  const planning = Array.isArray(plan)
    ? plan[0]?.['Planning Time']
    : plan?.['Planning Time'];
  const execution = Array.isArray(plan)
    ? plan[0]?.['Execution Time']
    : plan?.['Execution Time'];
  return {
    root,
    nodeType: root?.['Node Type'] ?? 'unknown',
    execMs: root?.['Actual Total Time'] ?? execution ?? null,
    planningMs: planning ?? null,
    sharedHitBlocks: root?.['Shared Hit Blocks'] ?? null,
    sharedReadBlocks: root?.['Shared Read Blocks'] ?? null,
    seqScanHot: root ? dominantSeqScanOnHotTables(root) : false,
  };
}

const BLOCKING_SEQ_SHAPES = new Set([
  // List agg: producer_id IN (...) — missing index → Seq Scan proved L0 FAIL at M.
  'farms_agg_for_list',
]);
const WARN_SEQ_SHAPES = new Set([
  'dash_crops_pack_summary',
  'dash_crops_pack_analytics',
  'dash_climate_by_crop',
]);

const summary = [];
let seqScanGateFail = false;

for (const [name, query] of Object.entries(queries)) {
  const runs = [];
  let lastPlan = null;
  for (let i = 0; i < RUNS; i += 1) {
    const result = await sql.unsafe(query);
    const plan = result[0]?.['QUERY PLAN'] ?? result;
    lastPlan = plan;
    runs.push(extractMetrics(plan));
  }

  const execSamples = runs.map((r) => r.execMs).filter((v) => typeof v === 'number');
  const hitSamples = runs
    .map((r) => r.sharedHitBlocks)
    .filter((v) => typeof v === 'number');
  const readSamples = runs
    .map((r) => r.sharedReadBlocks)
    .filter((v) => typeof v === 'number');
  const medExec = median(execSamples);
  const medHit = median(hitSamples);
  const medRead = median(readSamples);
  const last = runs[runs.length - 1];

  const file = join(outDir, `${name}.json`);
  await writeFile(
    file,
    JSON.stringify(
      {
        runs: RUNS,
        medianExecMs: medExec,
        madExecMs: mad(execSamples, medExec),
        medianSharedHitBlocks: medHit,
        medianSharedReadBlocks: medRead,
        lastPlan,
      },
      null,
      2,
    ),
    'utf8',
  );

  const seqScanHot = runs.some((r) => r.seqScanHot);
  if (scale !== 'S' && BLOCKING_SEQ_SHAPES.has(name) && seqScanHot) {
    seqScanGateFail = true;
  }

  summary.push({
    name,
    nodeType: last?.nodeType ?? 'unknown',
    execMsMedian: medExec === null ? null : Number(medExec.toFixed(3)),
    execMsMad: (() => {
      const m = mad(execSamples, medExec);
      return m === null ? null : Number(m.toFixed(3));
    })(),
    sharedHitBlocksMedian: medHit,
    sharedReadBlocksMedian: medRead,
    seqScanHot,
    file: `artifacts/${scale}/${name}.json`,
  });
  console.log(
    `wrote ${name} node=${last?.nodeType} medianMs=${medExec?.toFixed?.(2) ?? medExec} seqHot=${seqScanHot}`,
  );
}

const gucs = { jit: 'off', work_mem: '64MB', runs: RUNS };
const payload = {
  scale,
  capturedAt: new Date().toISOString(),
  gucs,
  seqScanGate: {
    applies: scale !== 'S',
    fail: seqScanGateFail,
    note:
      scale === 'S'
        ? 'Seq Scan aceito em S'
        : 'FAIL só em farms_agg_for_list com Seq Scan; crop joins = warn (D0a HTTP cacheado)',
    warnShapes: [...WARN_SEQ_SHAPES],
  },
  summary,
};

await writeFile(
  join(outDir, 'summary.json'),
  JSON.stringify(payload, null, 2),
  'utf8',
);

await sql.end({ timeout: 5 });
console.log(
  JSON.stringify(
    {
      ok: !seqScanGateFail,
      scale,
      count: summary.length,
      seqScanGateFail,
    },
    null,
    2,
  ),
);
if (seqScanGateFail) {
  process.exitCode = 1;
}
