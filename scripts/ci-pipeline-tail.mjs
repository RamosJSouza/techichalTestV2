#!/usr/bin/env node
/**
 * Continua o pipeline após openapi-drift (quando o artefato ainda não está no HEAD).
 * NÃO é o gate de release — só evidência local dos steps restantes.
 * Release canônico: `pnpm ci:docker` → `scripts/ci-pipeline.mjs` (fail-fast completo).
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const resultsFile = join(root, 'docs', 'release', 'last-docker-run-tail.jsonl');
mkdirSync(join(root, 'docs', 'release'), { recursive: true });
writeFileSync(resultsFile, '');

function run(label, command, args) {
  console.log(`\n========== ${label} ==========`);
  console.log(`$ ${command} ${args.join(' ')}`);
  const t0 = Date.now();
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  const code = result.status ?? 1;
  appendFileSync(
    resultsFile,
    `${JSON.stringify({ step: label, exitCode: code, ms: Date.now() - t0 })}\n`,
  );
  console.log(`>>> RESULT ${label} exit=${code}`);
  if (code !== 0) {
    process.exit(code);
  }
}

spawnSync('git', ['config', '--global', '--add', 'safe.directory', '/workspace'], {
  stdio: 'ignore',
});

run('contract', 'pnpm', ['test:contract']);
run('e2e', 'pnpm', ['test:e2e']);
run('audit-prod', 'pnpm', ['audit:ci']);
run('build', 'pnpm', ['build']);
run('bundle-budget', 'pnpm', ['bench:bundle']);
run('bench-http', 'pnpm', ['bench:ci']);
console.log('\ntail-pipeline PASS');
