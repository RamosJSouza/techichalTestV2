import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export type CircuitBreakerName = 'cnpj' | 'city' | 'cities';

export type BrasilApiOperation = 'cnpj' | 'city' | 'cities';

export type BrasilApiResultLabel =
  | 'success'
  | 'fallback'
  | 'rejected'
  | 'error';

@Injectable()
export class MetricsService {
  public readonly registry = new Registry();
  public readonly httpRequestsTotal: Counter<string>;
  public readonly dbUp: Gauge<string>;
  public readonly circuitOpen: Gauge<string>;
  public readonly brasilApiRequestsTotal: Counter<string>;
  public readonly brasilApiRequestDurationSeconds: Histogram<string>;

  public constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.dbUp = new Gauge({
      name: 'db_up',
      help: '1 if database responds to SELECT 1',
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
  }

  public recordHttp(
    method: string,
    route: string,
    statusCode: number,
  ): void {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: String(statusCode),
    });
  }

  public setDbUp(up: boolean): void {
    this.dbUp.set(up ? 1 : 0);
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

  public async scrape(): Promise<string> {
    return this.registry.metrics();
  }
}
