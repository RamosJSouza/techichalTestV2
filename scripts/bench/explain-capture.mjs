#!/usr/bin/env node
/**
 * Captura EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) das queries quentes.
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
  totals_by_state: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT count(id), sum(total_area)
    FROM farms
    WHERE deleted_at IS NULL AND state = 'SP'
  `,
  by_crop_active: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT crop_name, count(*)
    FROM farm_crops
    INNER JOIN harvests ON farm_crops.harvest_id = harvests.id
    INNER JOIN farms ON harvests.farm_id = farms.id
    WHERE farms.deleted_at IS NULL AND harvests.status = 'ACTIVE'
    GROUP BY crop_name
  `,
  climate_range: `
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT avg(climate_risk_score), count(id)
    FROM farms
    WHERE deleted_at IS NULL
      AND climate_risk_score IS NOT NULL
      AND climate_risk_score::float >= 10
      AND climate_risk_score::float <= 40
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
  summary.push({ name, nodeType, execMs, file: `artifacts/${scale}/${name}.json` });
  console.log(`wrote ${name} node=${nodeType} timeMs=${execMs}`);
}

await writeFile(
  join(outDir, 'summary.json'),
  JSON.stringify({ scale, capturedAt: new Date().toISOString(), summary }, null, 2),
  'utf8',
);

await sql.end({ timeout: 5 });
console.log(JSON.stringify({ ok: true, scale, count: summary.length }, null, 2));
