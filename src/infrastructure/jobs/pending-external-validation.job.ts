import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import type { LoggerPort } from '../../application/services/logger.port.js';
import type { MetricsPort } from '../../application/services/metrics.port.js';
import { RevalidateFarmTerritorialUseCase } from '../../application/use-cases/revalidate-farm-territorial.use-case.js';
import { RevalidateProducerDocumentUseCase } from '../../application/use-cases/revalidate-producer-document.use-case.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import {
  type PostgresSql,
  withSessionAdvisoryLock,
} from '../database/advisory-lock.js';

@Injectable()
export class PendingExternalValidationJob
  implements OnModuleInit, OnModuleDestroy
{
  private readonly nestLogger = new Logger(PendingExternalValidationJob.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  public constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly producers: IProducerRepository,
    private readonly farms: IFarmRepository,
    private readonly revalidateProducer: RevalidateProducerDocumentUseCase,
    private readonly revalidateFarm: RevalidateFarmTerritorialUseCase,
    private readonly logger: LoggerPort,
    private readonly metrics: MetricsPort,
    private readonly sql: PostgresSql,
  ) {}

  public onModuleInit(): void {
    const flag = this.config.get('REVALIDATE_PENDING_ENABLED', { infer: true });
    const enabled = flag !== '0' && flag !== 'false';
    if (!enabled) {
      this.metrics.recordPendingRevalidateRun('disabled');
      this.logger.log('Pending external validation job disabled');
      return;
    }
    const intervalMs = this.config.get('REVALIDATE_PENDING_INTERVAL_MS', {
      infer: true,
    });
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
    this.logger.log(
      `Pending external validation job started (interval=${intervalMs}ms)`,
    );
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    let producerOk = 0;
    let producerErr = 0;
    let farmOk = 0;
    let farmErr = 0;
    try {
      const batchSize = this.config.get('REVALIDATE_PENDING_BATCH_SIZE', {
        infer: true,
      });
      const producerIds =
        await this.producers.findPendingDocumentIds(batchSize);
      for (const id of producerIds) {
        const lockKey = `revalidate:producer:${id}`;
        try {
          const outcome = await withSessionAdvisoryLock(
            this.sql,
            lockKey,
            async () => {
              await this.revalidateProducer.execute(id, 'job');
            },
          );
          if (!outcome.claimed) {
            continue;
          }
          producerOk += 1;
          this.metrics.recordPendingRevalidateItem('producer', 'ok');
        } catch (err) {
          producerErr += 1;
          this.metrics.recordPendingRevalidateItem('producer', 'error');
          this.logger.warn(
            `Job revalidate producer item failed: ${err instanceof Error ? err.name : 'unknown'}`,
          );
        }
      }
      const farmIds = await this.farms.findPendingTerritorialIds(batchSize);
      for (const id of farmIds) {
        const lockKey = `revalidate:farm:${id}`;
        try {
          const outcome = await withSessionAdvisoryLock(
            this.sql,
            lockKey,
            async () => {
              await this.revalidateFarm.execute(id, 'job');
            },
          );
          if (!outcome.claimed) {
            continue;
          }
          farmOk += 1;
          this.metrics.recordPendingRevalidateItem('farm', 'ok');
        } catch (err) {
          farmErr += 1;
          this.metrics.recordPendingRevalidateItem('farm', 'error');
          this.logger.warn(
            `Job revalidate farm item failed: ${err instanceof Error ? err.name : 'unknown'}`,
          );
        }
      }
      const errors = producerErr + farmErr;
      this.metrics.recordPendingRevalidateRun(errors > 0 ? 'error' : 'ok');
      this.nestLogger.log({
        job: 'pending_external_validation',
        producers: producerOk + producerErr,
        farms: farmOk + farmErr,
        producerOk,
        farmOk,
        errors,
      });
    } catch (err) {
      this.metrics.recordPendingRevalidateRun('error');
      this.logger.error(
        `Pending external validation job tick failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
