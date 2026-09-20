# Perf review M — 2026-09-20

- **PASS:** false
- **Base URL:** http://localhost:3000
- **Cache mode (load):** warm
- **Verify aggregates:** PASS
- **EXPLAIN artifacts:** `docs/bench/artifacts/M/`
- **Remediações de produto:** nenhuma preventiva — só sob gate FAIL + EXPLAIN before/after.

## Gates

| Gate | Actual | Limit | Result |
|------|--------|-------|--------|
| D0s_p95 | 42.55 | 500 | PASS |
| D0s_p99 | 82.32 | 900 | PASS |
| D0s_rps | 126.18 | 8 | PASS |
| D0s_errors | 0 | 0 | PASS |
| D0a_p95 | 9.57 | 600 | PASS |
| D0a_errors | 0 | 0 | PASS |
| D0_stats_p95_info | 57.47 | 500 | info |
| L0_p95 | 190.71 | 120 | FAIL |
| L0_errors | 0 | 0 | PASS |
| L1_p95 | 201.74 | 250 | PASS |
| L1_errors | 0 | 0 | PASS |
| L2_offset_deep_p95_info | 217.28 | — | info |
| Lc_cursor_p95_info | 197.14 | — | info |
| P1_detail_p95_info | 220.96 | — | info |

## Latency / throughput (p50/p95/p99)

| ID | p50 (ms) | p95 (ms) | p99 (ms) | rps | errors | dbQueries med | heapΔ MB |
|----|----------|----------|----------|-----|--------|---------------|----------|
| H0 | 70.67 | 142.21 | 193.25 | 89.29 | 0 | 0 | 0.099 |
| D0s | 28.37 | 42.55 | 82.32 | 126.18 | 0 | 0 | 0.132 |
| D0a | 6.87 | 9.57 | 11.86 | 141.51 | 0 | 0 | 0.132 |
| D0 | 28.85 | 57.47 | 6060.92 | 12.04 | 0 | 0 | 0.135 |
| D1 | 31.55 | 894.18 | 896.15 | 33.98 | 0 | 0 | 0.132 |
| D2 | 30.26 | 4126.06 | 4130.49 | 9.04 | 0 | 0 | 0.135 |
| D3 | 26.88 | 1439.12 | 1441.88 | 23.6 | 0 | 0 | 0.135 |
| L0 | 153.42 | 190.71 | 284.64 | 6.2 | 0 | 3 | 0.509 |
| L1 | 181.74 | 201.74 | 211.45 | 5.42 | 0 | 3 | 1.229 |
| L2 | 191.57 | 217.28 | 234.52 | 5.08 | 0 | 2 | 0.246 |
| P1 | 199.89 | 220.96 | 247.22 | 4.91 | 0 | 4 | 0.433 |
| Lc | 179.37 | 197.14 | 201.13 | 5.49 | 0 | 3 | 1.245 |

## EXPLAIN (mediana N runs)

- GUCs: `{"jit":"off","work_mem":"64MB","runs":5}`
- Seq Scan gate: FAIL (FAIL se Seq Scan em farms/harvests/farm_crops nas shapes dash_*)

| Shape | median ms | MAD | seqScanHot |
|-------|-----------|-----|------------|
| dash_crops_pack_analytics | 4434.173 | 18.665 | yes |
| dash_climate_by_crop | 3343.193 | 17.528 | yes |
| dash_by_esg | 772.196 | 21.988 | yes |
| dash_farms_pack_summary | 744.352 | 16.512 | yes |
| dash_crops_pack_summary | 639.794 | 39.118 | yes |

## Remediação

Abrir remediação **somente** com EXPLAIN before/after no scale correspondente.

## Ambiente

Documentar: CPU/RAM host, limites do container Postgres, `NODE_ENV` da API, `BENCH_INSTRUMENT`.
