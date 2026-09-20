# Brain Agriculture — API + Frontend (monorepo)

API REST NestJS e SPA React servida no mesmo processo em produção (`/`).

**Stack:** NestJS 12 · React 18 · Vite · RTK Query · Styled Components · Drizzle · PostgreSQL 16 · Zod

**Arquitetura:** Clean Architecture / DDD no backend; Atomic Design + MFE-ready no `client/`.

## Pré-requisitos

- Node.js 22+ (ver `.nvmrc`)
- pnpm 10+
- Docker Desktop

## Executar com Docker (recomendado)

```bash
cp .env_example .env
pnpm docker:up          # build client+API + Postgres + migrations
```

- SPA: http://localhost:3000/
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
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
| `PEPPER_SECRET` | Pepper do blind index HMAC-SHA256 (≥16 chars) |

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

## Segurança de PII

- Documento criptografado em repouso (AES-256-GCM, formato `iv:authTag:ciphertext`)
- Busca via `document_hash` (HMAC-SHA256)
- Respostas HTTP com `@MaskPII()` + interceptor (`***.XXX.XXX-**` / `**.XXX.XXX/XXXX-**`)
- Soft delete via `deleted_at`
- Logs Pino com `trace_id` / `span_id` (OpenTelemetry)

## Testes

```bash
pnpm test          # unitários
pnpm test:e2e      # requer DATABASE_URL + migrations
pnpm build         # client + API em paralelo (Vite SWC + Nest SWC)
```

Builds Docker usam BuildKit (`DOCKER_BUILDKIT=1`, padrão no Docker moderno) com cache do store pnpm e compilação paralela client/API.

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
