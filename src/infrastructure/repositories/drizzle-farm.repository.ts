import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { Crop, Farm, Harvest } from '../../domain/entities/farm.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { FarmMapper } from '../database/mappers/producer.mapper.js';
import { farmCrops, farms, harvests } from '../database/schema/index.js';

type FarmRow = typeof farms.$inferSelect;

@Injectable()
export class DrizzleFarmRepository implements IFarmRepository {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async save(farm: Farm): Promise<Farm> {
    await this.db.transaction(async (tx) => {
      await tx.insert(farms).values(FarmMapper.toPersistence(farm));

      if (farm.harvests.length === 0) {
        return;
      }

      await tx.insert(harvests).values(
        farm.harvests.map((harvest) => ({
          id: harvest.id,
          farmId: farm.id,
          year: harvest.year,
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

  public async findByProducerId(producerId: string): Promise<Farm[]> {
    const rows = await this.db
      .select()
      .from(farms)
      .where(and(eq(farms.producerId, producerId), isNull(farms.deletedAt)));
    return this.hydrateMany(rows);
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.db
      .update(farms)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(eq(farms.id, id));
  }

  public async softDeleteByProducerId(
    producerId: string,
    deletedAt: Date,
  ): Promise<void> {
    await this.db
      .update(farms)
      .set({ deletedAt, updatedAt: deletedAt })
      .where(and(eq(farms.producerId, producerId), isNull(farms.deletedAt)));
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

    return rows.map((row) => {
      const farmHarvests = harvestRows
        .filter((harvest) => harvest.farmId === row.id)
        .map((harvest) =>
          Harvest.reconstitute(
            harvest.id,
            harvest.year,
            cropRows
              .filter((crop) => crop.harvestId === harvest.id)
              .map((crop) => Crop.reconstitute(crop.id, crop.cropName)),
          ),
        );

      return Farm.reconstitute({
        id: row.id,
        producerId: row.producerId,
        name: row.name,
        city: row.city,
        state: row.state,
        totalArea: Number(row.totalArea),
        arableArea: Number(row.arableArea),
        vegetationArea: Number(row.vegetationArea),
        harvests: farmHarvests,
        deletedAt: row.deletedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    });
  }
}
