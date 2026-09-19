import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Crop, Farm, Harvest } from '../../domain/entities/farm.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { FarmMapper } from '../database/mappers/producer.mapper.js';
import { farmCrops, farms, harvests } from '../database/schema/index.js';

@Injectable()
export class DrizzleFarmRepository implements IFarmRepository {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async save(farm: Farm): Promise<Farm> {
    await this.db.transaction(async (tx) => {
      await tx.insert(farms).values(FarmMapper.toPersistence(farm));

      for (const harvest of farm.harvests) {
        await tx.insert(harvests).values({
          id: harvest.id,
          farmId: farm.id,
          year: harvest.year,
          createdAt: farm.createdAt,
        });

        for (const crop of harvest.crops) {
          await tx.insert(farmCrops).values({
            id: crop.id,
            harvestId: harvest.id,
            cropName: crop.name,
          });
        }
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

    return this.hydrate(row);
  }

  public async findByProducerId(producerId: string): Promise<Farm[]> {
    const rows = await this.db
      .select()
      .from(farms)
      .where(and(eq(farms.producerId, producerId), isNull(farms.deletedAt)));

    const result: Farm[] = [];
    for (const row of rows) {
      result.push(await this.hydrate(row));
    }
    return result;
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

  private async hydrate(row: typeof farms.$inferSelect): Promise<Farm> {
    const harvestRows = await this.db
      .select()
      .from(harvests)
      .where(eq(harvests.farmId, row.id));

    const domainHarvests: Harvest[] = [];
    for (const harvest of harvestRows) {
      const cropRows = await this.db
        .select()
        .from(farmCrops)
        .where(eq(farmCrops.harvestId, harvest.id));
      domainHarvests.push(
        Harvest.reconstitute(
          harvest.id,
          harvest.year,
          cropRows.map((c) => Crop.reconstitute(c.id, c.cropName)),
        ),
      );
    }

    return Farm.reconstitute({
      id: row.id,
      producerId: row.producerId,
      name: row.name,
      city: row.city,
      state: row.state,
      totalArea: Number(row.totalArea),
      arableArea: Number(row.arableArea),
      vegetationArea: Number(row.vegetationArea),
      harvests: domainHarvests,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
