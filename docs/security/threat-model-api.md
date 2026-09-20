# Threat model — Brain Agriculture API (sem auth de usuário)

Escopo: superfície HTTP NestJS + ACL BrasilAPI + FLE. **Fora:** JWT/OIDC (bloqueador de produção documentado).

## Ativos

| Ativo | Ameaça | Mitigação |
|-------|--------|-----------|
| Documento (CPF/CNPJ) | Vazamento em logs, 4xx, métricas, traces | FLE AES-256-GCM + blind index; máscara na API; Pino redact `*.document`; route scrub; reasons BrasilAPI **sem** dígitos |
| `ADMIN_API_TOKEN` | Timing / brute-force / log de header | `sha256` + `timingSafeEqual`; redact `req.headers["x-admin-token"]`; rate limit |
| `/api/v1/metrics` | Info disclosure / enumeração | **Sem auth app** (contrato); scrape só em rede confiável (SG/VPN). Labels low-cardinality |
| CORS / browser | Origem maliciosa em prod | Prod: só `CORS_ORIGINS`; sem credentials. Dev: `origin: true` |
| Body / DoS | Payload grande | `express.json` limit (`BODY_LIMIT`, default 100kb) + Helmet + rate limit |
| BrasilAPI | SSRF via env / path injection | Host allowlist `brasilapi.com.br` (https); `encodeURIComponent`; UF `^[A-Z]{2}$`; timeout 5s + circuit |
| SQL | Injection | Drizzle parametrizado (`eq`/`ilike`/fragments) |
| Chaves FLE | Kid inválido / rotação | Decrypt **somente** kid registrado; previous key via env; IDs distintos |
| Traces OTLP | Header admin em spans | `headersToSpanAttributes` vazio (HTTP instrumentation) |

## Trust boundaries

```
Client SPA / scraper  --HTTP-->  Nest (:3000)  --SQL-->  Postgres
                              |--HTTPS--> BrasilAPI (allowlisted)
                              |--OTLP-->  collector (opcional)
```

Assunções: Postgres e scrape Prometheus **não** estão na internet aberta; `TRUST_PROXY=true` só atrás de proxy confiável.

## Residual (aceito neste ciclo)

- API aberta sem auth de usuário (P0 produção).
- `/metrics` público no app (mitigação = rede).
- Nome do produtor em claro nas respostas (dado de produto).
- Máscara CPF/CNPJ ainda revela dígitos intermediários (contrato client).

## Validação

```bash
pnpm preflight
pnpm test:api -- --testPathPatterns="admin-token|redact|brasil-api.adapter|crypto.service|env.schema|normalize-http-route|global-exception"
pnpm test:e2e -- --testPathPatterns="app.e2e"
pnpm openapi:export && git diff --exit-code docs/openapi.json
```
