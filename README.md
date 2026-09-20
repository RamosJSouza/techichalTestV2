# Brain Agriculture — API + Frontend (monorepo)

API REST NestJS e SPA React no mesmo processo em produção (`/`).

**Stack:** NestJS 12 · React 18 · Vite · RTK Query · Styled Components · Drizzle · PostgreSQL 16 · Zod  

**Engines fixos:** Node **22.22.3** · pnpm **10.32.1** (`.nvmrc`, `packageManager`, `engine-strict`)

Validação limpa executada em **2026-09-20** — ver [`docs/evaluator-checklist.md`](docs/evaluator-checklist.md).

---

## Quickstart verificado (do zero)

### Pré-requisitos

- Node.js **22.22.3** (`node -v`)
- pnpm **10.32.1** via Corepack: `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- Docker Desktop (serviço Postgres)

### 1) Ambiente

```bash
cp .env_example .env
# Gere secrets únicos se for usar Docker Compose (NODE_ENV=production no container api):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Confirme que `DATABASE_URL` e `POSTGRES_HOST_PORT` usam a **mesma** porta no host (padrão do exemplo: **5433**).

### 2a) Docker completo (API + Postgres + SPA)

```bash
pnpm docker:up
```

- SPA / API: http://localhost:3000/
- Health: `GET http://localhost:3000/api/v1/health/live`
- Swagger: **desligado** (Compose força `NODE_ENV=production`)

### 2b) Desenvolvimento local (recomendado para Swagger)

```bash
docker compose up -d postgres   # só o banco — não suba o serviço api
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev                        # Nest :3000 + Vite :5173 (proxy /api)
```

- Swagger UI: http://localhost:3000/api/docs  
- Contrato commitado: [`docs/openapi.json`](docs/openapi.json)

### 3) Checklist de comandos validados (2026-09-20)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:api
pnpm test:client
pnpm db:migrate
pnpm test:e2e
pnpm audit:ci          # falha só em vulnerabilidades critical
pnpm build
# opcional: pnpm verify   # lint && test && test:e2e && build
```

CI GitHub Actions replica a mesma ordem (`.github/workflows/ci.yml`).

---

## Troubleshooting

| Sintoma | Causa / correção |
|---------|------------------|
| `EADDRINUSE :::3000` | Container `brain_ag_api` ocupando a porta. `docker stop brain_ag_api` ou `pnpm docker:down`; mantenha só `postgres` para `pnpm dev`. |
| Migrations / API não conectam | Shell env (`DATABASE_URL`, `POSTGRES_*`) **sobrescreve** `.env`. Confira `echo $env:DATABASE_URL` (PowerShell) / `echo $DATABASE_URL`. Alinhe porta host ↔ `DATABASE_URL`. |
| Compose rejeita secrets | Em production o schema rejeita `ENCRYPTION_KEY` de exemplo, `PEPPER_SECRET` com menos de 32 chars / `change-me-…`, e senhas fracas tipo `postgrespassword`. Use valores do `.env_example` ou gere novos. |
| `engine-strict` / versão errada | Instale exatamente Node 22.22.3 e pnpm 10.32.1. |
| HTTP 429 em carga / bench | Suba `THROTTLE_LIMIT` (ex.: `10000`) só no ambiente de bench; default é 100/min por IP. |
| Volume Postgres “password authentication failed” | Senha do volume antigo ≠ `.env` atual → `docker compose down -v` (apaga dados) e suba de novo. |

---

## Variáveis de ambiente

Alinhadas a [`.env_example`](.env_example):

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta HTTP (default `3000`) |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do container Postgres |
| `POSTGRES_HOST_PORT` | Porta no host (default `5433`) |
| `DATABASE_URL` | Connection string (host deve bater com `POSTGRES_HOST_PORT` fora do Compose network) |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) AES-256-GCM |
| `ENCRYPTION_KEY_ID` | Key-id no ciphertext (`kid:iv:tag:ct`); default `v1` |
| `ENCRYPTION_KEY_PREVIOUS` / `_ID` | Rotação opcional (decrypt da chave anterior) |
| `PEPPER_SECRET` | Pepper HMAC (≥16; em production ≥32 e ≠ exemplo) |
| `BRASIL_API_BASE_URL` | Base BrasilAPI (default oficial) |
| `CORS_ORIGINS` | CSV de origens em production (vazio = sem CORS aberto) |
| `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` | Rate limit por IP (default 60000 ms / 100). Skip só em `/health*` |
| `TRUST_PROXY` | `true`/`1` atrás de proxy confiável |
| `BODY_LIMIT` | Limite JSON body Express (default `100kb`) |
| `API_HOST_PORT` | Mapeamento host da API no Compose |

### Limites de payload / query (Zod)

| Limite | Valor |
|--------|-------|
| `farms[]` no create | ≤ 20 |
| `harvests[]` por fazenda | ≤ 10 |
| `crops[]` por safra | ≤ 20 |
| `page` | 1…10000 |
| `pageSize` | 1…100 (default 20) |
| Body JSON | `BODY_LIMIT` (default `100kb`) |
| Rate limit | `THROTTLE_*` por IP |

---

## Exemplos curl (API em `:3000`, `NODE_ENV≠production`)

```bash
# Liveness
curl -s http://localhost:3000/api/v1/health/live
# → {"status":"ok"}

# Criar produtor (CPF válido; 409 se já existir)
curl -s -X POST http://localhost:3000/api/v1/producers \
  -H "Content-Type: application/json" \
  -d '{"name":"Avaliador Demo","document":"390.533.447-05"}'

# Listar (paginação)
curl -s "http://localhost:3000/api/v1/producers?page=1&pageSize=5"

# Dashboard
curl -s http://localhost:3000/api/v1/dashboard/stats

# Busca por documento (resposta com PII mascarada, ex.: ***.509.460-**)
curl -s "http://localhost:3000/api/v1/producers/search?document=153.509.460-56"
```

Smoke dos mesmos endpoints verificado em 2026-09-20 contra API local (`NODE_ENV=development`).

---

## Contrato OpenAPI

| Artefato | Onde |
|----------|------|
| Swagger UI | http://localhost:3000/api/docs — **somente** se `NODE_ENV !== production` |
| Spec JSON | [`docs/openapi.json`](docs/openapi.json) (gerado via `GET /api/docs-json`, OpenAPI 3.0.0) |

No Docker Compose (production) o Swagger **não** é montado.

---

## Decisões arquiteturais

- **Camadas DDD / Clean Architecture:** `domain` → `application` → `infrastructure` / `presentation`; domínio sem Nest/ORM.
- **Value Objects:** `CpfCnpj`, `FarmArea` (arable + vegetation ≤ total), `CarNumber`.
- **PII:** Field-Level Encryption (AES-256-GCM) + blind index HMAC (`document_hash`); unique parcial `WHERE deleted_at IS NULL`; soft delete anonimiza o hash.
- **ACL BrasilAPI:** CNPJ ativo + cidade ∈ UF via `BrazilDataServiceInterface` / `BrasilApiAdapter` (circuit breaker).
- **Dashboard:** agregações SQL nativas (várias queries); filtros Zod no query string.
- **Frontend:** SPA Vite servida pelo Nest em production; Atomic Design no `client/`.
- **Auth:** **fora de escopo** — API aberta; proteger rede (VPN/firewall/mTLS) em deploy real.

---

## Limitações conhecidas

- Sem autenticação / autorização.
- Rate limit por IP (não por usuário/API key).
- Dashboard: várias queries por request (~11 no plano atual); ver [`docs/dashboard-query-plan.md`](docs/dashboard-query-plan.md).
- Listagem hidrata fazendas por página (custo cresce com `pageSize` e fan-out).
- ESG local: status mock/stub tende a `APPROVED` sem provedor externo real.
- Bench escala S: gates HTTP **FAIL** (latência/RPS); verify-aggregates PASS — detalhes em [`docs/bench/`](docs/bench/) / relatório `docs/bench/reports/S-2026-09-20.md`. Scripts `pnpm bench:*` são opcionais e **não** fazem parte do caminho mínimo do avaliador.

---

## Endpoints (visão rápida)

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/v1/producers` | Cria produtor (+ fazendas/safras opcionais) |
| GET | `/api/v1/producers` | Lista paginada |
| GET | `/api/v1/producers/:id` | Detalhe |
| GET | `/api/v1/producers/search?document=` | Busca por blind index |
| PUT / DELETE | `/api/v1/producers/:id` | Atualiza / soft delete |
| GET | `/api/v1/producers/:id/esg-compliance` | Parecer socioambiental |
| POST / PUT / DELETE | `/api/v1/farms`… | CRUD fazenda |
| POST | `/api/v1/farms/:id/car/validate` | Auditoria CAR (stub) |
| GET | `/api/v1/dashboard/stats` | Agregações |
| GET | `/api/v1/health/live` · `/ready` | Health |
| GET | `/api/v1/metrics` | Prometheus |

---

## Segurança (resumo)

- Documento criptografado em repouso; busca via hash; máscara `@MaskPII()` nas respostas.
- Soft delete + unique parcial; logs Pino com redact de `document`.
- Helmet, rate limit, CORS restrito em production, body limit.
- 5xx genéricos com `errorId` / `traceId`.

Frontend: [`client/README.md`](client/README.md). Spec técnica: [`docs/backend-technical-spec.md`](docs/backend-technical-spec.md).
