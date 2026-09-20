# Runbook — Observabilidade Brain Agriculture API

Scrape Prometheus: `GET /api/v1/metrics` (não expor na internet sem rede restrita).
Traces (opcional): `OTEL_EXPORTER_OTLP_ENDPOINT` → collector OTLP/HTTP. Logs Pino incluem `trace_id` / `span_id` quando há span ativo.

| Sintoma | Consulta | Ação |
|---------|----------|------|
| API lenta (p95 alto) | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` e breakdown por `route` | Identificar rota; checar `db_query_duration_seconds` e BrasilAPI duration; EXPLAIN/bench se dashboard. |
| Erros 5xx | `sum(rate(http_requests_total{status_class="5xx"}[5m]))` + logs `trace_id` / `errorId` | Abrir log do `errorId`; corrigir causa; confirmar `/health/ready`. |
| Banco indisponível | `db_up == 0` ou `GET /api/v1/health/ready` → 503 | Verificar Postgres (`docker compose ps`), `DATABASE_URL`, rede/porta 5433. |
| BrasilAPI degradada | `max(brasilapi_circuit_open)==1` ou `rate(brasilapi_requests_total{result="fallback"}[5m])` | Checar status BrasilAPI; logs `PENDING_EXTERNAL_VALIDATION`; cadastros PJ podem persistir com status PENDING (não é compliance OK). |
| Rate limit | `rate(rate_limit_rejected_total[5m])` | Ajustar `THROTTLE_*` / `TRUST_PROXY`; investigar cliente abusivo. |
| Domínio / validação | `sum(rate(domain_errors_total[5m])) by (code)` | `INACTIVE_CNPJ` / `TERRITORIAL_INCONSISTENCY` = rejeição esperada; `INTERNAL_ERROR` = bug. |
| Export CSV lento | `client_timing_seconds` event `dashboard_csv_export` | Volume de abas/dados no client; se API lenta, ver painéis HTTP/DB acima. |

Alertas sugeridos: [`prometheus-alerts.yml`](./prometheus-alerts.yml). Dashboard Grafana: [`grafana-dashboard.json`](./grafana-dashboard.json).
