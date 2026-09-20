export type MetricsBrasilApiOperation = 'cnpj' | 'city' | 'cities';

export type MetricsCircuitBreakerName = MetricsBrasilApiOperation;

export type MetricsBrasilApiResultLabel =
  | 'success'
  | 'fallback'
  | 'rejected'
  | 'error';

export type MetricsBrasilApiCacheResult = 'hit' | 'miss' | 'expired';

export type MetricsDbOperation =
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

export interface MetricsPort {
  timeDbOperation<T>(
    operation: MetricsDbOperation,
    fn: () => Promise<T>,
  ): Promise<T>;

  setCircuitOpen(name: MetricsCircuitBreakerName, open: boolean): void;

  recordBrasilApiRequest(
    operation: MetricsBrasilApiOperation,
    result: MetricsBrasilApiResultLabel,
    durationSeconds: number,
  ): void;

  recordBrasilApiCache(
    operation: MetricsBrasilApiOperation,
    result: MetricsBrasilApiCacheResult,
  ): void;

  recordDomainError(code: string): void;

  recordPendingRevalidateRun(result: string): void;

  recordPendingRevalidateItem(resource: string, result: string): void;
}
