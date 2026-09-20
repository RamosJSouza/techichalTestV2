# Bench report S — 2026-09-20 (pós realinhamento SLO)

- **PASS:** false
- **Base URL:** http://localhost:3000
- **Ambiente:** Windows 10 · Node **22.22.3** · pnpm **10.32.1** · dataset scale S (~10k farms)
- **Política SLO:** first paint bloqueante = **D0s** (`/dashboard/summary`); **D0** (`/stats`) informativo/residual
- **Artefato JSON:** [`docs/bench/artifacts/bench-ci-S.json`](../artifacts/bench-ci-S.json)

## Gates (política atual)

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0s_p95 | 163.27 | 200 | PASS |
| D0s_p99 | 171.18 | 400 | PASS |
| D0s_rps | 75.19 | 15 | PASS |
| D0s_errors | 0 | 0 | PASS |
| D0_stats_p95_info | 474.89 | 200 | INFO (não bloqueia) |
| L0_p95 | 62.65 | 80 | PASS |
| L0_errors | 0 | 0 | PASS |
| L1_p95 | **151.49** | 150 | **FAIL** (+1.49 ms) |
| L1_errors | 0 | 0 | PASS |

## Latency / throughput

| ID | p50 (ms) | p95 (ms) | p99 (ms) | rps | errors |
|----|----------|----------|----------|-----|--------|
| H0 | 70 | 199.76 | 294.07 | 75.64 | 0 |
| D0 | 49.08 | 474.89 | 514.28 | 60.2 | 0 |
| D0s | 51.98 | 163.27 | 171.18 | 75.19 | 0 |
| D1 | 41.83 | 135.61 | 137.28 | 99.26 | 0 |
| D2 | 52.61 | 427.78 | 429.76 | 49.2 | 0 |
| D3 | 90.17 | 257.11 | 283.95 | 40.16 | 0 |
| L0 | 50.9 | 62.65 | 86.25 | 38.27 | 0 |
| L1 | 74.44 | 151.49 | 173.24 | 23.31 | 0 |

## Interpretação

1. **D0s** dentro do SLO — alinhado ao frontend (summary + analytics).
2. **L0** recuperado vs relatório anterior (254 ms → 62 ms) com listagem summary + isolamento.
3. **L1** falhou por margem mínima (+1.49 ms). Causa provável: decrypt AES de 100 documentos + concorrência residual no Windows laptop.
4. **D0 `/stats`** permanece residual (~475 ms p95); não bloqueia após realinhamento.

## Reexecução

Tentativa de re-run após isolar L1 adicional falhou: Postgres Compose em `localhost:5433` ficou **indisponível** (`ECONNREFUSED`); Docker CLI **não instalado** neste ambiente; Postgres local `postgresql-x64-17` em `:5432` rejeitou a senha do `.env` (`28P01`).

Para revalidar L1: `pnpm docker:up` (ou Postgres em 5433) → `pnpm build` → `node --env-file=.env scripts/bench/ci.mjs`.
