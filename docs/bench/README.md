# Benchmark de performance — Brain Agriculture

Protocolo **measurement-first**: nenhuma mudança de índice, pool, cache ou SQL de produção entra sem falha de gate no scale correspondente + artefato EXPLAIN.

## Escalas

| Scale | Farms ativas (N) | Uso |
|-------|------------------|-----|
| S | 10_000 | Laptop / CI nightly |
| M | 100_000 | Postgres dedicado (≥4 CPU, 8 GB) |
| L | 1_000_000 | Postgres dedicado (≥8 CPU, 16 GB); fora do CI padrão |

Dataset: ~N/3 producers, ~2N harvests, ~4N crops; seed determinístico (`SEED=42`). Soft-delete ~2%.

## Regra de ouro

1. Medir (seed → verify → explain → load → report).
2. Só remediar se um **gate** falhar.
3. Remediação acompanha EXPLAIN before/after.

Backlog de hipóteses (pool, índices, cache, listagem, BrasilAPI, bundle): ver plano; **não** implementar preventivamente.

## SLOs (HTTP end-to-end, API aquecida)

| Scale | D0 p95 | D0 p99 | D0 min req/s | L0 p95 | L1 p95 |
|-------|--------|--------|--------------|--------|--------|
| S | ≤200 ms | ≤400 ms | ≥15 | ≤80 ms | ≤150 ms |
| M | ≤500 ms | ≤900 ms | ≥8 | ≤120 ms | ≤250 ms |
| L | ≤1500 ms | ≤3000 ms | ≥2 | ≤200 ms | ≤400 ms |

- **D0** = `GET /api/v1/dashboard/stats`
- **L0** = `GET /api/v1/producers?page=1&pageSize=20`
- **L1** = `…pageSize=100` (pior caso de hidratação do client atual)

Gate SQL (M/L): Seq Scan dominante em `farms`/`harvests` nas queries D0/D1/D2 = FAIL.

Bundle (release / CI): `pnpm build:client && pnpm bench:bundle`

| Chunk | Gate gzip | Notas |
|-------|-----------|-------|
| `vendor` | ≤180 KB | react + RTK |
| `recharts` | ≤120 KB | lazy no dashboard |
| `entry` (`index-*`) | ≤100 KB | após code-split de rotas |

Baseline before code-split (2026-09-20): entry **167 KB** gzip (gate 80 KB falhava). After: entry **~62 KB** gzip — ver `docs/bench/artifacts/bundle-size-before.json` / `bundle-size-after.json`. Regressão >10% vs `bundle-size-baseline.json` = FAIL.

## Protocolo

```bash
# API + Postgres acessíveis; DATABASE_URL e BASE_URL configurados
pnpm bench:seed -- --scale=S
pnpm bench:verify
pnpm bench:explain -- --scale=S
pnpm bench:run -- --scale=S
```

Ordem fixa em `bench:run`: seed → ANALYZE → verify-aggregates → warm-up → explain → load → report em `docs/bench/reports/`.

## Scripts

| Script | Função |
|--------|--------|
| `scripts/bench/seed-scale.mjs` | TRUNCATE + dataset sintético |
| `scripts/bench/verify-aggregates.mjs` | API ≡ SQL de referência |
| `scripts/bench/explain-capture.mjs` | EXPLAIN JSON em `docs/bench/artifacts/{scale}/` |
| `scripts/bench/load-http.mjs` | Carga HTTP + p95/p99 (Node; sem k6) |
| `scripts/bench/k6-*.js` | Mesmos cenários via k6 (opcional) |
| `scripts/bench/run.mjs` | Orquestrador + report markdown |
| `scripts/bench/bundle-size.mjs` | Tamanhos gzip dos chunks Vite |

## Variáveis

| Var | Default | Descrição |
|-----|---------|-----------|
| `DATABASE_URL` | (obrigatória) | Postgres |
| `BENCH_BASE_URL` | `http://localhost:3000` | API |
| `ENCRYPTION_KEY` / `PEPPER_SECRET` | do `.env` | FLE + blind index no seed |
| `BENCH_SCALE` | `S` | S \| M \| L |
| `THROTTLE_LIMIT` | 100 | **Para `bench:run` use ≥10000** — senão 429 distorce p95/rps |

**Atenção:** `seed-scale` faz `TRUNCATE … CASCADE` no banco apontado por `DATABASE_URL`. Não use contra dados reais.

## CI

- Job `build-test` em `.github/workflows/ci.yml` (bloqueia PR).
- Ordem: preflight → install frozen → migrate → lint → unit → coverage → openapi → contract → e2e → audit `--prod` high → build → `bench:bundle` → `bench:ci` (seed S + load HTTP).
- Artefatos: OpenAPI, coverage, `bundle-size.json`, `bench-ci-S.json`.
- `bench:ci` **falha** o job se qualquer gate SLO de `load-http.mjs` falhar (transparência; relatório S atual pode estar vermelho em D0/L0/L1 p95).
