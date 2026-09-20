#!/usr/bin/env node
/**
 * Captura EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) das queries quentes do dashboard + listagem.
 * Uso: node --env-file=.env scripts/bench/explain-capture.mjs --scale=S
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';
import { parseScale } from './lib/scale.mjs';

const scale = parseScale();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const outDir = join(process.cwd(), 'docs', 'bench', 'artifacts', scale);
await mkdir(outDir, { recursive: true });

const sql = postgres(databaseUrl, { max: 1 });

const queries = {
  dash_totals: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT count(id), sum(total_area), sum(arable_area), sum(vegetation_area)
    FROM farms WHERE deleted_at IS NULL
  `,
  dash_climate_avg: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT avg(climate_risk_score), count(id)
    FROM farms
    WHERE deleted_at IS NULL AND climate_risk_score IS NOT NULL
  `,
  dash_by_state: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT state, count(id), sum(total_area)
    FROM farms WHERE deleted_at IS NULL
    GROUP BY state
  `,
  dash_by_car: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT car_status, count(id)
    FROM farms WHERE deleted_at IS NULL
    GROUP BY car_status
  `,
  dash_by_esg: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT p.esg_status, count(DISTINCT p.id)
    FROM farms f
    INNER JOIN producers p ON f.producer_id = p.id
    WHERE f.deleted_at IS NULL AND p.deleted_at IS NULL
    GROUP BY p.esg_status
  `,
  dash_by_crop: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT crop_name, count(*)
    FROM farm_crops
    INNER JOIN harvests ON farm_crops.harvest_id = harvests.id
    INNER JOIN farms ON harvests.farm_id = farms.id
    WHERE farms.deleted_at IS NULL AND harvests.status = 'ACTIVE'
    GROUP BY crop_name
  `,
  dash_climate_by_state: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT state, avg(climate_risk_score), count(id)
    FROM farms
    WHERE deleted_at IS NULL AND climate_risk_score IS NOT NULL
    GROUP BY state
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
  dash_crops_by_year: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT harvests.year, crop_name, count(*)
    FROM farm_crops
    INNER JOIN harvests ON farm_crops.harvest_id = harvests.id
    INNER JOIN farms ON harvests.farm_id = farms.id
    WHERE farms.deleted_at IS NULL AND harvests.status = 'ACTIVE'
    GROUP BY harvests.year, crop_name
  `,
  dash_farms_by_month: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT date_trunc('month', created_at), count(id), sum(total_area)
    FROM farms WHERE deleted_at IS NULL
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  `,
  dash_top_cities: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT city, state, count(id), sum(total_area)
    FROM farms WHERE deleted_at IS NULL
    GROUP BY city, state
    ORDER BY count(id) DESC
    LIMIT 10
  `,
  list_producers_page: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT id FROM producers
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC, id ASC
    LIMIT 20 OFFSET 0
  `,
  farms_for_producers: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT * FROM farms
    WHERE deleted_at IS NULL
      AND producer_id IN (
        SELECT id FROM producers
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC, id ASC
        LIMIT 20
      )
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

const summary = [];

for (const [name, query] of Object.entries(queries)) {
  const result = await sql.unsafe(query);
  const plan = result[0]?.['QUERY PLAN'] ?? result;
  const file = join(outDir, `${name}.json`);
  await writeFile(file, JSON.stringify(plan, null, 2), 'utf8');

  const root = Array.isArray(plan) ? plan[0]?.Plan : plan?.Plan;
  const nodeType = root?.['Node Type'] ?? 'unknown';
  const execMs = root?.['Actual Total Time'] ?? null;
  const shared = root?.['Shared Hit Blocks'] ?? null;
  const read = root?.['Shared Read Blocks'] ?? null;
  summary.push({
    name,
    nodeType,
    execMs,
    sharedHitBlocks: shared,
    sharedReadBlocks: read,
    file: `artifacts/${scale}/${name}.json`,
  });
  console.log(`wrote ${name} node=${nodeType} timeMs=${execMs}`);
}

await writeFile(
  join(outDir, 'summary.json'),
  JSON.stringify({ scale, capturedAt: new Date().toISOString(), summary }, null, 2),
  'utf8',
);

await sql.end({ timeout: 5 });
console.log(JSON.stringify({ ok: true, scale, count: summary.length }, null, 2));
