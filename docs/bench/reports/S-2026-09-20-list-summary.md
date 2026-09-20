# Listagem resumida de produtores — before/after (scale S)

- **Data:** 2026-09-20
- **Base URL:** http://localhost:3000
- **Artefatos:** `docs/bench/artifacts/S/list-producers-before.json`, `list-producers-after.json`
- **EXPLAIN:** `farms_agg_for_list` ≈ 10.6 ms (vs SELECT * farms da página)

## Comparativo

| Cenário | Métrica | Before (full hydrate) | After (summary) | Δ |
|---------|---------|----------------------|-----------------|---|
| L0 pageSize=20 | p95 latência | 74.37 ms | **45.99 ms** | −38% |
| L0 | payload p50 | 37 287 B | **5 080 B** | −86% |
| L0 | queries estimadas | 5 | **3** | −2 |
| L0 | shape | `farms[]`+harvests/crops | `farmsCount`/áreas | — |
| L1 pageSize=100 | p95 latência | 229.86 ms | **66.44 ms** | −71% |
| L1 | payload p50 | 183 958 B | **25 186 B** | −86% |
| L1 | queries estimadas | 5 | **3** | −2 |

### Memória (heap delta do harness Node ao parsear respostas)

| Cenário | Before heapΔ | After heapΔ |
|---------|--------------|-------------|
| L0 | +2.28 MB | +1.90 MB |
| L1 | −0.18 MB* | +1.56 MB |

\*Variação de GC entre amostras; o sinal mais estável é o **tamanho do payload** (−86%).

## Gates L0/L1 (SLO S)

| Gate | Limit | After | Result |
|------|-------|-------|--------|
| L0 p95 | ≤ 80 ms | 45.99 | PASS |
| L1 p95 | ≤ 150 ms | 66.44 | PASS |

## Contrato

- `GET /producers` → `ProducerListItem` (sem `farms` / harvests / crops).
- `GET /producers/:id` → hidratação completa inalterada.
- OpenAPI: schemas `ProducerListItem` + `ProducerListPageResponse`.

## Como reproduzir

```bash
pnpm bench:list-compare -- --label=before   # só útil com API na versão antiga
pnpm bench:list-compare -- --label=after
pnpm bench:explain -- --scale=S
```
