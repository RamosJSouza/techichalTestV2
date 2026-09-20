import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { Producer } from '../../domain/entities/producer.js';
import type {
  IProducerRepository,
  ProducerListItem,
  ProducerListQuery,
  ProducerListResult,
} from '../../domain/repositories/producer.repository.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import type { DrizzleDb } from '../database/database.module.js';
import { CRYPTO_SERVICE, DRIZZLE } from '../database/database.tokens.js';
import {
  FarmMapper,
  ProducerMapper,
} from '../database/mappers/producer.mapper.js';
import { mapPgIntegrityError } from '../database/pg-error.js';
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

    try {
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
    } catch (error) {
      mapPgIntegrityError(error, 'document');
    }

    return producer;
  }

  public async update(producer: Producer): Promise<Producer> {
    const persistence = ProducerMapper.toPersistence(producer, this.crypto);
    try {
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
    } catch (error) {
      mapPgIntegrityError(error, 'document');
    }
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
    const [hydrated] = await this.hydrateMany([row]);
    return hydrated ?? null;
  }

  public async findByDocumentHash(
    documentHash: string,
  ): Promise<Producer | null> {
    const [row] = await this.db
      .select()
      .from(producers)
      .where(
        and(
          eq(producers.documentHash, documentHash),
          isNull(producers.deletedAt),
        ),
      )
      .limit(1);
    if (!row) {
      return null;
    }
    const [hydrated] = await this.hydrateMany([row]);
    return hydrated ?? null;
  }

  public async findAll(): Promise<Producer[]> {
    const rows = await this.db
      .select()
      .from(producers)
      .where(isNull(producers.deletedAt));
    return this.hydrateMany(rows);
  }

  public async findMany(query: ProducerListQuery): Promise<ProducerListResult> {
    const conditions = [isNull(producers.deletedAt)];
    if (query.name) {
      const escaped = query.name
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      conditions.push(ilike(producers.name, `%${escaped}%`));
    }
    const whereClause = and(...conditions);

    const sortColumn =
      query.sortBy === 'name' ? producers.name : producers.createdAt;
    const primaryOrder =
      query.sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const offset = (query.page - 1) * query.pageSize;

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(producers)
      .where(whereClause);

    const rows = await this.db
      .select()
      .from(producers)
      .where(whereClause)
      .orderBy(primaryOrder, asc(producers.id))
      .limit(query.pageSize)
      .offset(offset);

    const items = await this.toListItems(rows);
    return {
      items,
      total: Number(totalRow?.value ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(producers)
        .set({
          deletedAt,
          updatedAt: deletedAt,
          documentHash: `del:${id}`,
        })
        .where(eq(producers.id, id));
      await tx
        .update(farms)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(and(eq(farms.producerId, id), isNull(farms.deletedAt)));
    });
  }

  private async toListItems(rows: ProducerRow[]): Promise<ProducerListItem[]> {
    if (rows.length === 0) {
      return [];
    }

    const producerIds = rows.map((row) => row.id);
    const aggRows = await this.db
      .select({
        producerId: farms.producerId,
        farmsCount: count(),
        totalAreaHa: sql<number>`coalesce(sum(${farms.totalArea})::float8, 0)`,
        arableAreaHa: sql<number>`coalesce(sum(${farms.arableArea})::float8, 0)`,
        vegetationAreaHa: sql<number>`coalesce(sum(${farms.vegetationArea})::float8, 0)`,
        farmStates: sql<string[]>`coalesce(
          array_agg(DISTINCT ${farms.state} ORDER BY ${farms.state}),
          '{}'::text[]
        )`,
      })
      .from(farms)
      .where(
        and(inArray(farms.producerId, producerIds), isNull(farms.deletedAt)),
      )
      .groupBy(farms.producerId);

    const byProducer = new Map(
      aggRows.map((row) => [row.producerId, row] as const),
    );

    return rows.map((row) => {
      const agg = byProducer.get(row.id);
      const states = Array.isArray(agg?.farmStates)
        ? [...agg.farmStates].filter(Boolean).sort()
        : [];
      return {
        id: row.id,
        name: row.name,
        documentDigits: this.crypto.decrypt(row.document),
        esgStatus: row.esgStatus,
        esgCheckedAt: row.esgCheckedAt,
        farmsCount: Number(agg?.farmsCount ?? 0),
        farmStates: states,
        totalAreaHa: Number(agg?.totalAreaHa ?? 0),
        arableAreaHa: Number(agg?.arableAreaHa ?? 0),
        vegetationAreaHa: Number(agg?.vegetationAreaHa ?? 0),
      };
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
