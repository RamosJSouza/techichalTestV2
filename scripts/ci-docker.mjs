#!/usr/bin/env node
/**
 * Wrapper host → Docker apenas.
 * Não usa Node engines do host para o pipeline (só este launcher).
 *
 * Uso: node scripts/ci-docker.mjs
 *      pnpm ci:docker
 *
 * Flags: --keep  (não faz down ao final)
 *        --purge (down -v: limpa volumes de cache node_modules/store)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const composeFile = join(root, 'docker-compose.release.yml');
const args = new Set(process.argv.slice(2));
const keep = args.has('--keep');
const purge = args.has('--purge');

function resolveDocker() {
  const fromEnv = process.env.DOCKER_BIN;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }
  const which = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['docker'],
    { encoding: 'utf8', shell: false },
  );
  if (which.status === 0) {
    const first = (which.stdout || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    if (first) {
      return first;
    }
  }
  const candidates = [
    join(
      process.env.LOCALAPPDATA ?? '',
      'Programs',
      'DockerDesktop',
      'resources',
      'bin',
      'docker.exe',
    ),
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
    '/usr/bin/docker',
    '/usr/local/bin/docker',
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) {
      return c;
    }
  }
  return null;
}

const docker = resolveDocker();
if (!docker) {
  console.error(
    'ci:docker FAIL: Docker CLI não encontrado. Instale Docker Desktop / Engine e garanta `docker` no PATH.',
  );
  process.exit(127);
}

function downArgs() {
  return purge
    ? ['compose', '-f', composeFile, 'down', '-v', '--remove-orphans']
    : ['compose', '-f', composeFile, 'down', '--remove-orphans'];
}

function runDocker(dockerArgs, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`$ docker ${dockerArgs.join(' ')}`);
  const result = spawnSync(docker, dockerArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    const err = new Error(`${label} failed (exit ${code})`);
    err.exitCode = code;
    throw err;
  }
  return code;
}

let exitCode = 0;
try {
  console.log(`ci:docker using ${docker}`);
  runDocker(
    downArgs(),
    purge ? 'Teardown prévio (purge volumes)' : 'Teardown prévio',
  );
  runDocker(
    ['compose', '-f', composeFile, 'build', 'ci'],
    'Build imagem CI (node:22.22.3 + pnpm@10.32.1)',
  );
  runDocker(
    ['compose', '-f', composeFile, 'run', '--rm', 'ci'],
    'Pipeline completo (Postgres 16 + steps)',
  );
  console.log('\nci:docker PASS');
} catch (err) {
  exitCode =
    err && typeof err === 'object' && 'exitCode' in err
      ? Number(err.exitCode)
      : 1;
  console.error(`\nci:docker FAIL: ${err instanceof Error ? err.message : err}`);
} finally {
  if (!keep) {
    spawnSync(docker, downArgs(), {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
  } else {
    console.log('\n--keep: stack release permanece no ar');
  }
}

process.exit(exitCode);
