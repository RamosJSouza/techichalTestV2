# Brain Agriculture — API + Frontend (monorepo)

API REST NestJS e SPA React servida no mesmo processo em produção (`/`).

**Stack:** NestJS 12 · React 18 · Vite · RTK Query · Styled Components · Drizzle · PostgreSQL 16 · Zod

**Arquitetura:** Clean Architecture / DDD no backend; Atomic Design + MFE-ready no `client/`.

## Pré-requisitos

- **Node.js 22.22.3** (exato — ver `.nvmrc` e `engines` no `package.json`)
- **pnpm 10.32.1** (Corepack / `packageManager`)
- Docker Desktop

O repositório usa `engine-strict` e `package-manager-strict` (`.npmrc`).

## Executar com Docker (recomendado)

```bash
cp .env_example .env
# Compose força NODE_ENV=production no container api — o .env precisa de
# ENCRYPTION_KEY / PEPPER_SECRET (≥32) / POSTGRES_PASSWORD sem valores de exemplo.
# Variáveis já exportadas no shell têm prioridade sobre o arquivo .env.
pnpm docker:up          # build client+API + Postgres + migrations
```

- SPA: http://localhost:3000/
- API: http://localhost:3000/api/v1
- Swagger (não-production): http://localhost:3000/api/docs
- Health: `GET /api/v1/health`
- Postgres no host: `localhost:5433`

## Desenvolvimento local (API + Vite)

```bash
cp .env_example .env
docker compose up -d postgres   # só o banco — NÃO suba o serviço `api`
pnpm install
pnpm db:migrate
pnpm dev                        # Nest :3000 + Vite :5173 (proxy /api)
```

### Troubleshooting: `EADDRINUSE :::3000`

A porta **3000** no host é usada pelo container Docker `brain_ag_api` (`pnpm docker:up` / Compose). Se ela já estiver ocupada, o Nest do `pnpm dev` falha ao dar `listen`.

```bash
docker stop brain_ag_api
# ou
pnpm docker:down
pnpm dev
```

Mantenha `docker compose up -d postgres` para o banco local; evite `docker compose up` completo em paralelo com `pnpm dev`.

Detalhes do frontend: [`client/README.md`](client/README.md).

Variáveis importantes no `.env`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) para AES-256-GCM |
| `ENCRYPTION_KEY_ID` | Key-id no ciphertext (`kid:iv:tag:ct`); default `v1` |
| `ENCRYPTION_KEY_PREVIOUS` / `_ID` | Chave anterior para decrypt durante rotação |
| `PEPPER_SECRET` | Pepper HMAC (≥16; em production ≥32 e ≠ exemplo) |
| `BODY_LIMIT` | Limite JSON body (default `100kb`) |
| `TRUST_PROXY` | `true`/`1` se atrás de proxy confiável (rate limit) |

## Endpoints

| Fase | Método | Path | Descrição |
|------|--------|------|-----------|
| 1 | POST | `/api/v1/producers` | Cria produtor (+ fazendas/safras opcionais) |
| 1 | GET | `/api/v1/producers` | Lista produtores ativos |
| 1 | GET | `/api/v1/producers/:id` | Detalhe |
| 1 | GET | `/api/v1/producers/search?document=` | Busca por blind index |
| 1 | PUT | `/api/v1/producers/:id` | Atualiza |
| 1 | DELETE | `/api/v1/producers/:id` | Soft delete |
| 2 | GET | `/api/v1/producers/:id/esg-compliance` | Parecer socioambiental |
| 1 | POST | `/api/v1/farms` | Cria fazenda |
| 1 | PUT | `/api/v1/farms/:id` | Atualiza fazenda |
| 1 | DELETE | `/api/v1/farms/:id` | Soft delete fazenda |
| 2 | POST | `/api/v1/farms/:id/car/validate` | Auditoria CAR (mock/stub) |
| 1 | GET | `/api/v1/dashboard/stats` | Agregações SQL (+ risco climático médio) |

Safras (`harvests`) têm `status` `ACTIVE` | `ARCHIVED` (novas = `ACTIVE`). O gráfico de culturas do dashboard considera só safras `ACTIVE` e fazendas não soft-deleted.

## Validação (Zod × Domínio)

- **HTTP / env:** Zod (`.strict()` rejeita campos extras) + `ZodValidationPipe`
- **Domínio:** Value Objects `CpfCnpj`, `FarmArea`, `CarNumber`
- **Integração:** BrasilAPI (CNPJ ativo + cidade∈UF) com circuit breaker; Fase 2 via ports + mocks

## Segurança de PII e produção

- Documento criptografado em repouso (AES-256-GCM, formato `kid:iv:authTag:ciphertext`; legado `iv:tag:ct` ainda descriptografa)
- Busca via `document_hash` (HMAC-SHA256); unique parcial `WHERE deleted_at IS NULL` + hash anonimizado no soft delete
- Caps Zod: farms≤20, harvests≤10, crops≤20; `page`≤10000; body JSON limitado (`BODY_LIMIT`)
- Respostas HTTP com `@MaskPII()` + interceptor (`***.XXX.XXX-**` / `**.XXX.XXX/XXXX-**`)
- Soft delete via `deleted_at` (permite recriar o mesmo CPF/CNPJ)
- Logs Pino com `trace_id` / `span_id` (OpenTelemetry) e redact de `document`
- Em `NODE_ENV=production`, secrets de exemplo / senha `postgrespassword` / pepper com menos de 32 chars são **rejeitados**; Swagger **desligado**
- Rate limit (`express-rate-limit` via `THROTTLE_*`; skip só `/health*`), `helmet`, CORS via `CORS_ORIGINS` (CSV)
- Erros 5xx desconhecidos: mensagem genérica + `errorId` / `traceId` (detalhe só nos logs)
- **Sem autenticação no escopo atual** — API aberta; proteger rede (VPN/firewall/mTLS) em produção controlada

### Gerar chaves

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Health: `GET /api/v1/health/live` (liveness), `GET /api/v1/health/ready` (Postgres), `GET /api/v1/metrics` (Prometheus).

## Testes e Jest

```bash
pnpm lint
pnpm test          # unitários API + client
pnpm test:e2e      # requer DATABASE_URL; aplica migrations no beforeAll (módulo E2eAppModule sem nestjs-pino)
pnpm build         # client + API em paralelo (Vite SWC + Nest SWC)
```

**Estratégia Jest (única por runtime):**

| Escopo | Config | Módulos |
|--------|--------|---------|
| API / E2E | `jest.config.cjs` + `node --experimental-vm-modules` | ESM (`ts-jest` `useESM`), alinhado a `"type":"module"` / Nest |
| Client | `client/jest.config.cjs` | Transform CJS via `ts-jest` (React/jsdom); sem `jest.config.ts` nem loader TS transitivo |

Builds Docker usam BuildKit (`DOCKER_BUILDKIT=1`) com cache do store pnpm e compilação paralela client/API.

## Scripts úteis

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```
