# Runbook — Observabilidade Brain Agriculture API

Scrape Prometheus: `GET /api/v1/metrics` (não expor na internet sem rede restrita).
Traces (opcional): `OTEL_EXPORTER_OTLP_ENDPOINT` → collector OTLP/HTTP. Logs Pino incluem `trace_id` / `span_id` quando há span ativo.

Labels de baixa cardinalidade apenas (`method`, `route` normalizada, `status_class`, `operation`, `result`, `code`, `breaker`, `event`). Nunca UUID, documento, URL crua ou chave de cache.

| Sintoma | Limiar | Consulta | Ação |
|---------|--------|----------|------|
| API lenta (p95 alto) | > 1s por 5m (`HttpP95High`) | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` e breakdown por `route` | Identificar rota; checar `db_query_duration_seconds` e BrasilAPI duration; EXPLAIN/bench se dashboard. |
| Erros 5xx | > 2% por 5m (`Http5xxRate`) | `sum(rate(http_requests_total{status_class="5xx"}[5m]))` + logs `trace_id` / `errorId` | Abrir log do `errorId`; corrigir causa; confirmar `/health/ready`. |
| Banco indisponível | `db_up==0` por 1m (`DbDown`) | `db_up == 0` ou `GET /api/v1/health/ready` → 503 | Verificar Postgres (`docker compose ps`), `DATABASE_URL`, rede/porta 5433. |
| BrasilAPI degradada | circuit=1 ou fallback rate > 0.1/s por 5m (`BrasilApiDegraded`) | `max(brasilapi_circuit_open)==1` ou `rate(brasilapi_requests_total{result="fallback"}[5m])` | Checar status BrasilAPI; logs `PENDING_EXTERNAL_VALIDATION`; cadastros PJ podem persistir com status PENDING (não é compliance OK). |
| Cache BrasilAPI | hit ratio caindo + fallback alto (informativo; sem alerta) | `sum(rate(brasilapi_cache_total{result="hit"}[5m])) / clamp_min(sum(rate(brasilapi_cache_total[5m])), 1e-9)` | Checar TTL (15 min), rede/BrasilAPI e se miss/expired disparam HTTP de verdade. |
| Rate limit | — | `rate(rate_limit_rejected_total[5m])` | Ajustar `THROTTLE_*` / `TRUST_PROXY`; investigar cliente abusivo. |
| Domínio / validação | — | `sum(rate(domain_errors_total[5m])) by (code)` | `INACTIVE_CNPJ` / `TERRITORIAL_INCONSISTENCY` = rejeição esperada; `INTERNAL_ERROR` = bug. |
| Export CSV lento | — | `client_timing_seconds` event `dashboard_csv_export` | Volume de abas/dados no client; se API lenta, ver painéis HTTP/DB acima. |

Alertas sugeridos: [`prometheus-alerts.yml`](./prometheus-alerts.yml). Dashboard Grafana: [`grafana-dashboard.json`](./grafana-dashboard.json).
