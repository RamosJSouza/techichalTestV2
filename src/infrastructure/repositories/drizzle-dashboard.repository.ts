import { Inject, Injectable } from '@nestjs/common';
import { and, avg, count, eq, isNotNull, isNull, sum } from 'drizzle-orm';
import type {
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';
import type { DrizzleDb } from '../database/database.module.js';
import { DRIZZLE } from '../database/database.tokens.js';
import { farmCrops, farms, harvests } from '../database/schema/index.js';

@Injectable()
export class DrizzleDashboardRepository implements IDashboardRepository {
  public constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public async getStats(): Promise<DashboardStats> {
    const [totalsRows, climateRows, byStateRows, byCropRows] =
      await Promise.all([
        this.db
          .select({
            totalFarms: count(farms.id),
            totalHectares: sum(farms.totalArea),
            arableHectares: sum(farms.arableArea),
            vegetationHectares: sum(farms.vegetationArea),
          })
          .from(farms)
          .where(isNull(farms.deletedAt)),
        this.db
          .select({
            averageScore: avg(farms.climateRiskScore),
            farmsWithScore: count(farms.id),
          })
          .from(farms)
          .where(
            and(isNull(farms.deletedAt), isNotNull(farms.climateRiskScore)),
          ),
        this.db
          .select({
            state: farms.state,
            count: count(farms.id),
            hectares: sum(farms.totalArea),
          })
          .from(farms)
          .where(isNull(farms.deletedAt))
          .groupBy(farms.state),
        this.db
          .select({
            crop: farmCrops.cropName,
            count: count(farmCrops.id),
          })
          .from(farmCrops)
          .innerJoin(harvests, eq(farmCrops.harvestId, harvests.id))
          .innerJoin(farms, eq(harvests.farmId, farms.id))
          // RF-02.4: só safras ACTIVE e fazendas não soft-deleted
          .where(and(isNull(farms.deletedAt), eq(harvests.status, 'ACTIVE')))
          .groupBy(farmCrops.cropName),
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

    const averageScore =
      climate?.averageScore === null || climate?.averageScore === undefined
        ? null
        : Number(Number(climate.averageScore).toFixed(2));

    return {
      totalFarms,
      totalHectares,
      byState: byStateRows.map((row) => {
        const hectares = Number(row.hectares ?? 0);
        return {
          state: row.state,
          count: Number(row.count),
          hectares,
          percentage:
            totalHectares === 0
              ? 0
              : Number(((hectares / totalHectares) * 100).toFixed(2)),
        };
      }),
      byCrop: byCropRows.map((row) => {
        const cropCount = Number(row.count);
        return {
          crop: row.crop,
          count: cropCount,
          percentage:
            cropTotal === 0
              ? 0
              : Number(((cropCount / cropTotal) * 100).toFixed(2)),
        };
      }),
      byLandUse: {
        arableHectares,
        vegetationHectares,
        arablePercentage:
          landTotal === 0
            ? 0
            : Number(((arableHectares / landTotal) * 100).toFixed(2)),
        vegetationPercentage:
          landTotal === 0
            ? 0
            : Number(((vegetationHectares / landTotal) * 100).toFixed(2)),
      },
      regionalClimateRisk: {
        averageScore,
        farmsWithScore: Number(climate?.farmsWithScore ?? 0),
      },
    };
  }
}
