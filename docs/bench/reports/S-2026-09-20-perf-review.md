# Perf review S — 2026-09-20

- **PASS:** true
- **Base URL:** http://localhost:3000
- **Cache mode (load):** warm
- **Verify aggregates:** PASS
- **EXPLAIN artifacts:** `docs/bench/artifacts/S/`
- **Remediações de produto:** nenhuma preventiva — só sob gate FAIL + EXPLAIN before/after.

## Gates

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0s_p95 | 127.99 | 200 | PASS |
| D0s_p99 | 143.07 | 400 | PASS |
| D0s_rps | 58.06 | 15 | PASS |
| D0s_errors | 0 | 0 | PASS |
| D0a_p95 | 15.52 | 300 | PASS |
| D0a_errors | 0 | 0 | PASS |
| D0_stats_p95_info | 62.55 | 200 | info |
| L0_p95 | 65.99 | 80 | PASS |
| L0_errors | 0 | 0 | PASS |
| L1_p95 | 66.66 | 150 | PASS |
| L1_errors | 0 | 0 | PASS |
| Lc_cursor_p95_info | 59.6 | — | info |
| P1_detail_p95_info | 64.91 | — | info |

## Latency / throughput (p50/p95/p99)

| ID | p50 (ms) | p95 (ms) | p99 (ms) | rps | errors | dbQueries med | heapΔ MB |
|----|----------|----------|----------|-----|--------|---------------|----------|
| H0 | 62.28 | 73.75 | 79.52 | 120.48 | 0 | 0 | 0.114 |
| D0s | 53.78 | 127.99 | 143.07 | 58.06 | 0 | 0 | 0.143 |
| D0a | 8.37 | 15.52 | 28.77 | 104.17 | 0 | 0 | 0.141 |
| D0 | 31.39 | 62.55 | 426.55 | 74.98 | 0 | 0 | 0.141 |
| D1 | 28.36 | 110.1 | 112.4 | 108.7 | 0 | 0 | 0.136 |
| D2 | 41.87 | 378.28 | 379.49 | 51.95 | 0 | 0 | 0.138 |
| D3 | 27.26 | 179.19 | 181.56 | 93.02 | 0 | 0 | 0.138 |
| L0 | 44.47 | 65.99 | 76.12 | 20.78 | 0 | 3 | 0.529 |
| L1 | 57.11 | 66.66 | 67.87 | 17.47 | 0 | 3 | 1.244 |
| P1 | 50.04 | 64.91 | 68.12 | 19.33 | 0 | 4 | 0.451 |
| Lc | 52.26 | 59.6 | 62.67 | 19.02 | 0 | 3 | 1.253 |

## EXPLAIN (mediana N runs)

- GUCs: `{"jit":"off","work_mem":"64MB","runs":5}`
- Seq Scan gate: OK (Seq Scan aceito em S)

| Shape | median ms | MAD | seqScanHot |
|-------|-----------|-----|------------|
| dash_crops_pack_analytics | 384.788 | 4.043 | yes |
| dash_climate_by_crop | 334.395 | 45.462 | yes |
| dash_crops_pack_summary | 135.136 | 1.561 | yes |
| dash_farms_pack_summary | 73.878 | 0.456 | yes |
| dash_by_esg | 62.719 | 1.55 | yes |

## Remediação

Nenhuma — gates OK. Cursor aditivo disponível (`nextCursor` / `?cursor=`); client React permanece em OFFSET.

## Ambiente

Documentar: CPU/RAM host, limites do container Postgres, `NODE_ENV` da API, `BENCH_INSTRUMENT`.
