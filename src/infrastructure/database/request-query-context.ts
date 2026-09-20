import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestQueryStore {
  queryCount: number;
  heapUsedStart: number;
}

const requestQueryContext = new AsyncLocalStorage<RequestQueryStore>();

export function isBenchInstrumentEnabled(): boolean {
  return process.env.BENCH_INSTRUMENT === '1';
}

export function trackDbRoundTrip(): void {
  const store = requestQueryContext.getStore();
  if (store) {
    store.queryCount += 1;
  }
}

export function getRequestQueryCount(): number {
  return requestQueryContext.getStore()?.queryCount ?? 0;
}

export function getRequestHeapDeltaMb(): number {
  const store = requestQueryContext.getStore();
  if (!store) {
    return 0;
  }
  const delta = process.memoryUsage().heapUsed - store.heapUsedStart;
  return Number((delta / (1024 * 1024)).toFixed(3));
}

export function runWithRequestQueryContext<T>(fn: () => T): T {
  return requestQueryContext.run(
    {
      queryCount: 0,
      heapUsedStart: process.memoryUsage().heapUsed,
    },
    fn,
  );
}
