# Brain Agriculture — API + Frontend (monorepo)

API REST NestJS e SPA React no mesmo processo em produção (`/`).

**Stack:** NestJS 12 · React 18 · Vite · RTK Query · Styled Components · Drizzle · PostgreSQL 16 · Zod  

**Engines fixos:** Node **22.22.3** · pnpm **10.32.1** (`.nvmrc`, `.tool-versions`, `packageManager`, `pnpm preflight`)

Validação limpa executada em **2026-09-20** — ver [`docs/evaluator-checklist.md`](docs/evaluator-checklist.md).

---

## Quickstart verificado (do zero)

Os comandos abaixo são **os mesmos** do CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

### Pré-requisitos

- Node.js **22.22.3** (`node -v`)
- pnpm **10.32.1** via Corepack: `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- Docker Desktop (Postgres efêmero na porta **5432** — libere a porta se houver outro Postgres local)

### 1) Réplica CI (atalho)

```bash
pnpm ci:local
# Flags: --skip-docker (Postgres CI já no ar) · --keep-db (não derruba o container ao fim)
```

Sobe [`docker-compose.ci.yml`](docker-compose.ci.yml) (sem volume), aplica o mesmo `env` do job GHA e executa a sequência completa abaixo. Teardown padrão: `down -v`.

`pnpm verify` é só smoke de desenvolvimento (lint + test + e2e + build) — **não** substitui o CI.

### 2) Env idêntico ao job GHA

Bash:

```bash
export CI=true
export NODE_ENV=test
export PORT=3000
export DATABASE_URL=postgres://postgres:ci_strong_password_9f3a@localhost:5432/brain_agriculture
export ENCRYPTION_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export PEPPER_SECRET=ci-pepper-secret-min16
export BRASIL_API_BASE_URL=https://brasilapi.com.br/api
export THROTTLE_LIMIT=10000
export BENCH_BASE_URL=http://localhost:3000
```

PowerShell:

```powershell
$env:CI="true"; $env:NODE_ENV="test"; $env:PORT="3000"
$env:DATABASE_URL="postgres://postgres:ci_strong_password_9f3a@localhost:5432/brain_agriculture"
$env:ENCRYPTION_KEY="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
$env:PEPPER_SECRET="ci-pepper-secret-min16"
$env:BRASIL_API_BASE_URL="https://brasilapi.com.br/api"
$env:THROTTLE_LIMIT="10000"
$env:BENCH_BASE_URL="http://localhost:3000"
```

### 3) Postgres efêmero + pipeline (lista expandida = steps do workflow)

```bash
docker compose -f docker-compose.ci.yml up -d --wait
pnpm preflight
pnpm install --frozen-lockfile
pnpm ci:migrate
pnpm lint
pnpm test:api
pnpm test:client
pnpm test:cov:ci
pnpm openapi:export
git diff --exit-code docs/openapi.json   # falha se o contrato commitado divergir
pnpm test:contract
pnpm test:e2e
pnpm audit:ci          # falha em vulnerabilidades high+ de runtime (--prod)
pnpm build
pnpm bench:bundle      # falha se gzip > budget
pnpm bench:ci          # seed S + load HTTP; falha se SLO estourar
docker compose -f docker-compose.ci.yml down -v
```

**Gates que falham o pipeline de propósito:** audit high+, drift OpenAPI, bundle acima do budget, bench HTTP acima do SLO.

Artefatos gerados (mesmos paths do `upload-artifact` no GHA):

- `docs/openapi.json`
- `coverage/` (`api` + `client`)
- `docs/bench/artifacts/bundle-size.json`
- `docs/bench/artifacts/bench-ci-S.json`
- `docs/bench/reports/ci-S-*.md`

> **Nota:** o gate HTTP do bench escala S pode falhar com os SLOs atuais (ver [`docs/bench/reports/`](docs/bench/reports/)) — o CI propaga essa falha de propósito.

### 4) Desenvolvimento local (Swagger) — distinto do CI

Usa Compose **dev** com volume persistente na porta **5433** (não misturar com `docker-compose.ci.yml`):

```bash
cp .env_example .env
# Gere secrets únicos se for usar Docker Compose completo (NODE_ENV=production no container api):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Confirme DATABASE_URL e POSTGRES_HOST_PORT na mesma porta (padrão: 5433).

docker compose up -d postgres   # só o banco — não suba o serviço api
pnpm install --frozen-lockfile
pnpm ci:migrate
pnpm dev                        # Nest :3000 + Vite :5173 (proxy /api)
```

- Swagger UI: http://localhost:3000/api/docs  
- Contrato: [`docs/openapi.json`](docs/openapi.json) (`pnpm openapi:export`)

### 5) Docker completo (API + Postgres + SPA)

```bash
pnpm docker:up
```

- SPA / API: http://localhost:3000/
- Health: `GET http://localhost:3000/api/v1/health/live`
- Swagger: **desligado** (Compose força `NODE_ENV=production`)

---

## Escopo do desafio vs extensões

| Origem | Itens |
|--------|--------|
| **Requisito do desafio** | CRUD produtores/fazendas, CPF/CNPJ, invariante de áreas, culturas por safra, dashboard (totais, por UF, por cultura, uso do solo), API REST, Docker, PostgreSQL, ORM, testes, logs |
| **Extensão deliberada** | ESG/CAR/risco climático, BrasilAPI ACL, FLE+blind index, Prometheus/OTEL, benchmark harness, SPA React completa, soft-delete+unique parcial |

### Restrição deliberada vs enunciado

O enunciado permite **zero culturas** por safra. O contrato HTTP exige `crops.min(1)` por safra enviada ([`producer.schemas.ts`](src/presentation/schemas/producer.schemas.ts)) — decisão de qualidade cadastral (safra sem cultura não entra no payload). Para cadastrar fazenda sem safras, omita `harvests` / envie lista vazia.

---

## Troubleshooting

| Sintoma | Causa / correção |
|---------|------------------|
| `EADDRINUSE :::3000` | Container `brain_ag_api` ocupando a porta. `docker stop brain_ag_api` ou `pnpm docker:down`; mantenha só `postgres` para `pnpm dev`. |
| Migrations / API não conectam | Shell env (`DATABASE_URL`, `POSTGRES_*`) **sobrescreve** `.env`. Confira `echo $env:DATABASE_URL` (PowerShell) / `echo $DATABASE_URL`. Alinhe porta host ↔ `DATABASE_URL`. |
| Compose rejeita secrets | Em production o schema rejeita `ENCRYPTION_KEY` de exemplo, `PEPPER_SECRET` com menos de 32 chars / `change-me-…`, e senhas fracas tipo `postgrespassword`. Use valores do `.env_example` ou gere novos. |
| `engine-strict` / versão errada | `.npmrc` tem `engine-strict=true`; rode `pnpm preflight` e Corepack `pnpm@10.32.1`. |
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
| `ADMIN_API_TOKEN` | Token para `X-Admin-Token` em `/admin/revalidate/*` (opcional; sem ele → 401) |
| `REVALIDATE_PENDING_ENABLED` | `1`/`0` — job de revalidação PENDING (default `1`) |
| `REVALIDATE_PENDING_INTERVAL_MS` | Intervalo do job (default 300000) |
| `REVALIDATE_PENDING_BATCH_SIZE` | Batch por tick (default 50) |
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
| `crops[]` por safra | 1…20 (mín. 1 se a safra for enviada; ver restrição deliberada acima) |
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
- **Invariantes de área / UF / status:** Value Objects + `CHECK` no PostgreSQL (`0006` áreas; `0007` UF BR, `harvests.status`, `esg_status`, `car_status`; `0008` `document_validation_status` / `territorial_validation_status`). Violações `23505`→409 e `23514`→400 via `mapPgIntegrityError`.

### Validação externa BrasilAPI (estados)

| Status | Significado |
|--------|-------------|
| `VALIDATED` | BrasilAPI confirmou (CNPJ ativo / cidade ∈ UF) ou CPF validado só localmente |
| `PENDING_EXTERNAL_VALIDATION` | Timeout, 5xx, rede ou circuit open — persistido, **não** é compliance OK |
| `REJECTED` | CNPJ inativo/404 ou cidade ∉ UF — bloqueia no write síncrono; na revalidação pode ser **persistido** |

Campos públicos: `documentValidationStatus` / `territorialValidationStatus` + `*PendingAt` / `*PendingReason`.  
Auditoria append-only: tabela `external_validation_audit` (sem PII em claro).

#### Política de elegibilidade

| Operação | Cadastro aceito com PENDING? | Cadastro validado? | Operação elegível (compliance)? |
|----------|------------------------------|--------------------|---------------------------------|
| Criar/atualizar produtor (CNPJ) | Sim — status PENDING + ESG efetivo WARNING se era APPROVED | Só com `VALIDATED` | Não enquanto PENDING |
| Criar fazenda com doc PENDING | Sim (warn no log) | Território pode ser PENDING | Não usar para crédito/compliance |
| Cidade ∈ UF REJECTED | Não — HTTP 4xx | — | — |
| Listar cidades por UF | Degrada para `[]` | — | — |
| `POST /admin/revalidate/*` | Entrada típica = PENDING | Objetivo = VALIDATED | Exige `X-Admin-Token` |

**Revalidação:** job assíncrono (`REVALIDATE_PENDING_*`) + admin protegido por `ADMIN_API_TOKEN` (não JWT — opção C).
- **ACL BrasilAPI:** CNPJ ativo + cidade ∈ UF via `BrazilDataServiceInterface` / `BrasilApiAdapter`. Outcomes explícitos (`VALIDATED` | `PENDING_EXTERNAL_VALIDATION` | `REJECTED`); outage **nunca** conta como validação positiva — cadastro pode seguir só marcado como `PENDING`. Timeout 5s, até 2 retries (erros transitórios), circuit breaker (opossum), cache in-memory TTL 15 min (CNPJ/UF), métricas `brasilapi_requests_total` / `brasilapi_request_duration_seconds` / `brasilapi_circuit_open` / `brasilapi_cache_total{operation,result}`.
- **Observabilidade:** scrape `GET /api/v1/metrics` em rede confiável. Labels HTTP: `method`, `route` normalizada, `status_class` — nunca UUID/documento/URL crua. Inventário: `http_requests_total`, `http_request_duration_seconds`, `db_up`, `db_queries_total`, `db_query_duration_seconds`, `brasilapi_requests_total`, `brasilapi_request_duration_seconds`, `brasilapi_circuit_open`, `brasilapi_cache_total`, `rate_limit_rejected_total`, `domain_errors_total` (allowlist), `client_timing_seconds{event=dashboard_csv_export}`. OTLP só com `OTEL_EXPORTER_OTLP_ENDPOINT` ([`src/tracing.ts`](src/tracing.ts)); logs Pino com `trace_id`. Alertas/dashboard/runbook: [`docs/observability/`](docs/observability/).
- **Dashboard:** agregações SQL nativas (~11 queries em paralelo); filtros Zod no query string. Plano/EXPLAIN em [`docs/bench/`](docs/bench/).
- **Frontend:** SPA Vite servida pelo Nest em production; Atomic Design no `client/`; export do dashboard em **CSV** (sem `xlsx`).
- **Auth:** **fora de escopo do desafio** — API aberta exceto admin revalidate por token compartilhado; **bloqueador de produção** (ver abaixo).

---

## Limitações conhecidas / Production blockers

**Bloqueadores para exposição pública (P0/P1):**

| Item | Status | Notas |
|------|--------|-------|
| Autenticação / autorização / IDOR | **Ausente** (exceto admin token) | Qualquer cliente na rede muta/lê produtores e fazendas. Proteger com VPN/mTLS **ou** implementar OIDC+RBAC antes de internet. |
| `/api/v1/metrics` e agregados | Públicos | Não expor sem rede restrita — ver [`docs/observability/RUNBOOK.md`](docs/observability/RUNBOOK.md). |
| Busca por documento | Enumeração possível | `200` vs `404` revela existência de CPF/CNPJ (hash). |
| Bench escala S | Gates HTTP first paint | Ver `docs/bench/reports/`. |
| BrasilAPI degradada | Cadastro com `PENDING_EXTERNAL_VALIDATION` | Outage/timeout/circuit open **não** valida positivamente; ESG efetivo `WARNING` enquanto pendente. Rejeição (CNPJ inativo/404, cidade∉UF) continua bloqueando no write. |
| ESG / CAR | Stub local | `esgStatus` default `APPROVED`; CAR mock — não usar para compliance real. |

**Já mitigado nesta entrega:**

- Export dashboard sem `xlsx` (CSV nativo) — audit CI em **high**.
- `CHECK` constraints de área/UF no Postgres.
- Violação de unique (`23505`) mapeada para HTTP **409**.

Outras limitações operacionais: rate limit só por IP; listagem paginada retorna agregados (`farmsCount`/áreas/UFs) **sem** hidratar safras/culturas (`GET /producers/:id` hidrata o detalhe). Bundle gzip e bench HTTP S são **gates bloqueantes** no CI (`pnpm bench:bundle`, `pnpm bench:ci`); o SLO de first paint do dashboard usa `/summary` — `/stats` é residual — ver `docs/bench` e [`docs/matriz-riscos-staff-2026-09-20.md`](docs/matriz-riscos-staff-2026-09-20.md). Scripts `pnpm bench:run` locais de carga/SQL permanecem disponíveis fora do caminho mínimo do avaliador.

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
| GET | `/api/v1/metrics` | Prometheus (não expor publicamente) |
| POST | `/api/v1/observability/client-timings` | Timing allowlisted (ex.: export CSV) |

---

## Segurança (resumo)

- Documento criptografado em repouso; busca via hash; máscara `@MaskPII()` nas respostas.
- Soft delete + unique parcial; logs Pino com redact de `document`.
- Helmet, rate limit, CORS restrito em production, body limit.
- 5xx genéricos com `errorId` / `traceId`.
- **Dependências:** `pnpm audit:ci` (= `pnpm audit --prod --audit-level=high`) falha a CI em vulnerabilidades **high** ou superiores nas deps de **runtime**. **Não** há allowlist/silenciamento. Export do dashboard é CSV nativo (sem `xlsx`; não há upload/leitura de planilhas). Se no futuro for inevitável uma exceção temporária, documentar em `docs/security/audit-exceptions.md` com CVE, justificativa e **data de expiração** — o arquivo só deve existir enquanto a exceção estiver vigente.

Frontend: [`client/README.md`](client/README.md). Spec técnica: [`docs/backend-technical-spec.md`](docs/backend-technical-spec.md).
