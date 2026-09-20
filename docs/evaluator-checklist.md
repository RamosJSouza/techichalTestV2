# Checklist de validação limpa (avaliador)

**Host:** Windows · **Data:** 2026-09-20 · **Node:** v22.22.3 · **pnpm:** 10.32.1

Pré-condição: Postgres via `docker compose up -d postgres` (porta host alinhada a `DATABASE_URL`, tipicamente `5433`).

| # | Comando | Resultado (Staff hardening P0/P1) |
|---|---------|-----------------------------------|
| 1 | `pnpm install --frozen-lockfile` | PASS |
| 2 | `pnpm lint` | PASS |
| 3 | `pnpm test:api` | PASS (29 suites / 81 tests) |
| 4 | `pnpm test:client` | PASS (19 suites / 52 tests) |
| 5 | `pnpm db:migrate` | PASS (inclui `0006`/`0007` CHECK areas+UF+status) |
| 6 | `pnpm test:e2e` | PASS (1 suite / 8 tests) |
| 7 | `pnpm audit:ci` (`--audit-level=high`) | PASS |
| 8 | `pnpm build` | PASS |

Plano: [`docs/superpowers/plans/2026-09-20-staff-hardening-p0-p1.md`](superpowers/plans/2026-09-20-staff-hardening-p0-p1.md).

**Limitações remanescentes (não bloqueiam estes gates):** API sem auth (P0 produção); bench S HTTP FAIL; BrasilAPI fallback permissivo; ESG/CAR stub.
