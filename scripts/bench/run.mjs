#!/usr/bin/env node
/**
 * Orquestra seed → verify → explain → load → report.
 * Uso: node --env-file=.env scripts/bench/run.mjs --scale=S
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { parseScale } from './lib/scale.mjs';

const scale = parseScale();
const envFile = process.env.BENCH_ENV_FILE ?? '.env';

function runNode(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = ['--env-file', envFile, script, `--scale=${scale}`, ...extraArgs];
    const child = spawn(process.execPath, args, {
      stdio: 'inherit',
      env: process.env,
      cwd: process.cwd(),
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited ${code}`));
    });
  });
}

async function runNodeCapture(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const args = ['--env-file', envFile, script, `--scale=${scale}`, ...extraArgs];
    const child = spawn(process.execPath, args, {
      stdio: ['ignore', 'pipe', 'inherit'],
      env: process.env,
      cwd: process.cwd(),
    });
    let out = '';
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
      process.stdout.write(chunk);
    });
    child.on('exit', (code) => {
      resolve({ code: code ?? 1, out });
    });
    child.on('error', reject);
  });
}

const skipSeed = process.argv.includes('--skip-seed');
const date = new Date().toISOString().slice(0, 10);
const reportsDir = join(process.cwd(), 'docs', 'bench', 'reports');
await mkdir(reportsDir, { recursive: true });

console.log(`=== bench:run scale=${scale} ===`);

if (!skipSeed) {
  await runNode('scripts/bench/seed-scale.mjs', ['--verify-counts']);
}

let verifyOk = false;
try {
  await runNode('scripts/bench/verify-aggregates.mjs');
  verifyOk = true;
} catch (err) {
  console.error('verify-aggregates FAILED', err.message);
}

await runNode('scripts/bench/explain-capture.mjs');

let loadReport = null;
let loadOut = '';
const loadResult = await runNodeCapture('scripts/bench/load-http.mjs');
loadOut = loadResult.out;
if (loadResult.code !== 0) {
  console.error(`load-http exited ${loadResult.code}`);
}
const jsonStart = loadOut.lastIndexOf('\n{') >= 0
  ? loadOut.lastIndexOf('\n{') + 1
  : loadOut.lastIndexOf('{');
if (jsonStart >= 0) {
  try {
    loadReport = JSON.parse(loadOut.slice(jsonStart));
  } catch (err) {
    console.error('failed to parse load report JSON', err.message);
  }
}

const pass = verifyOk && loadReport?.pass === true;
const reportPath = join(reportsDir, `${scale}-${date}.md`);

const gatesTable = (loadReport?.gates ?? [])
  .map(
    (g) =>
      `| ${g.name} | ${g.actual} | ${g.limit} | ${g.ok ? 'PASS' : 'FAIL'} |`,
  )
  .join('\n');

const resultsTable = (loadReport?.results ?? [])
  .map(
    (r) =>
      `| ${r.id} | ${r.p50} | ${r.p95} | ${r.p99} | ${r.rps} | ${r.errors} |`,
  )
  .join('\n');

const md = `# Bench report ${scale} — ${date}

- **PASS:** ${pass}
- **Base URL:** ${loadReport?.baseUrl ?? process.env.BENCH_BASE_URL ?? 'http://localhost:3000'}
- **Verify aggregates:** ${verifyOk ? 'PASS' : 'FAIL'}
- **EXPLAIN artifacts:** \`docs/bench/artifacts/${scale}/\`

## Gates

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
${gatesTable || '| — | — | — | — |'}

## Latency / throughput

| ID | p50 (ms) | p95 (ms) | p99 (ms) | rps | errors |
|----|----------|----------|----------|-----|--------|
${resultsTable || '| — | — | — | — | — | — |'}

## Remediação

${pass ? 'Nenhuma — gates OK. Não abrir PR de otimização preventivo.' : 'Abrir item do backlog (pool / índices / cache / listagem) **somente** com EXPLAIN before/after.'}

## Ambiente

Documentar manualmente: CPU/RAM host, limites do container Postgres, \`NODE_ENV\` da API.
`;

await writeFile(reportPath, md, 'utf8');
console.log(`Report written: ${reportPath}`);
console.log(JSON.stringify({ pass, verifyOk, reportPath }, null, 2));
if (!pass) process.exitCode = 1;
