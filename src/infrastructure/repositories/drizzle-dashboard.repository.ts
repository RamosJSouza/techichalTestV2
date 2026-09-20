import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  avg,
  count,
  desc,
  eq,
  exists,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
  sum,
  type SQL,
} from 'drizzle-orm';
import type {
  DashboardFilters,
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import {
  farmCrops,
  farms,
  harvests,
  producers,
} from '../database/schema/index.js';

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function percentage(part: number, total: number): number {
  return total === 0 ? 0 : round2((part / total) * 100);
}

function nullableAvg(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return round2(Number(value));
}

@Injectable()
export class DrizzleDashboardRepository implements IDashboardRepository {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async getStats(
    filters: DashboardFilters = {},
  ): Promise<DashboardStats> {
    const farmWhere = this.buildFarmWhere(filters);
    const climateWhere = and(farmWhere, isNotNull(farms.climateRiskScore));
    const cropWhere = and(farmWhere, eq(harvests.status, 'ACTIVE'));
    const esgWhere = and(farmWhere, isNull(producers.deletedAt));

    const [
      totalsRows,
      climateRows,
      byStateRows,
      byCropRows,
      byCarStatusRows,
      byEsgStatusRows,
      climateByStateRows,
      climateByCropRows,
      cropsByYearRows,
      farmsByMonthRows,
      topCitiesRows,
    ] = await Promise.all([
      this.db
        .select({
          totalFarms: count(farms.id),
          totalHectares: sum(farms.totalArea),
          arableHectares: sum(farms.arableArea),
          vegetationHectares: sum(farms.vegetationArea),
        })
        .from(farms)
        .where(farmWhere),
      this.db
        .select({
          averageScore: avg(farms.climateRiskScore),
          farmsWithScore: count(farms.id),
        })
        .from(farms)
        .where(climateWhere),
      this.db
        .select({
          state: farms.state,
          count: count(farms.id),
          hectares: sum(farms.totalArea),
        })
        .from(farms)
        .where(farmWhere)
        .groupBy(farms.state),
      this.db
        .select({
          crop: farmCrops.cropName,
          count: count(farmCrops.id),
        })
        .from(farmCrops)
        .innerJoin(harvests, eq(farmCrops.harvestId, harvests.id))
        .innerJoin(farms, eq(harvests.farmId, farms.id))
        .where(cropWhere)
        .groupBy(farmCrops.cropName),
      this.db
        .select({
          status: farms.carStatus,
          count: count(farms.id),
        })
        .from(farms)
        .where(farmWhere)
        .groupBy(farms.carStatus),
      this.db
        .select({
          status: producers.esgStatus,
          count: count(sql`DISTINCT ${producers.id}`),
        })
        .from(farms)
        .innerJoin(producers, eq(farms.producerId, producers.id))
        .where(esgWhere)
        .groupBy(producers.esgStatus),
      this.db
        .select({
          state: farms.state,
          averageScore: avg(farms.climateRiskScore),
          farmsWithScore: count(farms.id),
        })
        .from(farms)
        .where(climateWhere)
        .groupBy(farms.state),
      this.db
        .select({
          crop: farmCrops.cropName,
          averageScore: avg(farms.climateRiskScore),
          farmsWithScore: count(sql`DISTINCT ${farms.id}`),
        })
        .from(farmCrops)
        .innerJoin(harvests, eq(farmCrops.harvestId, harvests.id))
        .innerJoin(farms, eq(harvests.farmId, farms.id))
        .where(and(cropWhere, isNotNull(farms.climateRiskScore)))
        .groupBy(farmCrops.cropName),
      this.db
        .select({
          year: harvests.year,
          crop: farmCrops.cropName,
          count: count(farmCrops.id),
        })
        .from(farmCrops)
        .innerJoin(harvests, eq(farmCrops.harvestId, harvests.id))
        .innerJoin(farms, eq(harvests.farmId, farms.id))
        .where(cropWhere)
        .groupBy(harvests.year, farmCrops.cropName),
      this.db
        .select({
          month: sql<string>`to_char(date_trunc('month', ${farms.createdAt}), 'YYYY-MM')`,
          farms: count(farms.id),
          hectares: sum(farms.totalArea),
        })
        .from(farms)
        .where(farmWhere)
        .groupBy(sql`date_trunc('month', ${farms.createdAt})`)
        .orderBy(sql`date_trunc('month', ${farms.createdAt})`),
      this.db
        .select({
          city: farms.city,
          state: farms.state,
          farms: count(farms.id),
          hectares: sum(farms.totalArea),
        })
        .from(farms)
        .where(farmWhere)
        .groupBy(farms.city, farms.state)
        .orderBy(desc(count(farms.id)))
        .limit(10),
    ]);

    const totals = totalsRows[0];
    const climate = climateRows[0];

    const totalFarms = Number(totals?.totalFarms ?? 0);
    const totalHectares = Number(totals?.totalHectares ?? 0);
    const arableHectares = Number(totals?.arableHectares ?? 0);
    const vegetationHectares = Number(totals?.vegetationHectares ?? 0);
    const landTotal = arableHectares + vegetationHectares;

    const cropTotal = byCropRows.reduce(
      (acc, row) => acc + Number(row.count),
      0,
    );

    const byCarStatus = byCarStatusRows.map((row) => {
      const carCount = Number(row.count);
      return {
        status: row.status ?? 'Sem CAR',
        count: carCount,
        percentage: percentage(carCount, totalFarms),
      };
    });

    const esgProducerTotal = byEsgStatusRows.reduce(
      (acc, row) => acc + Number(row.count),
      0,
    );
    const byEsgStatus = byEsgStatusRows.map((row) => {
      const esgCount = Number(row.count);
      return {
        status: row.status,
        count: esgCount,
        percentage: percentage(esgCount, esgProducerTotal),
      };
    });

    const activeCarCount = byCarStatus
      .filter((item) => item.status === 'ACTIVE')
      .reduce((acc, item) => acc + item.count, 0);
    const approvedEsgCount = byEsgStatus
      .filter((item) => item.status === 'APPROVED')
      .reduce((acc, item) => acc + item.count, 0);

    return {
      totalFarms,
      totalHectares,
      averageFarmSize:
        totalFarms === 0 ? 0 : round2(totalHectares / totalFarms),
      carComplianceRate: percentage(activeCarCount, totalFarms),
      esgComplianceRate: percentage(approvedEsgCount, esgProducerTotal),
      byState: byStateRows.map((row) => {
        const hectares = Number(row.hectares ?? 0);
        return {
          state: row.state,
          count: Number(row.count),
          hectares,
          percentage: percentage(hectares, totalHectares),
        };
      }),
      byCrop: byCropRows.map((row) => {
        const cropCount = Number(row.count);
        return {
          crop: row.crop,
          count: cropCount,
          percentage: percentage(cropCount, cropTotal),
        };
      }),
      byLandUse: {
        arableHectares,
        vegetationHectares,
        arablePercentage: percentage(arableHectares, landTotal),
        vegetationPercentage: percentage(vegetationHectares, landTotal),
      },
      regionalClimateRisk: {
        averageScore: nullableAvg(climate?.averageScore),
        farmsWithScore: Number(climate?.farmsWithScore ?? 0),
      },
      byCarStatus,
      byEsgStatus,
      climateRiskByState: climateByStateRows.map((row) => ({
        state: row.state,
        averageScore: nullableAvg(row.averageScore),
        farmsWithScore: Number(row.farmsWithScore),
      })),
      climateRiskByCrop: climateByCropRows.map((row) => ({
        crop: row.crop,
        averageScore: nullableAvg(row.averageScore),
        farmsWithScore: Number(row.farmsWithScore),
      })),
      cropsByYear: cropsByYearRows.map((row) => ({
        year: row.year,
        crop: row.crop,
        count: Number(row.count),
      })),
      farmsByMonth: farmsByMonthRows.map((row) => ({
        month: row.month,
        farms: Number(row.farms),
        hectares: Number(row.hectares ?? 0),
      })),
      topCities: topCitiesRows.map((row) => ({
        city: row.city,
        state: row.state,
        farms: Number(row.farms),
        hectares: Number(row.hectares ?? 0),
      })),
    };
  }

  private buildFarmWhere(filters: DashboardFilters): SQL {
    const conditions: SQL[] = [isNull(farms.deletedAt)];

    if (filters.state) {
      conditions.push(eq(farms.state, filters.state.toUpperCase()));
    }
    if (filters.carStatus) {
      conditions.push(eq(farms.carStatus, filters.carStatus));
    }
    if (filters.minClimateRisk !== undefined) {
      conditions.push(
        gte(farms.climateRiskScore, String(filters.minClimateRisk)),
      );
    }
    if (filters.maxClimateRisk !== undefined) {
      conditions.push(
        lte(farms.climateRiskScore, String(filters.maxClimateRisk)),
      );
    }
    if (filters.esgStatus) {
      conditions.push(
        exists(
          this.db
            .select({ id: producers.id })
            .from(producers)
            .where(
              and(
                eq(producers.id, farms.producerId),
                eq(producers.esgStatus, filters.esgStatus),
                isNull(producers.deletedAt),
              ),
            ),
        ),
      );
    }
    if (filters.crop || filters.harvestYear) {
      const harvestConditions: SQL[] = [
        eq(harvests.farmId, farms.id),
        eq(harvests.status, 'ACTIVE'),
      ];
      if (filters.harvestYear) {
        harvestConditions.push(eq(harvests.year, filters.harvestYear));
      }
      if (filters.crop) {
        conditions.push(
          exists(
            this.db
              .select({ id: farmCrops.id })
              .from(farmCrops)
              .innerJoin(harvests, eq(farmCrops.harvestId, harvests.id))
              .where(
                and(...harvestConditions, eq(farmCrops.cropName, filters.crop)),
              ),
          ),
        );
      } else {
        conditions.push(
          exists(
            this.db
              .select({ id: harvests.id })
              .from(harvests)
              .where(and(...harvestConditions)),
          ),
        );
      }
    }

    return and(...conditions)!;
  }
}
