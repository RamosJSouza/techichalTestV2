#!/usr/bin/env node
/**
 * Compila a API e exporta docs/openapi.json via Nest Swagger.
 * Requer DATABASE_URL (AppModule conecta no boot).
 */
import { spawnSync } from 'node:child_process';

const build = spawnSync('pnpm', ['build:api'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
  env: process.env,
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const run = spawnSync(process.execPath, ['dist/openapi-export.js'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
});
process.exit(run.status ?? 1);
