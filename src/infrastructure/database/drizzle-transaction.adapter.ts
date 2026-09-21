import { Inject, Injectable } from '@nestjs/common';
import type { TransactionPort } from '../../application/services/transaction.port.js';
import type { DrizzleDb } from './database.module.js';
import { DRIZZLE } from './database.tokens.js';
import { runInDbTransaction } from './transaction-context.js';

@Injectable()
export class DrizzleTransactionAdapter implements TransactionPort {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public run<T>(fn: () => Promise<T>): Promise<T> {
    return runInDbTransaction(this.db, fn);
  }
}
