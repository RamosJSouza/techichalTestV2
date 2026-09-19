# Brain Agriculture — Backend API

API REST para gestão de produtores rurais, propriedades, safras e dashboard analítico.

**Stack:** NestJS 12 · TypeScript · Drizzle ORM · PostgreSQL 16 · Zod · Pino · OpenTelemetry

**Arquitetura:** Clean Architecture / DDD (`domain` → `application` → `infrastructure` / `presentation`)

## Pré-requisitos

- Node.js 22+ (ver `.nvmrc`)
- pnpm 10+
- Docker Desktop

## Executar com Docker (recomendado)

```bash
cp .env_example .env
pnpm docker:up          # build + Postgres + API + migrations
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Health: `GET /api/v1/health`
- Postgres no host: `localhost:5433` (evita conflito com Postgres local na 5432)

```bash
pnpm docker:logs        # logs da API
pnpm docker:down        # para os containers
```

## Executar localmente (Node + Postgres no Docker)

```bash
cp .env_example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm start:dev
```

Variáveis importantes no `.env`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) para AES-256-GCM |
| `PEPPER_SECRET` | Pepper do blind index HMAC-SHA256 (≥16 chars) |
| `ENABLE_CAR_VALIDATION` | `false` = Mock CAR; `true` = stub SICAR (NotImplemented) |
| `ENABLE_ESG_COMPLIANCE` | `false` = Mock ESG; `true` = stub SERPRO (NotImplemented) |
| `ESG_STRICT_MODE` | `true` = bloqueia (403) restrições ESG; `false` = `WARNING` |
| `ENABLE_PROAGRO_RISK` | `false` = Mock PROAGRO; `true` = stub BCB (NotImplemented) |

### Regras dos MockAdapters (offline)

- **CAR:** formato válido → `ACTIVE` se `vegetationArea >= 20%` da área total; senão `PENDING`
- **ESG:** documento (só dígitos) terminado em `0` → restrição (strict = 403 / senão `WARNING`)
- **PROAGRO:** score `0–100` determinístico (hash de `city|UF|crops`)

Com flags `true` sem credenciais oficiais, os stubs lançam `NotImplementedException` (sem rede).

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
pnpm build
```

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
