#!/usr/bin/env node
/**
 * Pipeline de release determinístico — executado DENTRO do container CI
 * (Dockerfile.ci + docker-compose.release.yml).
 *
 * Não soft-fail: qualquer step ≠ 0 aborta com o mesmo exit code.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const resultsDir = join(root, 'docs', 'release');
const resultsFile = join(resultsDir, 'last-docker-run.jsonl');

mkdirSync(resultsDir, { recursive: true });
writeFileSync(resultsFile, '');

const startedAt = new Date().toISOString();

function record(step, exitCode, ms) {
  const line = JSON.stringify({
    step,
    exitCode,
    ms,
    at: new Date().toISOString(),
  });
  appendFileSync(resultsFile, `${line}\n`);
  console.log(`>>> RESULT ${step} exit=${exitCode} ${ms}ms`);
}

function run(label, command, args) {
  console.log(`\n========== ${label} ==========`);
  console.log(`$ ${command} ${args.join(' ')}`);
  const t0 = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  const code = result.status ?? 1;
  record(label, code, Date.now() - t0);
  if (code !== 0) {
    const err = new Error(`${label} FAILED (exit ${code})`);
    err.exitCode = code;
    throw err;
  }
}

const steps = [
  ['preflight', 'pnpm', ['preflight']],
  ['install-frozen', 'pnpm', ['install', '--frozen-lockfile']],
  ['migrate', 'pnpm', ['ci:migrate']],
  ['lint', 'pnpm', ['lint']],
  ['test-api', 'pnpm', ['test:api']],
  ['test-client', 'pnpm', ['test:client']],
  ['coverage', 'pnpm', ['test:cov:ci']],
  ['openapi-export', 'pnpm', ['openapi:export']],
  ['openapi-drift', 'git', ['diff', '--exit-code', 'docs/openapi.json']],
  ['contract', 'pnpm', ['test:contract']],
  ['e2e', 'pnpm', ['test:e2e']],
  ['audit-prod', 'pnpm', ['audit:ci']],
  ['build', 'pnpm', ['build']],
  ['bundle-budget', 'pnpm', ['bench:bundle']],
  ['bench-http', 'pnpm', ['bench:ci']],
];

let exitCode = 0;
try {
  console.log(`ci-pipeline START ${startedAt}`);
  console.log(
    `node=${process.versions.node} pnpm=${spawnSync('pnpm', ['--version'], { encoding: 'utf8' }).stdout.trim()}`,
  );
  // Bind mount Windows → ownership diferente; necessário para git diff.
  spawnSync('git', ['config', '--global', '--add', 'safe.directory', '/workspace'], {
    stdio: 'ignore',
  });
  for (const [label, cmd, args] of steps) {
    run(label, cmd, args);
  }
  console.log('\nci-pipeline PASS');
  record('ci-pipeline', 0, Date.now() - Date.parse(startedAt));
} catch (err) {
  exitCode =
    err && typeof err === 'object' && 'exitCode' in err
      ? Number(err.exitCode)
      : 1;
  console.error(
    `\nci-pipeline FAIL: ${err instanceof Error ? err.message : String(err)}`,
  );
  record('ci-pipeline', exitCode, Date.now() - Date.parse(startedAt));
}

process.exit(exitCode);
