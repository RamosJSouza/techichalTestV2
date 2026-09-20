import type {
  MetricsDbOperation,
  MetricsPort,
} from '../application/services/metrics.port.js';

export class NoopMetrics implements MetricsPort {
  public async timeDbOperation<T>(
    _operation: MetricsDbOperation,
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
