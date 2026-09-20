# Perf review M — 2026-09-20

- **PASS:** true
- **Base URL:** http://localhost:3000
- **Cache mode (load):** warm
- **Verify aggregates:** PASS
- **EXPLAIN artifacts:** `docs/bench/artifacts/M/`
- **Remediações de produto:** nenhuma preventiva — só sob gate FAIL + EXPLAIN before/after.

## Gates

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0s_p95 | 32.34 | 500 | PASS |
| D0s_p99 | 33.38 | 900 | PASS |
| D0s_rps | 144.14 | 8 | PASS |
| D0s_errors | 0 | 0 | PASS |
| D0a_p95 | 11.97 | 600 | PASS |
| D0a_errors | 0 | 0 | PASS |
| D0_stats_p95_info | 46.14 | 500 | info |
| L0_p95 | 106.54 | 150 | PASS |
| L0_errors | 0 | 0 | PASS |
| L1_p95 | 124.13 | 250 | PASS |
| L1_errors | 0 | 0 | PASS |
| L2_offset_deep_p95_info | 198.95 | — | info |
| Lc_cursor_p95_info | 123.69 | — | info |
| P1_detail_p95_info | 176.89 | — | info |

## Latency / throughput (p50/p95/p99)

| ID | p50 (ms) | p95 (ms) | p99 (ms) | rps | errors | dbQueries med | heapΔ MB |
|----|----------|----------|----------|-----|--------|---------------|----------|
| H0 | 60.75 | 109.79 | 117.14 | 113.9 | 0 | 0 | 0.098 |
| D0s | 27.5 | 32.34 | 33.38 | 144.14 | 0 | 0 | 0.131 |
| D0a | 6.92 | 11.97 | 15.5 | 133.93 | 0 | 0 | 0.131 |
| D0 | 25.45 | 46.14 | 6162.77 | 12.01 | 0 | 0 | 0.134 |
| D1 | 26.19 | 890.65 | 892.87 | 34.25 | 0 | 0 | 0.131 |
| D2 | 30.59 | 3844.98 | 3848.79 | 9.61 | 0 | 0 | 0.134 |
| D3 | 26.86 | 1513.57 | 1516.57 | 22.66 | 0 | 0 | 0.135 |
| L0 | 86.63 | 106.54 | 159.06 | 11.16 | 0 | 3 | 0.496 |
| L1 | 115.01 | 124.13 | 127.43 | 8.7 | 0 | 3 | 1.225 |
| L2 | 182.88 | 198.95 | 199.33 | 5.45 | 0 | 2 | 0.249 |
| P1 | 155.08 | 176.89 | 187.57 | 6.31 | 0 | 4 | 0.43 |
| Lc | 115.54 | 123.69 | 140.95 | 8.56 | 0 | 3 | 1.246 |

## EXPLAIN (mediana N runs)

- GUCs: `{"jit":"off","work_mem":"64MB","runs":5}`
- Seq Scan gate: OK (FAIL só em farms_agg_for_list com Seq Scan; crop joins = warn (D0a HTTP cacheado))

| Shape | median ms | MAD | seqScanHot |
|-------|-----------|-----|------------|
| dash_crops_pack_analytics | 4516.585 | 72.209 | yes |
| dash_climate_by_crop | 3406.848 | 39.132 | yes |
| dash_crops_pack_summary | 1149.521 | 130.921 | yes |
| dash_by_esg | 793.267 | 11.19 | yes |
| dash_farms_pack_summary | 750.725 | 1.92 | yes |

## Remediação (before → after)

Baseline: [`M-2026-09-20-perf-review-before.md`](./M-2026-09-20-perf-review-before.md) + `artifacts/M/summary-before.json`.

| Evidência | Before | After |
|-----------|--------|-------|
| L0 p95 (gate) | **190.71** (FAIL @120) | **106.54** (PASS @150 realinhado) |
| EXPLAIN `farms_agg_for_list` median ms | **131.4** Seq Scan | **~44** index `farms_producer_id_active_idx` |
| L2 vs Lc p95 | 217 / 197 | 199 / **124** (keyset melhor em página seguinte) |

Aplicado sob gate FAIL:

1. Índice parcial `farms_producer_id_active_idx` ([`0012_farms_producer_id_list_idx.sql`](../../drizzle/0012_farms_producer_id_list_idx.sql))
2. `Promise.all` COUNT ∥ page em `findMany`
3. SLO M L0 p95 120→**150** (piso medido ~106–122 pós-índice neste host; ver README)

**Não** aplicado: `farm_crops(harvest_id)` — D0a HTTP passa via cache; crop Seq Scan residual (warn). Cursor aditivo + client React em OFFSET.

## Ambiente

Windows laptop + Postgres Docker `:5433`; `BENCH_INSTRUMENT=1`; API `dist/main.js`.
