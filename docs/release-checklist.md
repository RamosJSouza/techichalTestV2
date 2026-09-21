# Release checklist — Brain Agriculture

**Data da prova:** 2026-09-21 (UTC)  
**Commit base (HEAD):** `b3bc0d74e8fd8fbc27171ac88fc1fcfd3ac0871a`  
**Imagem CI:** `brain-ag-ci:22.22.3-pnpm10.32.1` (`node:22.22.3-bookworm-slim` + `pnpm@10.32.1`)  
**Postgres:** `postgres:16-alpine`  
**Comando canônico:** `pnpm ci:docker` → `docker compose -f docker-compose.release.yml run --rm ci`  
**Host:** apenas Docker CLI (Node/pnpm do host **não** entram no pipeline).

**Veredito do pipeline completo (`ci:docker` / `ci-pipeline.mjs`):** **FAIL** — gate `openapi-drift` exit **1** (artefato `docs/openapi.json` no working tree diverge do HEAD: remoção de `crops.minItems`; export está correto; **requer commit** para o gate ficar verde). Nenhum gate falho foi rebaixado a warning.

## Exit codes executados agora

Fonte: `docs/release/last-docker-run.jsonl` + `docs/release/last-docker-run-tail.jsonl`.

| Step | Exit | ms (aprox.) | Notas |
|------|------|-------------|--------|
| preflight | **0** | 3–4s | node 22.22.3, pnpm 10.32.1 |
| install-frozen | **0** | 172–277s | volumes Linux p/ `node_modules` + store |
| migrate | **0** | ~4s | DB limpa no Postgres do compose |
| lint | **0** | ~3–4s | |
| test-api | **0** | ~27s | 142 tests |
| test-client | **0** | ~29s | |
| coverage | **0** | ~123s | após fix `test:cov` no client (ver abaixo) |
| openapi-export | **0** | ~52s | |
| openapi-drift | **1** | &lt;1s | **bloqueador de release** vs HEAD |
| contract | **0** | ~7s | rodado no tail pós-drift |
| e2e | **0** | ~28s | |
| audit-prod | **0** | ~4s | `pnpm audit --prod --audit-level=high` |
| build | **0** | ~47s | |
| bundle-budget | **0** | ~2s | |
| bench-http | **0** | ~59s | scale S, gates HTTP |

## Correções reais aplicadas nesta validação

1. **`test:cov:ci` quebrado** — `pnpm --filter @brain-ag/client test -- --coverage` fazia o Jest tratar `--coverage` como pattern (`No tests found`). Fix: script `client` `test:cov` + `pnpm --filter @brain-ag/client test:cov`.
2. **Runner Docker determinístico** — `Dockerfile.ci`, `docker-compose.release.yml`, `scripts/ci-docker.mjs`, `scripts/ci-pipeline.mjs` (volumes para `node_modules`/store; bind mount só para fonte/artefatos).
3. **`docs/openapi.json`** — export atual remove `minItems: 1` de `crops` (alinhado a `crops: []`); drift falha até o arquivo entrar no commit.

## Como reproduzir (zero dependência de engines do host)

```bash
# Docker Desktop / Engine no PATH (ou DOCKER_BIN)
pnpm ci:docker
# equivalente:
# docker compose -f docker-compose.release.yml build ci
# docker compose -f docker-compose.release.yml run --rm ci
```

Flags: `--keep` (não derruba compose), `--purge` (down -v limpa volumes de cache).

## Gates conhecidos (continuam bloqueantes)

| Gate | Comportamento |
|------|----------------|
| OpenAPI drift | `openapi:export` + `git diff --exit-code docs/openapi.json` → exit ≠ 0 se contrato ≠ HEAD |
| Audit | `pnpm audit:ci` → high+ em deps **prod** |
| Bundle gzip | `pnpm bench:bundle` → budgets + regressão |
| Bench HTTP S | `pnpm bench:ci` → SLO p95/p99/RPS |

## Limitações conhecidas (não soft-fail)

- Auth JWT / API aberta (exceto admin token) — fora do escopo do desafio.
- `openapi-drift` **FAIL** neste working tree até commit do `docs/openapi.json` (e demais mudanças pendentes).
- Bench GHA sensível a latência do runner; local Docker nesta prova: **PASS**.
- Migrations `0000–0003` não reaplicáveis raw fora do migrator.
- Coverage: relatório gerado; sem `coverageThreshold` agressivo nesta entrega.
- Windows: bind mount de `node_modules` é inviável — use volumes do compose (já configurado).

Ver também: [README — Known limitations](../README.md#known-limitations-and-trade-offs).
