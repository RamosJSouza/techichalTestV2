# Release checklist — Brain Agriculture

**Data:** 2026-09-20  
**Escopo:** monorepo API NestJS + SPA React (desafio rural producer).  
**Não inclui neste ciclo:** JWT/auth de usuário, fechar CRUD aberto, reescrita de SQL `0000–0003`, soft-fail do bench GHA.

Status após correções de baixo risco desta revisão.

| Área | Status | Evidência / notas |
|------|--------|-------------------|
| Engines Node/pnpm | **PASS** | `package.json` engines `22.22.3` / `10.32.1`; `pnpm preflight`; CI alinhado |
| Quickstart local | **PASS** | `.env_example` → postgres `:5433` → `ci:migrate` → `pnpm dev` |
| Links README | **PASS** | Aponta para este checklist; links mortos removidos |
| Tabela endpoints README | **PASS** | Inclui summary/analytics, admin, IBGE, health alias, metrics |
| `.env_example` vs schema | **PASS** | Vars alinhadas; aviso de secrets só local/demo no topo |
| Compose env wiring | **PASS** | `ADMIN_API_TOKEN`, `REVALIDATE_*`, `ENCRYPTION_KEY_ID`, `BODY_LIMIT`, `TRUST_PROXY` |
| Docker health | **PASS** | Probe `GET /api/v1/health/ready` (DB) com `start_period` |
| Dockerfile/entrypoint | **PASS** | wait Postgres → migrate → `dist/main.js` |
| Segredos no git | **PASS** | `.env` no `.gitignore`; sem tokens cloud |
| Artefatos bench | **RISK** | `docs/bench/artifacts/` commitado como baseline de CI; regenerável via `bench:*` |
| OpenAPI | **PASS** | `docs/openapi.json` + gate `git diff --exit-code` no CI |
| Migrations journal | **PASS** | Drizzle aplica once via `scripts/migrate.mjs` |
| Idempotência SQL raw | **RISK** | `0000–0003` sem `IF NOT EXISTS`; **não** reaplicar fora do migrator |
| Health/metrics | **PASS** | live / ready / metrics; rate-limit skip `/health*` e `/metrics` |
| Auth modelo | **PASS** (desafio) | Só `X-Admin-Token` em revalidate; resto aberto — P0 documentado |
| Frontend SystemStatusPill | **PASS** | Probe real `/api/v1/health/ready` (alinhado ao Compose) |
| Scripts CI parity | **PASS** | `pnpm ci:local` espelha `.github/workflows/ci.yml` |
| Bench SLO escala S | **RISK** | Gate bloqueante; sensível a latência do runner GHA |
| Coverage floor | **RISK** | Relatório em CI; sem `coverageThreshold` agressivo nesta entrega |

## Gates conhecidos (falham de propósito)

| Gate | Comportamento |
|------|----------------|
| OpenAPI drift | `openapi:export` + `git diff --exit-code docs/openapi.json` → exit ≠ 0 se contrato desatualizado |
| Audit | `pnpm audit:ci` → high+ em deps **prod** |
| Bundle gzip | `pnpm bench:bundle` → budgets + regressão vs baseline |
| Bench HTTP S | `pnpm bench:ci` → SLO p95/p99/RPS; pode falhar no runner |

## Prova (comandos e exit codes esperados)

Rodar na raiz do repo (engines corretos). Exit **0** = OK.

Execução desta revisão (**2026-09-20**):

| Comando | Exit |
|---------|------|
| `pnpm preflight` | **0** |
| `pnpm lint` | **0** |
| `pnpm test:api` | **0** (136 tests) |
| `pnpm test:client` | **0** (67 tests) |
| `pnpm openapi:export` | **0** (artefato sync: `cursor` / `nextCursor`) |
| `git diff --exit-code docs/openapi.json` | **1** vs commit anterior (drift esperado até o artefato entrar no commit); re-export idempotente |
| `pnpm test:contract` | **0** (8 tests) |

```bash
pnpm preflight
pnpm lint
pnpm test:api
pnpm test:client
pnpm openapi:export
git diff --exit-code docs/openapi.json
pnpm test:contract
```

Com Postgres (`DATABASE_URL`):

```bash
pnpm ci:migrate         # expect 0
pnpm test:e2e           # expect 0
```

Não declarar sucesso sem saída real dos comandos acima.

## Fora de escopo (consciente)

- Auth JWT / fechar API à internet.
- Soft-fail de `bench:ci` no GitHub Actions.
- Reescrita idempotente de migrations antigas no journal.
- Coverage thresholds sem baseline medida.

Ver também: [README — Known limitations and trade-offs](../README.md#known-limitations-and-trade-offs).
