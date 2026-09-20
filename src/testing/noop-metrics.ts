import type { MetricsPort } from '../application/services/metrics.port.js';

/** Implementação no-op para testes unitários (sem prom-client). */
export class NoopMetrics implements MetricsPort {
  public async timeDbOperation<T>(
    _operation: Parameters<MetricsPort['timeDbOperation']>[0],
    fn: () => Promise<T>,
  ): Promise<T> {
    return fn();
  }

  public setCircuitOpen(): void {}

  public recordBrasilApiRequest(): void {}

  public recordBrasilApiCache(): void {}

  public recordDomainError(): void {}

  public recordPendingRevalidateRun(): void {}

  public recordPendingRevalidateItem(): void {}
}
