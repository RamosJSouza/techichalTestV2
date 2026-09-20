#!/usr/bin/env node
/**
 * Valida Node e pnpm contra package.json engines / packageManager.
 * Uso: node scripts/preflight.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const expectedNode = pkg.engines?.node;
const expectedPnpm =
  pkg.engines?.pnpm ??
  (typeof pkg.packageManager === 'string'
    ? pkg.packageManager.replace(/^pnpm@/, '')
    : undefined);

function fail(message) {
  console.error(`preflight FAIL: ${message}`);
  process.exit(1);
}

if (!expectedNode) {
  fail('package.json engines.node is missing');
}

const actualNode = process.versions.node;
if (actualNode !== expectedNode) {
  fail(`Node ${actualNode} !== required ${expectedNode} (see .nvmrc / engines)`);
}

if (!expectedPnpm) {
  fail('package.json engines.pnpm / packageManager is missing');
}

const pnpmResult = spawnSync('pnpm', ['--version'], {
  encoding: 'utf8',
  shell: true,
});
if (pnpmResult.status !== 0) {
  fail('pnpm is not available on PATH (enable Corepack)');
}
const actualPnpm = (pnpmResult.stdout || '').trim();
if (actualPnpm !== expectedPnpm) {
  fail(
    `pnpm ${actualPnpm} !== required ${expectedPnpm} (corepack prepare pnpm@${expectedPnpm} --activate)`,
  );
}

console.log(
  `preflight OK: node ${actualNode}, pnpm ${actualPnpm}`,
);
