import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export type CircuitBreakerName = 'cnpj' | 'city' | 'cities';

@Injectable()
export class MetricsService {
  public readonly registry = new Registry();
  public readonly httpRequestsTotal: Counter<string>;
  public readonly dbUp: Gauge<string>;
  public readonly circuitOpen: Gauge<string>;

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

  public async scrape(): Promise<string> {
    return this.registry.metrics();
  }
}
