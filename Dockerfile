# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
# NODE_ENV não pode ser production aqui — senão pnpm omite vite/devDeps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json nest-cli.json .swcrc ./
COPY client/package.json ./client/package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY src ./src
# Não usar `COPY client ./client` — apagaria client/node_modules (symlinks pnpm)
COPY client/src ./client/src
COPY client/index.html client/vite.config.ts client/tsconfig.json client/jest.config.cjs ./client/
ENV CI=true
RUN pnpm --filter @brain-ag/client build & client_pid=$!; \
    pnpm build:api & api_pid=$!; \
    wait "$client_pid" && wait "$api_pid" && pnpm prune --prod

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY scripts/wait-for-db.mjs ./scripts/wait-for-db.mjs
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh \
  && sed -i 's/\r$//' ./docker/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker/entrypoint.sh"]
