import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import { statusClassFromCode } from './normalize-http-route.js';

type CircuitBreakerName = 'cnpj' | 'city' | 'cities';

export type BrasilApiOperation = 'cnpj' | 'city' | 'cities';

export type BrasilApiResultLabel =
  | 'success'
  | 'fallback'
  | 'rejected'
  | 'error';

export type DbOperation =
  | 'producer_save'
  | 'producer_update'
  | 'producer_find_by_id'
  | 'producer_find_by_document_hash'
  | 'producer_find_many'
  | 'producer_find_all'
  | 'producer_soft_delete'
  | 'farm_save'
  | 'farm_update'
  | 'farm_find_by_id'
  | 'farm_soft_delete'
  | 'dashboard_stats'
  | 'dashboard_summary'
  | 'dashboard_analytics';

type DbQueryResult = 'ok' | 'error';

type ClientTimingEvent = 'dashboard_csv_export';

const DOMAIN_ERROR_CODES = new Set([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'CONFLICT',
  'SOCIO_ENVIRONMENTAL_BLOCK',
  'INACTIVE_CNPJ',
  'INVALID_DOCUMENT',
  'INVALID_FARM_AREA',
  'INVALID_CAR_NUMBER',
  'INVALID_DOMAIN_VALUE',
  'TERRITORIAL_INCONSISTENCY',
  'INTERNAL_ERROR',
  'VALIDATION_SCHEMA_REQUIRED',
  'RATE_LIMIT_EXCEEDED',
]);

const CLIENT_TIMING_EVENTS = new Set<ClientTimingEvent>([
  'dashboard_csv_export',
]);

@Injectable()
export class MetricsService {
  public readonly registry = new Registry();
  public readonly httpRequestsTotal: Counter<string>;
  public readonly httpRequestDurationSeconds: Histogram<string>;
  public readonly dbUp: Gauge<string>;
  public readonly dbQueryDurationSeconds: Histogram<string>;
  public readonly dbQueriesTotal: Counter<string>;
  public readonly circuitOpen: Gauge<string>;
  public readonly brasilApiRequestsTotal: Counter<string>;
  public readonly brasilApiRequestDurationSeconds: Histogram<string>;
  public readonly rateLimitRejectedTotal: Counter<string>;
  public readonly domainErrorsTotal: Counter<string>;
  public readonly clientTimingSeconds: Histogram<string>;

  public constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_class'],
      registers: [this.registry],
    });
    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
    this.dbUp = new Gauge({
      name: 'db_up',
      help: '1 if database responds to SELECT 1',
      registers: [this.registry],
    });
    this.dbQueryDurationSeconds = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Repository operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });
    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Repository operations by result',
      labelNames: ['operation', 'result'],
      registers: [this.registry],
    });
    this.circuitOpen = new Gauge({
      name: 'brasilapi_circuit_open',
      help: '1 if BrasilAPI circuit breaker is open',
      labelNames: ['breaker'],
      registers: [this.registry],
    });
    this.brasilApiRequestsTotal = new Counter({
      name: 'brasilapi_requests_total',
      help: 'Total BrasilAPI lookups by operation and result',
      labelNames: ['operation', 'result'],
      registers: [this.registry],
    });
    this.brasilApiRequestDurationSeconds = new Histogram({
      name: 'brasilapi_request_duration_seconds',
      help: 'BrasilAPI lookup duration in seconds',
      labelNames: ['operation'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.rateLimitRejectedTotal = new Counter({
      name: 'rate_limit_rejected_total',
      help: 'Requests rejected by HTTP rate limiter',
      labelNames: ['limiter'],
      registers: [this.registry],
    });
    this.domainErrorsTotal = new Counter({
      name: 'domain_errors_total',
      help: 'Domain and mapped application errors by code',
      labelNames: ['code'],
      registers: [this.registry],
    });
    this.clientTimingSeconds = new Histogram({
      name: 'client_timing_seconds',
      help: 'Client-reported timing events (allowlisted)',
      labelNames: ['event'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });
  }

  public recordHttp(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const statusClass = statusClassFromCode(statusCode);
    this.httpRequestsTotal.inc({
      method,
      route,
      status_class: statusClass,
    });
    this.httpRequestDurationSeconds.observe({ method, route }, durationSeconds);
  }

  public setDbUp(up: boolean): void {
    this.dbUp.set(up ? 1 : 0);
  }

  public async timeDbOperation<T>(
    operation: DbOperation,
    fn: () => Promise<T>,
  ): Promise<T> {
    const started = process.hrtime.bigint();
    try {
      const result = await fn();
      this.recordDbQuery(operation, 'ok', started);
      return result;
    } catch (error) {
      this.recordDbQuery(operation, 'error', started);
      throw error;
    }
  }

  public recordDbQuery(
    operation: DbOperation,
    result: DbQueryResult,
    started: bigint,
  ): void {
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
    this.dbQueriesTotal.inc({ operation, result });
    this.dbQueryDurationSeconds.observe({ operation }, durationSeconds);
  }

  public setCircuitOpen(name: CircuitBreakerName, open: boolean): void {
    this.circuitOpen.set({ breaker: name }, open ? 1 : 0);
  }

  public recordBrasilApiRequest(
    operation: BrasilApiOperation,
    result: BrasilApiResultLabel,
    durationSeconds: number,
  ): void {
    this.brasilApiRequestsTotal.inc({ operation, result });
    this.brasilApiRequestDurationSeconds.observe(
      { operation },
      durationSeconds,
    );
  }

  public recordRateLimitRejected(): void {
    this.rateLimitRejectedTotal.inc({ limiter: 'http' });
  }

  public recordDomainError(code: string): void {
    const safe = DOMAIN_ERROR_CODES.has(code) ? code : 'other';
    this.domainErrorsTotal.inc({ code: safe });
  }

  public recordClientTiming(
    event: string,
    durationSeconds: number,
  ): boolean {
    if (!CLIENT_TIMING_EVENTS.has(event as ClientTimingEvent)) {
      return false;
    }
    this.clientTimingSeconds.observe(
      { event },
      Math.min(Math.max(durationSeconds, 0), 120),
    );
    return true;
  }

  public async scrape(): Promise<string> {
    return this.registry.metrics();
  }
}
