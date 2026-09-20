#!/usr/bin/env node
/**
 * Mede tamanhos gzip dos chunks em client/dist (após pnpm build:client).
 * Gates: entry / vendor / recharts — regressão >10% vs baseline = FAIL.
 */
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, stat, unlink, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const distDir = join(process.cwd(), 'client', 'dist', 'assets');
const outDir = join(process.cwd(), 'docs', 'bench', 'artifacts');
await mkdir(outDir, { recursive: true });

/** Limites gzip (bytes) — atualizados após code-split (ver bundle-size-before/after). */
const GATES = {
  vendor: 180 * 1024,
  recharts: 120 * 1024,
  /** Entry após lazy routes + charts; baseline ~2026-09 pós-split. */
  entry: 100 * 1024,
};

async function gzipSize(filePath) {
  const tmp = join(tmpdir(), `bench-${Date.now()}-${Math.random()}.gz`);
  await pipeline(createReadStream(filePath), createGzip(), createWriteStream(tmp));
  const s = await stat(tmp);
  await unlink(tmp);
  return s.size;
}

function classify(file) {
  if (file.includes('vendor')) return 'vendor';
  if (file.includes('recharts')) return 'recharts';
  if (/^index-/.test(file)) return 'entry';
  return 'other';
}

let files;
try {
  files = await readdir(distDir);
} catch {
  console.error('client/dist/assets not found — run pnpm build:client first');
  process.exit(1);
}

const jsFiles = files.filter((f) => f.endsWith('.js'));
const rows = [];

for (const file of jsFiles) {
  const full = join(distDir, file);
  const raw = (await stat(full)).size;
  const gz = await gzipSize(full);
  rows.push({ file, kind: classify(file), raw, gzip: gz });
}

const byKind = Object.fromEntries(
  ['vendor', 'recharts', 'entry'].map((k) => {
    const match = rows.find((r) => r.kind === k);
    return [k, match?.gzip ?? null];
  }),
);

const gates = Object.entries(GATES).map(([name, limit]) => {
  const actual = byKind[name];
  return {
    name,
    actual,
    limit,
    ok: actual !== null && actual <= limit,
  };
});

let baselineDelta = null;
const baselinePath = join(outDir, 'bundle-size-baseline.json');
try {
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  baselineDelta = Object.fromEntries(
    ['vendor', 'recharts', 'entry'].map((k) => {
      const prev = baseline?.byKind?.[k];
      const curr = byKind[k];
      if (prev == null || curr == null) {
        return [k, null];
      }
      const pct = ((curr - prev) / prev) * 100;
      return [k, { prev, curr, pct, ok: pct <= 10 }];
    }),
  );
  for (const [k, d] of Object.entries(baselineDelta)) {
    if (d && !d.ok) {
      gates.push({
        name: `regression:${k}`,
        actual: d.curr,
        limit: Math.ceil(d.prev * 1.1),
        ok: false,
      });
    }
  }
} catch {
  /* sem baseline — primeira medição */
}

const pass = gates.every((g) => g.ok);
const report = {
  at: new Date().toISOString(),
  rows,
  byKind,
  gates,
  baselineDelta,
  pass,
};
await writeFile(join(outDir, 'bundle-size.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exitCode = 1;
