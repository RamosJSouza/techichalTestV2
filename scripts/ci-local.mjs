#!/usr/bin/env node
/**
 * Réplica local do job build-test (.github/workflows/ci.yml).
 * Uso: pnpm ci:local
 * Flags: --skip-docker | --keep-db
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const composeFile = join(root, 'docker-compose.ci.yml');
const args = new Set(process.argv.slice(2));
const skipDocker = args.has('--skip-docker');
const keepDb = args.has('--keep-db');

/** Mesmo bloco env: do ci.yml */
const ciEnv = {
  ...process.env,
  CI: 'true',
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL:
    'postgres://postgres:ci_strong_password_9f3a@localhost:5432/brain_agriculture',
  ENCRYPTION_KEY:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  PEPPER_SECRET: 'ci-pepper-secret-min16',
  BRASIL_API_BASE_URL: 'https://brasilapi.com.br/api',
  THROTTLE_LIMIT: '10000',
  BENCH_BASE_URL: 'http://localhost:3000',
};

function run(command, commandArgs, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`$ ${command} ${commandArgs.join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: ciEnv,
    stdio: 'inherit',
    shell: true,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    throw Object.assign(new Error(`${label} failed (exit ${code})`), {
      exitCode: code,
    });
  }
}

function printArtifacts() {
  console.log('\n=== Artefatos (paridade upload CI) ===');
  const paths = [
    'docs/openapi.json',
    'coverage/',
    'docs/bench/artifacts/bundle-size.json',
    'docs/bench/artifacts/bench-ci-S.json',
  ];
  for (const p of paths) {
    const full = join(root, p);
    const ok = existsSync(full);
    console.log(`  ${ok ? 'OK' : '--'} ${p}`);
  }
  const reportsDir = join(root, 'docs', 'bench', 'reports');
  if (existsSync(reportsDir)) {
    const reports = readdirSync(reportsDir).filter((f) =>
      /^ci-S-.*\.md$/.test(f),
    );
    if (reports.length === 0) {
      console.log('  -- docs/bench/reports/ci-S-*.md');
    } else {
      for (const f of reports) {
        console.log(`  OK docs/bench/reports/${f}`);
      }
    }
  } else {
    console.log('  -- docs/bench/reports/ci-S-*.md');
  }
}

function teardownDocker() {
  if (skipDocker || keepDb) {
    if (keepDb) {
      console.log('\n=== --keep-db: Postgres CI permanece no ar ===');
    }
    return;
  }
  console.log('\n=== Teardown Postgres CI (down -v) ===');
  spawnSync(
    'docker',
    ['compose', '-f', composeFile, 'down', '-v'],
    { cwd: root, stdio: 'inherit', shell: true },
  );
}

let exitCode = 0;
try {
  if (!skipDocker) {
    run(
      'docker',
      ['compose', '-f', composeFile, 'up', '-d', '--wait'],
      'Postgres efêmero (docker-compose.ci.yml)',
    );
  } else {
    console.log('\n=== --skip-docker: assumindo Postgres em :5432 ===');
  }

  run('pnpm', ['preflight'], 'Preflight (Node + pnpm)');
  run('pnpm', ['install', '--frozen-lockfile'], 'Install');
  run('pnpm', ['ci:migrate'], 'Migrate');
  run('pnpm', ['lint'], 'Lint');
  run('pnpm', ['test:api'], 'Unit tests (API)');
  run('pnpm', ['test:client'], 'Unit tests (client)');
  run('pnpm', ['test:cov:ci'], 'Coverage');
  run('pnpm', ['openapi:export'], 'OpenAPI export');
  run('git', ['diff', '--exit-code', 'docs/openapi.json'], 'OpenAPI drift check');
  run('pnpm', ['test:contract'], 'Contract tests');
  run('pnpm', ['test:e2e'], 'E2E');
  run('pnpm', ['audit:ci'], 'Audit (prod high+)');
  run('pnpm', ['build'], 'Build');
  run('pnpm', ['bench:bundle'], 'Bundle size gates (gzip)');
  run('pnpm', ['bench:ci'], 'Bench HTTP gates (scale S)');

  console.log('\nci:local PASS');
} catch (err) {
  exitCode = err && typeof err === 'object' && 'exitCode' in err
    ? Number(err.exitCode)
    : 1;
  console.error(`\nci:local FAIL: ${err instanceof Error ? err.message : err}`);
} finally {
  printArtifacts();
  teardownDocker();
}

process.exit(exitCode);
