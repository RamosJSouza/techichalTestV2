# Perf review L — 2026-09-20

- **PASS:** blocked
- **Motivo:** seed scale L (1 000 000 farms) exige Postgres dedicado (≥8 CPU / 16 GB). Tentativa local iniciou TRUNCATE + seed e foi interrompida (~84 k/1 M farms) para não corromper a medição M em andamento.
- **Verify / EXPLAIN / load:** não executados em L neste ciclo.

## O que falta para desbloquear

```bash
# Em host dedicado, API no ar, THROTTLE_LIMIT≥10000, BENCH_INSTRUMENT=1
pnpm bench:run -- --scale=L
```

Comparar L2 (OFFSET page=500) vs Lc (`nextCursor`) e revalidar `farms_producer_id_active_idx` sob Seq Scan gate em `farms_agg_for_list`.

## Referência

- Protocolo: [`docs/bench/README.md`](../README.md)
- After M (PASS): [`M-2026-09-20-perf-review.md`](./M-2026-09-20-perf-review.md)
- Cursor aditivo já no contrato OpenAPI (`cursor` / `nextCursor`)
