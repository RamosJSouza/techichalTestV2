import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import type {
  MetricsDbOperation,
  MetricsPort,
} from '../../application/services/metrics.port.js';
import { Farm } from '../../domain/entities/farm.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type {
  FarmUpdateOptions,
  IFarmRepository,
} from '../../domain/repositories/farm.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { FarmMapper } from '../database/mappers/producer.mapper.js';
import { mapPgIntegrityError } from '../database/pg-error.js';
import { farmCrops, farms, harvests } from '../database/schema/index.js';
import {
  getDbClient,
  isInTransaction,
} from '../database/transaction-context.js';
import { MetricsService } from '../observability/metrics.service.js';

type FarmRow = typeof farms.$inferSelect;
type DbClient = ReturnType<typeof getDbClient>;
type DbTransaction = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

@Injectable()
export class DrizzleFarmRepository implements IFarmRepository {
  public constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(MetricsService) private readonly metrics: MetricsPort,
  ) {}

  public async save(farm: Farm): Promise<Farm> {
    return this.timed('farm_save', async () => {
      try {
        await this.withTx(async (tx) => {
          await tx.insert(farms).values(FarmMapper.toPersistence(farm));
          await this.insertHarvestsAndCrops(tx, farm);
        });
      } catch (error) {
        mapPgIntegrityError(error, 'generic');
      }

      return farm;
    });
  }

  public async update(
    farm: Farm,
    opts: FarmUpdateOptions = {},
  ): Promise<Farm> {
    return this.timed('farm_update', async () => {
      const persistence = FarmMapper.toPersistence(farm);
      const harvestsChanged = opts.harvestsChanged === true;
      const optimistic = opts.expectedUpdatedAt !== undefined;
      try {
        await this.withTx(async (tx) => {
          const conditions = [eq(farms.id, farm.id)];
          if (optimistic) {
            conditions.push(eq(farms.updatedAt, opts.expectedUpdatedAt!));
          }

          const updated = await tx
            .update(farms)
            .set({
              name: persistence.name,
              city: persistence.city,
              state: persistence.state,
              totalArea: persistence.totalArea,
              arableArea: persistence.arableArea,
              vegetationArea: persistence.vegetationArea,
              carNumber: persistence.carNumber,
              carStatus: persistence.carStatus,
              climateRiskScore: persistence.climateRiskScore,
              territorialValidationStatus:
                persistence.territorialValidationStatus,
              territorialValidationPendingAt:
                persistence.territorialValidationPendingAt,
              territorialValidationPendingReason:
                persistence.territorialValidationPendingReason,
              updatedAt: persistence.updatedAt,
              deletedAt: persistence.deletedAt,
            })
            .where(and(...conditions))
            .returning({ id: farms.id });

          if (updated.length === 0) {
            if (optimistic) {
              throw new ConflictException(
                'Fazenda foi alterada por outra requisição. Recarregue e tente novamente.',
              );
            }
            throw new NotFoundException(`Fazenda ${farm.id} não encontrada.`);
          }

          if (!harvestsChanged) {
            return;
          }

          const existingHarvests = await tx
            .select({ id: harvests.id })
            .from(harvests)
            .where(eq(harvests.farmId, farm.id));
          const existingHarvestIds = existingHarvests.map((row) => row.id);

          if (existingHarvestIds.length > 0) {
            await tx
              .delete(farmCrops)
              .where(inArray(farmCrops.harvestId, existingHarvestIds));
            await tx.delete(harvests).where(eq(harvests.farmId, farm.id));
          }

          await this.insertHarvestsAndCrops(tx, farm);
        });
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
        mapPgIntegrityError(error, 'generic');
      }
      return farm;
    });
  }

  public async findById(id: string): Promise<Farm | null> {
    return this.timed('farm_find_by_id', async () => {
      const client = getDbClient(this.db);
      const [row] = await client
        .select()
        .from(farms)
        .where(and(eq(farms.id, id), isNull(farms.deletedAt)))
        .limit(1);

      if (!row) {
        return null;
      }

      const [farm] = await this.hydrateMany([row]);
      return farm ?? null;
    });
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.timed('farm_soft_delete', async () => {
      const client = getDbClient(this.db);
      await client
        .update(farms)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(eq(farms.id, id));
    });
  }

  public async findPendingTerritorialIds(limit: number): Promise<string[]> {
    const capped = Math.max(1, Math.min(limit, 500));
    const client = getDbClient(this.db);
    const rows = await client
      .select({ id: farms.id })
      .from(farms)
      .where(
        and(
          isNull(farms.deletedAt),
          eq(
            farms.territorialValidationStatus,
            'PENDING_EXTERNAL_VALIDATION',
          ),
        ),
      )
      .orderBy(
        asc(farms.territorialValidationPendingAt),
        asc(farms.createdAt),
      )
      .limit(capped);
    return rows.map((row) => row.id);
  }

  private async withTx(
    fn: (tx: DbTransaction) => Promise<void>,
  ): Promise<void> {
    if (isInTransaction()) {
      await fn(getDbClient(this.db) as DbTransaction);
      return;
    }
    await this.db.transaction(async (tx) => {
      await fn(tx);
    });
  }

  private async timed<T>(
    operation: MetricsDbOperation,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.metrics.timeDbOperation(operation, fn);
  }

  private async hydrateMany(rows: FarmRow[]): Promise<Farm[]> {
    if (rows.length === 0) {
      return [];
    }

    const client = getDbClient(this.db);
    const farmIds = rows.map((row) => row.id);
    const harvestRows = await client
      .select()
      .from(harvests)
      .where(inArray(harvests.farmId, farmIds));

    const harvestIds = harvestRows.map((harvest) => harvest.id);
    const cropRows =
      harvestIds.length === 0
        ? []
        : await client
            .select()
            .from(farmCrops)
            .where(inArray(farmCrops.harvestId, harvestIds));

    return rows.map((row) =>
      FarmMapper.toDomain(row, harvestRows, cropRows),
    );
  }

  private async insertHarvestsAndCrops(
    tx: DbClient,
    farm: Farm,
  ): Promise<void> {
    if (farm.harvests.length === 0) {
      return;
    }

    await tx.insert(harvests).values(
      farm.harvests.map((harvest) => ({
        id: harvest.id,
        farmId: farm.id,
        year: harvest.year,
        status: harvest.status,
        createdAt: farm.createdAt,
      })),
    );

    const cropValues = farm.harvests.flatMap((harvest) =>
      harvest.crops.map((crop) => ({
        id: crop.id,
        harvestId: harvest.id,
        cropName: crop.name,
      })),
    );
    if (cropValues.length > 0) {
      await tx.insert(farmCrops).values(cropValues);
    }
  }
}
