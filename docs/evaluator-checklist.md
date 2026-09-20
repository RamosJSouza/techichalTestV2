# Checklist do avaliador — Brain Agriculture

Comandos idênticos ao CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml) / README quickstart).

Pré-requisito local: `docker compose up -d postgres` + `.env` alinhado a `DATABASE_URL`.

| # | Comando | Esperado |
|---|---------|----------|
| 0 | `pnpm preflight` | PASS (Node 22.22.3 + pnpm 10.32.1) |
| 1 | `pnpm install --frozen-lockfile` | PASS |
| 2 | `pnpm ci:migrate` | PASS |
| 3 | `pnpm lint` | PASS |
| 4 | `pnpm test:api` | PASS |
| 5 | `pnpm test:client` | PASS |
| 6 | `pnpm test:cov:ci` | PASS → `coverage/api`, `coverage/client` |
| 7 | `pnpm openapi:export` + `git diff --exit-code docs/openapi.json` | PASS |
| 8 | `pnpm test:contract` | PASS |
| 9 | `pnpm test:e2e` | PASS |
| 10 | `pnpm audit:ci` (`--prod --audit-level=high`) | PASS |
| 11 | `pnpm build` | PASS |
| 12 | `pnpm bench:bundle` | PASS (gzip ≤ budgets) |
| 13 | `pnpm bench:ci` | **pode FAIL** se SLO S (D0/L0/L1 p95) estourar — gate intencional |

Artefatos CI: OpenAPI, coverage, `bundle-size.json`, `bench-ci-S.json`.

**Limitações remanescentes:** API sem auth (P0 produção); bench S HTTP pode falhar nos SLOs; BrasilAPI fallback; ESG/CAR stub.
