import { AsyncLocalStorage } from 'node:async_hooks';
import type { DrizzleDb } from './database.module.js';

type DbClient = DrizzleDb | Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

const transactionContext = new AsyncLocalStorage<DbClient>();

export function getDbClient(fallback: DrizzleDb): DbClient {
  return transactionContext.getStore() ?? fallback;
}

export function isInTransaction(): boolean {
  return transactionContext.getStore() !== undefined;
}

export async function runInDbTransaction<T>(
  db: DrizzleDb,
  fn: () => Promise<T>,
): Promise<T> {
  if (isInTransaction()) {
    return fn();
  }
  return db.transaction(async (tx) => transactionContext.run(tx, fn));
}
