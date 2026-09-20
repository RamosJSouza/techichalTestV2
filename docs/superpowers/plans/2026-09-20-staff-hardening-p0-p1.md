# Staff hardening — plano priorizado (pré-implementação)

> **For agentic workers:** implementar apenas a seção **Pacote acordado P0/P1**. Itens P2+ ficam backlog.

**Goal:** Fechar gaps de pré-submissão do parecer Staff sem quebrar o contrato OpenAPI atual nem inventar auth completa.

**Architecture:** Hardening no storage (CHECK), dependências (CSV no lugar de xlsx), mapeamento de erros PG, documentação honesta; auth permanece gap declarado.

**Tech Stack:** NestJS, Drizzle/Postgres, React/Vite, pnpm audit, Jest

## Pacote acordado P0/P1 (implementar agora)

Derivado de [`docs/ANALISE_STAFF_PRINCIPAL_BRAIN_AGRICULTURE.md`](../ANALISE_STAFF_PRINCIPAL_BRAIN_AGRICULTURE.md) §4–§6 “Antes da submissão”, com **compatibilidade de contrato**:

| ID | Cat | Item | Mínimo (este PR) | Production-grade (backlog) |
|----|-----|------|------------------|----------------------------|
| A | sec | API sem auth | Documentar blocker + risco IDOR no README; **não** adicionar OIDC | OIDC/JWT + RBAC + tenant + testes negativos |
| B | sec | `xlsx` high vulns | Trocar export dashboard por **CSV** (write-only); remover `xlsx` | SheetJS pago / export server-side isolado; `audit --audit-level=high` |
| C | confiab | Invariantes só no TS | Migration `CHECK` áreas + `char(2)` state | Enums status + testes insert direto no PG |
| D | func | `crops.min(1)` vs enunciado | Documentar restrição deliberada | Aceitar `crops: []` se produto exigir literal |
| E | confiab | Race unique → 500 | Mapear PG `23505` → `ConflictException` (409) | Teste de corrida / advisory lock |
| F | DX | README / links / checklist | Seção limitações + restaurar checklist; remover link morto | Diagrama C4 + Dev Container |
| G | sec/DX | Audit CI | Após B, `audit:ci` com `--audit-level=high` | Allowlist temporal documentada |

**Fora deste pacote (P1/P2 backlog):** listagem summary sem hydrate, dashboard 11→N queries, estados BrasilAPI PENDING, OTEL exporter, bundle code-split, auth real, protect `/metrics` com mTLS.

---

## Inventário completo por risco (evidência)

### Segurança

1. **P0 — API aberta / IDOR** — Controllers sem guards (`producer.controller.ts` ~67–125, `farm.controller.ts` ~38–65). Impacto: qualquer cliente na rede muta/lê dados. Mínimo: documentar. Prod: authz por recurso.
2. **P1 — xlsx@0.18.5** — `client/package.json`, `export-excel.ts:1-14`, `DashboardPage.tsx:360`. Impacto: audit high (prototype pollution / ReDoS); uso é só escrita. Mínimo: CSV. Prod: lib mantida / server export.
3. **P1 — `/metrics` público** — `health.controller.ts` metrics route. Mínimo: documentar + rede. Prod: auth/mTLS.
4. **P1 — Enumeração documento** — `GET .../search?document=`. Mínimo: documentar. Prod: rate limit dedicado / resposta uniforme.

### Confiabilidade

5. **P1 — CHECK areas ausente** — `tables.ts:44-49`, migrations `0000` sem CHECK. Impacto: bypass via SQL. Mínimo: CHECK. Prod: enums + testes DB.
6. **P2 — 23505 → 500** — insert em `drizzle-producer.repository.ts` sem catch unique. Mínimo: mapear 409.

### Funcionalidade

7. **P1 — crops.min(1)** — `producer.schemas.ts` harvest crops. Impacto: mais restrito que enunciado. Mínimo: documentar. Prod: alinhar se necessário.

### Performance

8. **P1 — Bench S FAIL** — `docs/bench/reports/S-2026-09-20.md`; dashboard `Promise.all` 11 queries; list hydrate. Mínimo: documentar. Prod: summary endpoint + índices + cache (fora deste PR).

### Observabilidade

9. **P2 — OTEL sem exporter/alertas** — tracing init local. Mínimo: já documentado. Prod: OTLP + runbooks.

### DX

10. **P1 — Links README quebrados** — `evaluator-checklist.md`, `dashboard-query-plan.md` ausentes. Mínimo: restaurar checklist; apontar bench/README.
11. **P1 — Node pin Docker** — `Dockerfile` `node:22-alpine` vs engines 22.22.3. Mínimo: pin se imagem existir.

### Frontend

12. **P2 — Bundle / empty catches / page clamp** — ver auditoria client. Fora do pacote acordado salvo impacto direto do CSV.

---

## Tasks de implementação

- [x] CSV export + remover xlsx + testes
- [x] Migration CHECK farms + schema drizzle
- [x] Mapear 23505 → ConflictException
- [x] README: escopo original vs extensão, limitações, crops, auth; checklist
- [x] `audit:ci` → high
- [x] Gates: lint, test:api, test:client, e2e, audit, build — ALL PASS (2026-09-20)
