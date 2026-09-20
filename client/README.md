# Client — Brain Agriculture (React + Vite)

SPA embutida no monorepo NestJS. Em produção é servida em `/` via `@nestjs/serve-static`; a API permanece em `/api/v1`. Swagger (`/api/docs`) só sobe fora de `NODE_ENV=production`.

## Stack

- React 18 + TypeScript strict
- Redux Toolkit + **RTK Query** (Axios)
- Styled Components (tema AgTech)
- Atomic Design + fronteira MFE em `src/mfe/brain-ag`
- Zod + React Hook Form (espelho dos schemas do backend + invariante de área)

## Desenvolvimento

Na raiz do monorepo:

```bash
pnpm install
pnpm dev          # API :3000 + Vite :5173 (proxy /api)
```

Se aparecer `EADDRINUSE :::3000`, a API Docker (`brain_ag_api`) já está na porta. Pare o container (`docker stop brain_ag_api` ou `pnpm docker:down`) e rode `pnpm dev` de novo — veja o README da raiz.

Só o client (com API já rodando):

```bash
pnpm dev:client
```

**Integração real (padrão):** sem `VITE_USE_MOCKS`, o SPA usa Axios → `/api/v1` (proxy Vite → Nest `:3000`). Não defina a flag em produção nem no CI.

Mocks offline (sem Nest) — **só** com flag explícita:

```bash
# client/.env.local
VITE_USE_MOCKS=true
pnpm --filter @brain-ag/client dev
```

## Build / produção

```bash
pnpm build        # client/dist + nest dist
pnpm start:prod   # serve SPA se client/dist existir
pnpm docker:up    # imagem unificada (client + API + Postgres)
```

Em produção o Nest serve `client/dist` em `/` (exclui `/api*`). Swagger (`/api/docs`) não é registrado em `NODE_ENV=production`.

## Responsivo

Breakpoints do DESIGN.md (AgroIntel Pro):

| Faixa | Largura |
|-------|---------|
| Mobile | ≤ 767px |
| Tablet (rail 72px) | 768–1279px |
| Desktop | ≥ 1280px |

## Testes

```bash
pnpm test:client
```

Cobertura: CRUD (create/update/delete farm + delete producer), erro HTTP + retry
(dashboard/listagem/form), validação CAR, export CSV (unit + UI), dashboard happy path,
gate `VITE_USE_MOCKS`.

## Observabilidade do client

- Mocks **somente** com `VITE_USE_MOCKS=true` (dev/teste). Build de produção usa Axios → `/api/v1`.
- Code splitting: rotas via `React.lazy`; gráficos (recharts) e `exportToCsv` sob demanda.
- Bundle gzip: `pnpm build:client && pnpm bench:bundle` — gates em CI (`bench:bundle`).

## Rotas

| Rota | Página |
|------|--------|
| `/` | Dashboard |
| `/producers` | Listagem |
| `/producers/new` | Wizard cadastro (multi-fazenda) |
| `/producers/:id/edit` | Edição + fazendas / CAR |
| `/producers/:id/esg` | Parecer ESG |
