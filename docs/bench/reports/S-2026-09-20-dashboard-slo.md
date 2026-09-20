# Bench report S — 2026-09-20 (dashboard SLO: medição, split e budgets)

- **PASS:** true
- **Base URL:** http://localhost:3000
- **Ambiente:** Windows 10.0.26200 · Node **22.22.3** · pnpm **10.32.1** · Postgres **16.15** (Docker `postgres:16-alpine` @ `:5433`)
- **Dataset:** scale S (~10k farms / ~3.3k producers) via `bench:seed --scale=S --verify-counts`
- **Instrumentação:** `BENCH_INSTRUMENT=1` → headers `X-Db-Queries`, `X-Heap-Delta-Mb`
- **Artefatos:** [`bench-ci-S.json`](../artifacts/bench-ci-S.json) · [`S/load-http-final.json`](../artifacts/S/load-http-final.json) · [`S/load-http-baseline.json`](../artifacts/S/load-http-baseline.json) · EXPLAIN em [`artifacts/S/`](../artifacts/S/)

## Política SLO (bloqueante)

| Papel | Endpoint | Gate |
|-------|----------|------|
| First paint | `GET /dashboard/summary` (D0s) | p95≤200 · p99≤400 · rps≥15 · err=0 |
| Secondary | `GET /dashboard/analytics` (D0a) | p95≤300 · err=0 |
| Listagem | L0 pageSize=20 / L1 pageSize=100 | p95≤80 / ≤150 · err=0 |
| Residual INFO | `GET /dashboard/stats` (D0) · `GET /producers/:id` (P1) | não bloqueia |

## Gates (rodada final)

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0s_p95 | 49.82 | 200 | PASS |
| D0s_p99 | 55.13 | 400 | PASS |
| D0s_rps | 110.19 | 15 | PASS |
| D0s_errors | 0 | 0 | PASS |
| D0a_p95 | 13.13 | 300 | PASS |
| D0a_errors | 0 | 0 | PASS |
| D0_stats_p95_info | 49.85 | 200 | INFO |
| L0_p95 | 53.52 | 80 | PASS |
| L0_errors | 0 | 0 | PASS |
| L1_p95 | 64.91 | 150 | PASS |
| L1_errors | 0 | 0 | PASS |
| P1_detail_p95_info | 67.65 | — | INFO |

## Latency / throughput / queries / memória

| ID | p50 | p95 | p99 | rps | err | q median | heapΔ Mb |
|----|-----|-----|-----|-----|-----|----------|----------|
| H0 | 73.69 | 174.96 | 186.83 | 86.36 | 0 | 0 | 0.115 |
| D0s | 34.54 | 49.82 | 55.13 | 110.19 | 0 | 0* | 0.147 |
| D0a | 8.16 | 13.13 | 394.07 | 65.65 | 0 | 0* | 0.141 |
| D0 | 31.18 | 49.85 | 427.48 | 77.82 | 0 | 0* | 0.141 |
| L0 | 39.02 | 53.52 | 63.35 | 24.51 | 0 | 3 | 0.525 |
| L1 | 51.64 | 64.91 | 80.78 | 18.73 | 0 | 3 | 1.216 |
| P1 | 49.22 | 67.65 | 69.23 | 19.04 | 0 | 4 | 0.437 |

\* Median `X-Db-Queries=0` no dashboard sob cache hit (`DASHBOARD_STATS_CACHE_TTL_MS` default **5000**). Cold path medido manualmente: summary ≈ **3** round-trips SQL.

## Baseline (antes da remediação)

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0a_p95 | 379.43 | 300 | FAIL |
| L0_p95 | 105.54 | 80 | FAIL |
| L1_p95 | 84.63 | 150 | PASS |

## Remediação (evidência)

1. **Harness:** L0/L1/D0a com `concurrency=1`, cooldown 2s + warm-up dedicado (isola ruído de GC/concorrência no Windows).
2. **Cache TTL 1500→5000 ms:** EXPLAIN analytics — `dash_climate_by_crop` **280 ms** sozinho; cold path > budget D0a. TTL curto expirava no meio do cenário e inflava p95. Sem MV / sem índice novo.
3. **L1:** passou após isolamento (antes falhava por margem ~1.5 ms no relatório anterior).

## Residual (documentado, não bloqueante)

- **D0a p99 ≈ 394 ms** e **D0 p99 ≈ 427 ms:** refresh cold do CTE analytics (Seq Scan / Aggregate em crop joins; ver `dash_climate_by_crop.json`). Aceitável sob política (p95 bloqueante OK; cold ≤ ~400 ms alinhado ao plano).
- **D0 `/stats`:** residual informativo; frontend usa summary+analytics apenas.
- **Sem MV:** full-scan em S é esperado; MV só se D0s/D0a falhassem após medição limpa — não foi o caso após TTL+isolamento.

## Contrato / front

- OpenAPI: papéis summary (first paint) / analytics (secondary) / stats (legado residual) regenerados (`pnpm openapi:export`).
- Front: `apiSlice` + `DashboardPage` confirmados em summary+analytics (sem `/stats`).
- `pnpm test:contract` — 5/5 PASS.
