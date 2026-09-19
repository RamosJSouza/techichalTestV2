import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { Producer } from '../../domain/entities/producer.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import type { DrizzleDb } from '../database/database.module.js';
import { CRYPTO_SERVICE, DRIZZLE } from '../database/database.tokens.js';
import {
  FarmMapper,
  ProducerMapper,
} from '../database/mappers/producer.mapper.js';
import {
  farmCrops,
  farms,
  harvests,
  producers,
} from '../database/schema/index.js';

type ProducerRow = typeof producers.$inferSelect;

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

      if (producer.farms.length === 0) {
        return;
      }

      await tx
        .insert(farms)
        .values(producer.farms.map((farm) => FarmMapper.toPersistence(farm)));

      const harvestValues = producer.farms.flatMap((farm) =>
        farm.harvests.map((harvest) => ({
          id: harvest.id,
          farmId: farm.id,
          year: harvest.year,
          status: harvest.status,
          createdAt: farm.createdAt,
        })),
      );
      if (harvestValues.length > 0) {
        await tx.insert(harvests).values(harvestValues);
      }

      const cropValues = producer.farms.flatMap((farm) =>
        farm.harvests.flatMap((harvest) =>
          harvest.crops.map((crop) => ({
            id: crop.id,
            harvestId: harvest.id,
            cropName: crop.name,
          })),
        ),
      );
      if (cropValues.length > 0) {
        await tx.insert(farmCrops).values(cropValues);
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
        esgStatus: persistence.esgStatus,
        esgCheckedAt: persistence.esgCheckedAt,
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

    const [producer] = await this.hydrateMany([row]);
    return producer ?? null;
  }

  public async findByDocumentHash(
    documentHash: string,
  ): Promise<Producer | null> {
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

    const [producer] = await this.hydrateMany([row]);
    return producer ?? null;
  }

  public async findAll(): Promise<Producer[]> {
    const rows = await this.db
      .select()
      .from(producers)
      .where(isNull(producers.deletedAt));
    return this.hydrateMany(rows);
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

  private async hydrateMany(rows: ProducerRow[]): Promise<Producer[]> {
    if (rows.length === 0) {
      return [];
    }

    const producerIds = rows.map((row) => row.id);
    const farmRows = await this.db
      .select()
      .from(farms)
      .where(
        and(inArray(farms.producerId, producerIds), isNull(farms.deletedAt)),
      );

    const farmIds = farmRows.map((farm) => farm.id);
    const harvestRows =
      farmIds.length === 0
        ? []
        : await this.db
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
      ProducerMapper.toDomain(
        row,
        farmRows.filter((farm) => farm.producerId === row.id),
        harvestRows,
        cropRows,
        this.crypto,
      ),
    );
  }
}
