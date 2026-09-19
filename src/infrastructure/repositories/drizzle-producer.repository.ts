import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { Producer } from '../../domain/entities/producer.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import type { DrizzleDb } from '../database/database.module.js';
import { CRYPTO_SERVICE, DRIZZLE } from '../database/database.tokens.js';
import { ProducerMapper } from '../database/mappers/producer.mapper.js';
import { farmCrops, farms, harvests, producers } from '../database/schema/index.js';

@Injectable()
export class DrizzleProducerRepository implements IProducerRepository {
  public constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(CRYPTO_SERVICE) private readonly crypto: CryptoService,
  ) {}

  public async save(producer: Producer): Promise<Producer> {
    const persistence = ProducerMapper.toPersistence(producer, this.crypto);

    await this.db.transaction(async (tx) => {
      await tx.insert(producers).values(persistence);

      for (const farm of producer.farms) {
        await tx.insert(farms).values({
          id: farm.id,
          producerId: farm.producerId,
          name: farm.name,
          city: farm.city,
          state: farm.state,
          totalArea: farm.area.totalArea.toFixed(2),
          arableArea: farm.area.arableArea.toFixed(2),
          vegetationArea: farm.area.vegetationArea.toFixed(2),
          createdAt: farm.createdAt,
          updatedAt: farm.updatedAt,
          deletedAt: farm.deletedAt,
        });

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
      }
    });

    return producer;
  }

  public async update(producer: Producer): Promise<Producer> {
    const persistence = ProducerMapper.toPersistence(producer, this.crypto);
    await this.db
      .update(producers)
      .set({
        name: persistence.name,
        document: persistence.document,
        documentHash: persistence.documentHash,
        updatedAt: persistence.updatedAt,
        deletedAt: persistence.deletedAt,
      })
      .where(eq(producers.id, producer.id));
    return producer;
  }

  public async findById(id: string): Promise<Producer | null> {
    const [row] = await this.db
      .select()
      .from(producers)
      .where(and(eq(producers.id, id), isNull(producers.deletedAt)))
      .limit(1);

    if (!row) {
      return null;
    }

    return this.hydrate(row);
  }

  public async findByDocumentHash(documentHash: string): Promise<Producer | null> {
    const [row] = await this.db
      .select()
      .from(producers)
      .where(
        and(eq(producers.documentHash, documentHash), isNull(producers.deletedAt)),
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return this.hydrate(row);
  }

  public async findAll(): Promise<Producer[]> {
    const rows = await this.db
      .select()
      .from(producers)
      .where(isNull(producers.deletedAt));

    const result: Producer[] = [];
    for (const row of rows) {
      result.push(await this.hydrate(row));
    }
    return result;
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(producers)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(eq(producers.id, id));
      await tx
        .update(farms)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(and(eq(farms.producerId, id), isNull(farms.deletedAt)));
    });
  }

  private async hydrate(
    row: typeof producers.$inferSelect,
  ): Promise<Producer> {
    const farmRows = await this.db
      .select()
      .from(farms)
      .where(and(eq(farms.producerId, row.id), isNull(farms.deletedAt)));

    const allHarvests: (typeof harvests.$inferSelect)[] = [];
    const allCrops: (typeof farmCrops.$inferSelect)[] = [];

    for (const farm of farmRows) {
      const farmHarvests = await this.db
        .select()
        .from(harvests)
        .where(eq(harvests.farmId, farm.id));
      allHarvests.push(...farmHarvests);

      for (const harvest of farmHarvests) {
        const crops = await this.db
          .select()
          .from(farmCrops)
          .where(eq(farmCrops.harvestId, harvest.id));
        allCrops.push(...crops);
      }
    }

    return ProducerMapper.toDomain(
      row,
      farmRows,
      allHarvests,
      allCrops,
      this.crypto,
    );
  }
}
