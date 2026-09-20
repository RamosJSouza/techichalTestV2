#!/usr/bin/env node
/**
 * Mede tamanhos gzip dos chunks em client/dist (após pnpm build:client).
 */
import { createGzip } from 'node:zlib';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, stat, unlink, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const distDir = join(process.cwd(), 'client', 'dist', 'assets');
const outDir = join(process.cwd(), 'docs', 'bench', 'artifacts');
await mkdir(outDir, { recursive: true });

const GATES = {
  vendor: 180 * 1024,
  recharts: 120 * 1024,
  entry: 80 * 1024,
};

async function gzipSize(filePath) {
  const tmp = join(tmpdir(), `bench-${Date.now()}-${Math.random()}.gz`);
  await pipeline(createReadStream(filePath), createGzip(), createWriteStream(tmp));
  const s = await stat(tmp);
  await unlink(tmp);
  return s.size;
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
  let kind = 'other';
  if (file.includes('vendor')) kind = 'vendor';
  else if (file.includes('recharts')) kind = 'recharts';
  else if (file.includes('xlsx')) kind = 'xlsx';
  else if (/^index-/.test(file)) kind = 'entry';
  rows.push({ file, kind, raw, gzip: gz });
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

const pass = gates.every((g) => g.ok);
const report = { at: new Date().toISOString(), rows, gates, pass };
await writeFile(join(outDir, 'bundle-size.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) process.exitCode = 1;
