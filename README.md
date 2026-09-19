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

## Endpoints

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/v1/producers` | Cria produtor (+ fazendas/safras opcionais) |
| GET | `/api/v1/producers` | Lista produtores ativos |
| GET | `/api/v1/producers/:id` | Detalhe |
| GET | `/api/v1/producers/search?document=` | Busca por blind index |
| PUT | `/api/v1/producers/:id` | Atualiza |
| DELETE | `/api/v1/producers/:id` | Soft delete |
| POST | `/api/v1/farms` | Cria fazenda |
| GET | `/api/v1/dashboard/stats` | Agregações SQL |

## Validação (Zod × Domínio)

- **HTTP / env:** Zod (`.strict()` rejeita campos extras) + `ZodValidationPipe`
- **Domínio:** Value Objects `CpfCnpj` e `FarmArea` (invariantes de negócio)
- **Integração:** BrasilAPI (CNPJ ativo + cidade∈UF) com circuit breaker e degradação graciosa

## Segurança de PII

- Documento criptografado em repouso (AES-256-GCM, formato `iv:authTag:ciphertext`)
- Busca via `document_hash` (HMAC-SHA256)
- Respostas HTTP com mascaramento (`***.XXX.XXX-**` / `**.XXX.XXX/XXXX-**`)
- Soft delete via `deleted_at`

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
