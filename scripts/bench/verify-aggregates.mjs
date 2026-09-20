#!/usr/bin/env node
/**
 * Compara GET /dashboard/stats com SQL de referência (mesmas regras de domínio).
 * Uso: node --env-file=.env scripts/bench/verify-aggregates.mjs
 */
import postgres from 'postgres';

const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sql = postgres(databaseUrl, { max: 2 });

async function fetchStats(query = '') {
  const url = `${baseUrl}/api/v1/dashboard/stats${query}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API ${url} → ${res.status}`);
  }
  return res.json();
}

async function refTotals(extraAnd) {
  const [row] = await sql`
    SELECT
      count(*)::int AS total_farms,
      coalesce(sum(total_area), 0)::float8 AS total_hectares
    FROM farms
    WHERE deleted_at IS NULL
    ${extraAnd}
  `;
  return {
    totalFarms: Number(row.total_farms),
    totalHectares: Number(Number(row.total_hectares).toFixed(2)),
  };
}

async function refByState(extraAnd) {
  const rows = await sql`
    SELECT state, count(*)::int AS count
    FROM farms
    WHERE deleted_at IS NULL
    ${extraAnd}
    GROUP BY state
    ORDER BY state
  `;
  return Object.fromEntries(rows.map((r) => [r.state, Number(r.count)]));
}

async function refByCrop(farmExtraAnd) {
  const rows = await sql`
    SELECT fc.crop_name AS crop, count(fc.id)::int AS count
    FROM farm_crops fc
    INNER JOIN harvests h ON fc.harvest_id = h.id
    INNER JOIN farms f ON h.farm_id = f.id
    WHERE f.deleted_at IS NULL
      AND h.status = 'ACTIVE'
      ${farmExtraAnd}
    GROUP BY fc.crop_name
    ORDER BY fc.crop_name
  `;
  return Object.fromEntries(rows.map((r) => [r.crop, Number(r.count)]));
}

async function refByCar(extraAnd) {
  const rows = await sql`
    SELECT
      coalesce(car_status, 'Sem CAR') AS status,
      count(*)::int AS count
    FROM farms
    WHERE deleted_at IS NULL
    ${extraAnd}
    GROUP BY car_status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}

async function refByEsg(farmExtraAnd) {
  const rows = await sql`
    SELECT p.esg_status AS status, count(DISTINCT p.id)::int AS count
    FROM farms f
    INNER JOIN producers p ON f.producer_id = p.id
    WHERE f.deleted_at IS NULL
      AND p.deleted_at IS NULL
      ${farmExtraAnd}
    GROUP BY p.esg_status
  `;
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}

function mapByState(api) {
  return Object.fromEntries(api.byState.map((x) => [x.state, x.count]));
}

function mapByCrop(api) {
  return Object.fromEntries(api.byCrop.map((x) => [x.crop, x.count]));
}

function mapByCar(api) {
  return Object.fromEntries(api.byCarStatus.map((x) => [x.status, x.count]));
}

function mapByEsg(api) {
  return Object.fromEntries(api.byEsgStatus.map((x) => [x.status, x.count]));
}

function assertEqual(label, a, b) {
  const sa = JSON.stringify(a, Object.keys(a).sort());
  const sb = JSON.stringify(b, Object.keys(b).sort());
  // sort keys by sorting entries
  const norm = (obj) =>
    Object.fromEntries(
      Object.entries(obj).sort(([x], [y]) => x.localeCompare(y)),
    );
  if (JSON.stringify(norm(a)) !== JSON.stringify(norm(b))) {
    throw new Error(
      `${label} mismatch\nAPI: ${JSON.stringify(norm(a))}\nREF: ${JSON.stringify(norm(b))}`,
    );
  }
}

function approxHectares(api, ref) {
  if (Math.abs(api - ref) > 0.05) {
    throw new Error(`totalHectares mismatch API=${api} REF=${ref}`);
  }
}

const sojaExists = sql`AND EXISTS (
  SELECT 1 FROM harvests h
  INNER JOIN farm_crops fc ON fc.harvest_id = h.id
  WHERE h.farm_id = farms.id
    AND h.status = 'ACTIVE'
    AND fc.crop_name = 'Soja'
)`;

const sojaExistsOnF = sql`AND EXISTS (
  SELECT 1 FROM harvests h2
  INNER JOIN farm_crops fc2 ON fc2.harvest_id = h2.id
  WHERE h2.farm_id = f.id
    AND h2.status = 'ACTIVE'
    AND fc2.crop_name = 'Soja'
)`;

const scenarios = [
  {
    name: 'no-filter',
    query: '',
    farmAnd: sql``,
    cropAnd: sql``,
    esgAnd: sql``,
  },
  {
    name: 'state=SP',
    query: '?state=SP',
    farmAnd: sql`AND state = 'SP'`,
    cropAnd: sql`AND f.state = 'SP'`,
    esgAnd: sql`AND f.state = 'SP'`,
  },
  {
    name: 'crop=Soja',
    query: '?crop=Soja',
    farmAnd: sojaExists,
    cropAnd: sojaExistsOnF,
    esgAnd: sojaExistsOnF,
  },
];

const results = [];

for (const scenario of scenarios) {
  const api = await fetchStats(scenario.query);
  const totals = await refTotals(scenario.farmAnd);
  assertEqual(`${scenario.name} totalFarms`, api.totalFarms, totals.totalFarms);
  approxHectares(api.totalHectares, totals.totalHectares);

  assertEqual(
    `${scenario.name} byState`,
    mapByState(api),
    await refByState(scenario.farmAnd),
  );
  assertEqual(
    `${scenario.name} byCrop`,
    mapByCrop(api),
    await refByCrop(scenario.cropAnd),
  );
  assertEqual(
    `${scenario.name} byCar`,
    mapByCar(api),
    await refByCar(scenario.farmAnd),
  );
  assertEqual(
    `${scenario.name} byEsg`,
    mapByEsg(api),
    await refByEsg(scenario.esgAnd),
  );

  results.push({
    scenario: scenario.name,
    ok: true,
    totalFarms: api.totalFarms,
  });
  console.log(`PASS ${scenario.name} totalFarms=${api.totalFarms}`);
}

await sql.end({ timeout: 5 });
console.log(JSON.stringify({ ok: true, results }, null, 2));
