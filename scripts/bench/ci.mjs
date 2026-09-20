#!/usr/bin/env node
/**
 * Bench CI: sobe API (dist), seed S, load-http com gates (exit 1 se FAIL).
 * Pré-requisitos: pnpm build, DATABASE_URL, ENCRYPTION_KEY, PEPPER_SECRET.
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const baseUrl = (process.env.BENCH_BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const port = Number(process.env.PORT ?? 3000);
const scale = 'S';
const reportsDir = join(process.cwd(), 'docs', 'bench', 'reports');
const artifactsDir = join(process.cwd(), 'docs', 'bench', 'artifacts');

function runNode(script, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: opts.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      env: { ...process.env, ...opts.env },
      cwd: process.cwd(),
    });
    let out = '';
    if (opts.capture) {
      child.stdout?.on('data', (c) => {
        out += c.toString();
        process.stdout.write(c);
      });
    }
    child.on('exit', (code) => {
      resolve({ code: code ?? 1, out });
    });
    child.on('error', reject);
  });
}

async function waitHealthy(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/health/live`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(1000);
  }
  throw new Error(`API not healthy at ${baseUrl} within ${timeoutMs}ms`);
}

const apiEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV === 'production' ? 'production' : 'test',
  PORT: String(port),
  THROTTLE_LIMIT: process.env.THROTTLE_LIMIT ?? '10000',
};

console.log('=== bench:ci starting API ===');
const api = spawn(process.execPath, ['dist/main.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: apiEnv,
  cwd: process.cwd(),
});
api.stdout?.on('data', (c) => process.stdout.write(c));
api.stderr?.on('data', (c) => process.stderr.write(c));

let exitCode = 0;
try {
  await waitHealthy();
  console.log('=== bench:ci seed S ===');
  const seed = await runNode('scripts/bench/seed-scale.mjs', [
    `--scale=${scale}`,
    '--verify-counts',
  ]);
  if (seed.code !== 0) {
    throw new Error(`seed-scale exited ${seed.code}`);
  }

  console.log('=== bench:ci load-http ===');
  const load = await runNode(
    'scripts/bench/load-http.mjs',
    [`--scale=${scale}`],
    { capture: true, env: { BENCH_BASE_URL: baseUrl } },
  );
  exitCode = load.code;

  await mkdir(reportsDir, { recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const jsonStart =
    load.out.lastIndexOf('\n{') >= 0
      ? load.out.lastIndexOf('\n{') + 1
      : load.out.lastIndexOf('{');
  let report = { pass: false, scale, at: new Date().toISOString(), gates: [] };
  if (jsonStart >= 0) {
    try {
      report = JSON.parse(load.out.slice(jsonStart));
    } catch {
      /* keep stub */
    }
  }
  const artifactPath = join(artifactsDir, `bench-ci-${scale}.json`);
  await writeFile(artifactPath, JSON.stringify(report, null, 2), 'utf8');

  const gatesTable = (report.gates ?? [])
    .map(
      (g) =>
        `| ${g.name} | ${g.actual} | ${g.limit} | ${g.ok ? 'PASS' : 'FAIL'} |`,
    )
    .join('\n');
  const md = `# Bench CI ${scale} — ${date}

- **PASS:** ${report.pass === true}
- **Base URL:** ${baseUrl}

## Gates

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
${gatesTable || '| — | — | — | — |'}

Artifact: \`docs/bench/artifacts/bench-ci-${scale}.json\`
`;
  await writeFile(join(reportsDir, `ci-${scale}-${date}.md`), md, 'utf8');
  console.log(`bench:ci artifact: ${artifactPath}`);
} catch (err) {
  console.error('bench:ci FAILED', err);
  exitCode = 1;
} finally {
  api.kill('SIGTERM');
  await sleep(1500);
  if (!api.killed) {
    api.kill('SIGKILL');
  }
}

process.exit(exitCode);
