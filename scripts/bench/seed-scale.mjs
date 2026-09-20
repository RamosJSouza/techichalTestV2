#!/usr/bin/env node
/**
 * Seed sintético para bench. TRUNCATE CASCADE — não use em dados reais.
 * Uso: node --env-file=.env scripts/bench/seed-scale.mjs --scale=S
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { cpfFromIndex } from './lib/cpf.mjs';
import { createBenchCrypto } from './lib/crypto-bench.mjs';
import {
  ALL_STATES,
  CITIES,
  CROPS,
  MAJOR_STATES,
  createRng,
  farmsForScale,
  parseScale,
} from './lib/scale.mjs';

const scale = parseScale();
const targetFarms = farmsForScale(scale);
const producerCount = Math.ceil(targetFarms / 3);
const batchSize = scale === 'L' ? 2000 : 500;

const databaseUrl = process.env.DATABASE_URL;
const encryptionKey = process.env.ENCRYPTION_KEY;
const pepper = process.env.PEPPER_SECRET;
const keyId = process.env.ENCRYPTION_KEY_ID ?? 'v1';

if (!databaseUrl || !encryptionKey || !pepper) {
  throw new Error('DATABASE_URL, ENCRYPTION_KEY and PEPPER_SECRET are required');
}

const crypto = createBenchCrypto(pepper, encryptionKey, keyId);
const rng = createRng();
const sql = postgres(databaseUrl, { max: 4 });

function pickState() {
  if (rng() < 0.6) {
    return MAJOR_STATES[Math.floor(rng() * MAJOR_STATES.length)];
  }
  return ALL_STATES[Math.floor(rng() * ALL_STATES.length)];
}

function pickCarStatus() {
  const r = rng();
  if (r < 0.7) return 'ACTIVE';
  if (r < 0.9) return 'PENDING';
  if (r < 0.95) return 'CANCELLED';
  return null;
}

function pickEsg() {
  const r = rng();
  if (r < 0.8) return 'APPROVED';
  if (r < 0.95) return 'WARNING';
  return 'BLOCKED';
}

console.log(`Seeding scale=${scale} farms=${targetFarms} producers=${producerCount}`);

const t0 = Date.now();

await sql`TRUNCATE TABLE farm_crops, harvests, farms, producers RESTART IDENTITY CASCADE`;

const producerIds = [];
for (let i = 0; i < producerCount; i += 1) {
  producerIds.push(randomUUID());
}

for (let offset = 0; offset < producerCount; offset += batchSize) {
  const end = Math.min(offset + batchSize, producerCount);
  const rows = [];
  for (let i = offset; i < end; i += 1) {
    const digits = cpfFromIndex(i);
    const deleted = rng() < 0.02;
    rows.push({
      id: producerIds[i],
      name: `Produtor Bench ${i}`,
      document: crypto.encrypt(digits),
      document_hash: crypto.blindIndex(digits),
      esg_status: pickEsg(),
      document_validation_status: 'VALIDATED',
      deleted_at: deleted ? new Date().toISOString() : null,
    });
  }
  await sql`
    INSERT INTO producers ${sql(
      rows,
      'id',
      'name',
      'document',
      'document_hash',
      'esg_status',
      'document_validation_status',
      'deleted_at',
    )}
  `;
  process.stdout.write(`\rproducers ${end}/${producerCount}`);
}
console.log('');

const farmIds = [];
const farmProducerIds = [];
let farmIndex = 0;

for (let offset = 0; offset < targetFarms; offset += batchSize) {
  const end = Math.min(offset + batchSize, targetFarms);
  const rows = [];
  for (let i = offset; i < end; i += 1) {
    const id = randomUUID();
    farmIds.push(id);
    const producerId = producerIds[i % producerCount];
    farmProducerIds.push(producerId);
    const total = 100 + Math.floor(rng() * 1900);
    const arable = Math.floor(total * (0.4 + rng() * 0.4));
    const vegetation = Math.min(
      total - arable,
      Math.floor(total * (0.1 + rng() * 0.2)),
    );
    const hasClimate = rng() < 0.8;
    const deleted = rng() < 0.02;
    const state = pickState();
    const carHex = (`0`.repeat(32) + i.toString(16)).slice(-32).toUpperCase();
    const carNumber = `${state}-${String(1_000_000 + (i % 8_000_000)).padStart(7, '0')}-${carHex}`;
    rows.push({
      id,
      producer_id: producerId,
      name: `Fazenda ${i}`,
      city: CITIES[i % CITIES.length],
      state,
      total_area: String(total.toFixed(2)),
      arable_area: String(arable.toFixed(2)),
      vegetation_area: String(vegetation.toFixed(2)),
      car_number: carNumber,
      car_status: pickCarStatus(),
      climate_risk_score: hasClimate
        ? String((rng() * 100).toFixed(2))
        : null,
      territorial_validation_status: 'VALIDATED',
      deleted_at: deleted ? new Date().toISOString() : null,
      created_at: new Date(
        Date.UTC(2024, Math.floor(rng() * 12), 1 + Math.floor(rng() * 27)),
      ).toISOString(),
    });
    farmIndex += 1;
  }
  await sql`
    INSERT INTO farms ${sql(
      rows,
      'id',
      'producer_id',
      'name',
      'city',
      'state',
      'total_area',
      'arable_area',
      'vegetation_area',
      'car_number',
      'car_status',
      'climate_risk_score',
      'territorial_validation_status',
      'deleted_at',
      'created_at',
    )}
  `;
  process.stdout.write(`\rfarms ${end}/${targetFarms}`);
}
console.log('');

const harvestIds = [];
for (let offset = 0; offset < farmIds.length; offset += batchSize) {
  const end = Math.min(offset + batchSize, farmIds.length);
  const rows = [];
  for (let i = offset; i < end; i += 1) {
    for (const year of ['2024/2025', '2025/2026']) {
      const id = randomUUID();
      harvestIds.push({ id, farmId: farmIds[i], year });
      rows.push({
        id,
        farm_id: farmIds[i],
        year,
        status: year === '2024/2025' && rng() < 0.15 ? 'ARCHIVED' : 'ACTIVE',
      });
    }
  }
  await sql`
    INSERT INTO harvests ${sql(rows, 'id', 'farm_id', 'year', 'status')}
  `;
  process.stdout.write(`\rharvests batch farms ${end}/${farmIds.length}`);
}
console.log('');

for (let offset = 0; offset < harvestIds.length; offset += batchSize) {
  const end = Math.min(offset + batchSize, harvestIds.length);
  const rows = [];
  for (let i = offset; i < end; i += 1) {
    const h = harvestIds[i];
    const cropA = CROPS[i % CROPS.length];
    const cropB = CROPS[(i + 1) % CROPS.length];
    rows.push({
      id: randomUUID(),
      harvest_id: h.id,
      crop_name: cropA,
    });
    rows.push({
      id: randomUUID(),
      harvest_id: h.id,
      crop_name: cropB,
    });
  }
  await sql`
    INSERT INTO farm_crops ${sql(rows, 'id', 'harvest_id', 'crop_name')}
  `;
  process.stdout.write(`\rcrops harvests ${end}/${harvestIds.length}`);
}
console.log('');

await sql`ANALYZE producers`;
await sql`ANALYZE farms`;
await sql`ANALYZE harvests`;
await sql`ANALYZE farm_crops`;

const [counts] = await sql`
  SELECT
    (SELECT count(*)::int FROM producers WHERE deleted_at IS NULL) AS producers_active,
    (SELECT count(*)::int FROM farms WHERE deleted_at IS NULL) AS farms_active,
    (SELECT count(*)::int FROM harvests) AS harvests_total,
    (SELECT count(*)::int FROM farm_crops) AS crops_total
`;

console.log(
  JSON.stringify(
    {
      scale,
      elapsedMs: Date.now() - t0,
      ...counts,
      targetFarms,
    },
    null,
    2,
  ),
);

if (process.argv.includes('--verify-counts')) {
  if (Number(counts.farms_active) < targetFarms * 0.9) {
    throw new Error(
      `Expected ~${targetFarms} active farms, got ${counts.farms_active}`,
    );
  }
}

await sql.end({ timeout: 5 });
