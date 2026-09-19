import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { Farm } from '../../domain/entities/farm.js';
import type {
  FarmUpdateOptions,
  IFarmRepository,
} from '../../domain/repositories/farm.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { FarmMapper } from '../database/mappers/producer.mapper.js';
import { farmCrops, farms, harvests } from '../database/schema/index.js';

type FarmRow = typeof farms.$inferSelect;
type DbTransaction = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

@Injectable()
export class DrizzleFarmRepository implements IFarmRepository {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async save(farm: Farm): Promise<Farm> {
    await this.db.transaction(async (tx) => {
      await tx.insert(farms).values(FarmMapper.toPersistence(farm));
      await this.insertHarvestsAndCrops(tx, farm);
    });

    return farm;
  }

  public async update(
    farm: Farm,
    opts: FarmUpdateOptions = { harvestsChanged: true },
  ): Promise<Farm> {
    const persistence = FarmMapper.toPersistence(farm);
    await this.db.transaction(async (tx) => {
      await tx
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
          updatedAt: persistence.updatedAt,
          deletedAt: persistence.deletedAt,
        })
        .where(eq(farms.id, farm.id));

      // Pula delete+insert quando as safras não mudaram (ex.: só nome/CAR/área).
      if (opts.harvestsChanged === false) {
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
    return farm;
  }

  public async findById(id: string): Promise<Farm | null> {
    const [row] = await this.db
      .select()
      .from(farms)
      .where(and(eq(farms.id, id), isNull(farms.deletedAt)))
      .limit(1);

    if (!row) {
      return null;
    }

    const [farm] = await this.hydrateMany([row]);
    return farm ?? null;
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.db
      .update(farms)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(farms.id, id));
  }

  private async hydrateMany(rows: FarmRow[]): Promise<Farm[]> {
    if (rows.length === 0) {
      return [];
    }

    const farmIds = rows.map((row) => row.id);
    const harvestRows = await this.db
      .select()
      .from(harvests)
      .where(inArray(harvests.farmId, farmIds));

    const harvestIds = harvestRows.map((harvest) => harvest.id);
    const cropRows =
      harvestIds.length === 0
        ? []
        : await this.db
            .select()
            .from(farmCrops)
            .where(inArray(farmCrops.harvestId, harvestIds));

    return rows.map((row) =>
      FarmMapper.toDomain(row, harvestRows, cropRows),
    );
  }

  private async insertHarvestsAndCrops(
    tx: DbTransaction,
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
