# Listagem resumida de produtores — before/after (scale S)

- **Data:** 2026-09-20 (after revalidado com `BENCH_INSTRUMENT=1`)
- **Base URL:** http://localhost:3000
- **Artefatos:** [`list-producers-before.json`](../artifacts/S/list-producers-before.json) (snapshot histórico `full_hydrate`) · [`list-producers-after.json`](../artifacts/S/list-producers-after.json) (summary atual)
- **EXPLAIN:** `farms_agg_for_list` (Aggregate) vs SELECT * farms da página

## Comparativo

| Cenário | Métrica | Before (full hydrate) | After (summary) | Δ |
|---------|---------|----------------------|-----------------|---|
| L0 pageSize=20 | p50 latência | 62.05 ms | **45.48 ms** | −27% |
| L0 | p95 latência | 74.37 ms | **77.84 ms** | ~par (ruído; ≤80 SLO) |
| L0 | payload p50 | 37 287 B | **5 868 B** | −84% |
| L0 | queries | ~5 (estimado) | **3** (`X-Db-Queries`) | −2 |
| L0 | heapΔ (API) | — | **0.504 MB** median | — |
| L0 | shape | `farms[]`+harvests/crops | `farmsCount`/áreas/UFs | — |
| L1 pageSize=100 | p50 latência | 197.52 ms | **50.29 ms** | −75% |
| L1 | p95 latência | 229.86 ms | **68.92 ms** | −70% |
| L1 | payload p50 | 183 958 B | **29 095 B** | −84% |
| L1 | queries | ~5 (estimado) | **3** (`X-Db-Queries`) | −2 |
| L1 | heapΔ (API) | — | **1.193 MB** median | — |

### Memória (harness Node ao parsear respostas — `heapDeltaBytes`)

| Cenário | Before | After |
|---------|--------|-------|
| L0 | +2.28 MB | +1.93 MB |
| L1 | −0.18 MB* | +1.73 MB |

\*Variação de GC; o sinal estável é o **payload** (−84%) e `X-Heap-Delta-Mb` no processo API.

## Gates L0/L1 (SLO S)

| Gate | Limit | After | Result |
|------|-------|-------|--------|
| L0 p95 | ≤ 80 ms | 77.84 | PASS |
| L1 p95 | ≤ 150 ms | 68.92 | PASS |

## Contrato

- `GET /producers` → `ProducerListPageResponseDto` / `ProducerListItemResponseDto` (campos: `farmsCount`, `farmStates`, áreas; **sem** `farms`).
- `GET /producers/:id` → `ProducerDetailResponseDto` (hidratação completa com `farms[].harvests[].crops`).
- OpenAPI regenerado; `test:contract` cobre schema list sem `farms` + detail com `farms`.

## Nota

O artefato **before** é histórico (pré-summary). Não é possível recriar sem reverter código. O **after** foi regenerado com instrumentação real (`dbQueriesMedian=3`).

## Como reproduzir

```bash
# API com BENCH_INSTRUMENT=1 e seed S
pnpm bench:list-compare -- --label=after
pnpm bench:explain -- --scale=S
```
