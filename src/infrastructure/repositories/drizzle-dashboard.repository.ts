import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  eq,
  exists,
  gte,
  isNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import type {
  MetricsDbOperation,
  MetricsPort,
} from '../../application/services/metrics.port.js';
import type {
  DashboardAnalytics,
  DashboardFilters,
  DashboardStats,
  DashboardSummary,
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
import { trackDbRoundTrip } from '../database/request-query-context.js';
import { MetricsService } from '../observability/metrics.service.js';

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

function asRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result as Record<string, unknown>[];
  }
  return [];
}

@Injectable()
export class DrizzleDashboardRepository implements IDashboardRepository {
  private readonly cacheTtlMs = Number(
    process.env.DASHBOARD_STATS_CACHE_TTL_MS ?? '5000',
  );
  private readonly statsCache = new Map<
    string,
    { at: number; value: DashboardStats }
  >();
  private readonly summaryCache = new Map<
    string,
    { at: number; value: DashboardSummary }
  >();
  private readonly analyticsCache = new Map<
    string,
    { at: number; value: DashboardAnalytics }
  >();
  private readonly statsInflight = new Map<string, Promise<DashboardStats>>();
  private readonly summaryInflight = new Map<
    string,
    Promise<DashboardSummary>
  >();
  private readonly analyticsInflight = new Map<
    string,
    Promise<DashboardAnalytics>
  >();

  public constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(MetricsService) private readonly metrics: MetricsPort,
  ) {}

  public async getStats(
    filters: DashboardFilters = {},
  ): Promise<DashboardStats> {
    return this.timed('dashboard_stats', async () => {
      const key = this.cacheKey(filters);
      const cached = this.readCache(this.statsCache, key);
      if (cached) {
        return cached;
      }
      const pending = this.statsInflight.get(key);
      if (pending) {
        return pending;
      }
      const promise = this.loadStats(filters).finally(() => {
        this.statsInflight.delete(key);
      });
      this.statsInflight.set(key, promise);
      return promise;
    });
  }

  public async getSummary(
    filters: DashboardFilters = {},
  ): Promise<DashboardSummary> {
    return this.timed('dashboard_summary', async () => {
      const key = this.cacheKey(filters);
      const cached = this.readCache(this.summaryCache, key);
      if (cached) {
        return cached;
      }
      const pending = this.summaryInflight.get(key);
      if (pending) {
        return pending;
      }
      const promise = this.loadSummary(filters).finally(() => {
        this.summaryInflight.delete(key);
      });
      this.summaryInflight.set(key, promise);
      return promise;
    });
  }

  public async getAnalytics(
    filters: DashboardFilters = {},
  ): Promise<DashboardAnalytics> {
    return this.timed('dashboard_analytics', async () => {
      const key = this.cacheKey(filters);
      const cached = this.readCache(this.analyticsCache, key);
      if (cached) {
        return cached;
      }
      const pending = this.analyticsInflight.get(key);
      if (pending) {
        return pending;
      }
      const promise = this.loadAnalytics(filters).finally(() => {
        this.analyticsInflight.delete(key);
      });
      this.analyticsInflight.set(key, promise);
      return promise;
    });
  }

  private async timed<T>(
    operation: MetricsDbOperation,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.metrics.timeDbOperation(operation, fn);
  }

  private async loadStats(
    filters: DashboardFilters,
  ): Promise<DashboardStats> {
    const key = this.cacheKey(filters);
    const [farmsPack, cropsPack, esgRows] = await Promise.all([
      this.queryFarmsPack(filters, 'full'),
      this.queryCropsPack(filters, 'full'),
      this.queryEsg(filters),
    ]);
    const stats = this.assembleStats(farmsPack, cropsPack, esgRows);
    this.writeCache(this.statsCache, key, stats);
    return stats;
  }

  private async loadSummary(
    filters: DashboardFilters,
  ): Promise<DashboardSummary> {
    const key = this.cacheKey(filters);
    const [farmsPack, cropsPack, esgRows] = await Promise.all([
      this.queryFarmsPack(filters, 'summary'),
      this.queryCropsPack(filters, 'summary'),
      this.queryEsg(filters),
    ]);
    const stats = this.assembleStats(farmsPack, cropsPack, esgRows);
    const summary: DashboardSummary = {
      totalFarms: stats.totalFarms,
      totalHectares: stats.totalHectares,
      averageFarmSize: stats.averageFarmSize,
      carComplianceRate: stats.carComplianceRate,
      esgComplianceRate: stats.esgComplianceRate,
      byState: stats.byState,
      byCrop: stats.byCrop,
      byLandUse: stats.byLandUse,
      regionalClimateRisk: stats.regionalClimateRisk,
      byCarStatus: stats.byCarStatus,
      byEsgStatus: stats.byEsgStatus,
    };
    this.writeCache(this.summaryCache, key, summary);
    return summary;
  }

  private async loadAnalytics(
    filters: DashboardFilters,
  ): Promise<DashboardAnalytics> {
    const key = this.cacheKey(filters);
    const [farmsPack, cropsPack] = await Promise.all([
      this.queryFarmsPack(filters, 'analytics'),
      this.queryCropsPack(filters, 'analytics'),
    ]);
    const analytics: DashboardAnalytics = {
      climateRiskByState: farmsPack.climateByState,
      climateRiskByCrop: cropsPack.climateByCrop,
      cropsByYear: cropsPack.cropsByYear,
      farmsByMonth: farmsPack.farmsByMonth,
      topCities: farmsPack.topCities,
    };
    this.writeCache(this.analyticsCache, key, analytics);
    return analytics;
  }

  private cacheKey(filters: DashboardFilters): string {
    return JSON.stringify({
      state: filters.state ?? null,
      crop: filters.crop ?? null,
      harvestYear: filters.harvestYear ?? null,
      esgStatus: filters.esgStatus ?? null,
      carStatus: filters.carStatus ?? null,
      minClimateRisk: filters.minClimateRisk ?? null,
      maxClimateRisk: filters.maxClimateRisk ?? null,
    });
  }

  private readCache<T>(
    store: Map<string, { at: number; value: T }>,
    key: string,
  ): T | null {
    if (this.cacheTtlMs <= 0) {
      return null;
    }
    const hit = store.get(key);
    if (!hit) {
      return null;
    }
    if (Date.now() - hit.at > this.cacheTtlMs) {
      store.delete(key);
      return null;
    }
    return hit.value;
  }

  private writeCache<T>(
    store: Map<string, { at: number; value: T }>,
    key: string,
    value: T,
  ): void {
    if (this.cacheTtlMs <= 0) {
      return;
    }
    store.set(key, { at: Date.now(), value });
  }

  private async queryFarmsPack(
    filters: DashboardFilters,
    mode: 'full' | 'summary' | 'analytics',
  ): Promise<{
    totals: {
      totalFarms: number;
      totalHectares: number;
      arableHectares: number;
      vegetationHectares: number;
      climateAvg: number | null;
      climateCount: number;
    };
    byState: { state: string; count: number; hectares: number }[];
    byCar: { status: string | null; count: number }[];
    climateByState: {
      state: string;
      averageScore: number | null;
      farmsWithScore: number;
    }[];
    farmsByMonth: { month: string; farms: number; hectares: number }[];
    topCities: {
      city: string;
      state: string;
      farms: number;
      hectares: number;
    }[];
  }> {
    const farmWhere = this.buildFarmWhere(filters);
    const wantSummaryCore = mode === 'full' || mode === 'summary';
    const wantAnalytics = mode === 'full' || mode === 'analytics';

    trackDbRoundTrip();
    const result = await this.db.execute(sql`
      WITH f AS (
        SELECT
          id,
          state,
          city,
          total_area,
          arable_area,
          vegetation_area,
          car_status,
          climate_risk_score,
          created_at
        FROM ${farms}
        WHERE ${farmWhere}
      )
      SELECT
        ${
          wantSummaryCore
            ? sql`
        (SELECT count(*)::int FROM f) AS total_farms,
        (SELECT coalesce(sum(total_area), 0)::float8 FROM f) AS total_hectares,
        (SELECT coalesce(sum(arable_area), 0)::float8 FROM f) AS arable_hectares,
        (SELECT coalesce(sum(vegetation_area), 0)::float8 FROM f) AS vegetation_hectares,
        (SELECT avg(climate_risk_score)::float8 FROM f WHERE climate_risk_score IS NOT NULL) AS climate_avg,
        (SELECT count(*)::int FROM f WHERE climate_risk_score IS NOT NULL) AS climate_count,
        coalesce((
          SELECT json_agg(row_to_json(s) ORDER BY s.state)
          FROM (
            SELECT state, count(*)::int AS count, coalesce(sum(total_area), 0)::float8 AS hectares
            FROM f GROUP BY state
          ) s
        ), '[]'::json) AS by_state,
        coalesce((
          SELECT json_agg(row_to_json(c))
          FROM (
            SELECT car_status AS status, count(*)::int AS count
            FROM f GROUP BY car_status
          ) c
        ), '[]'::json) AS by_car
            `
            : sql`
        0::int AS total_farms,
        0::float8 AS total_hectares,
        0::float8 AS arable_hectares,
        0::float8 AS vegetation_hectares,
        NULL::float8 AS climate_avg,
        0::int AS climate_count,
        '[]'::json AS by_state,
        '[]'::json AS by_car
            `
        },
        ${
          wantAnalytics
            ? sql`
        coalesce((
          SELECT json_agg(row_to_json(cs) ORDER BY cs.state)
          FROM (
            SELECT
              state,
              avg(climate_risk_score)::float8 AS "averageScore",
              count(*)::int AS "farmsWithScore"
            FROM f
            WHERE climate_risk_score IS NOT NULL
            GROUP BY state
          ) cs
        ), '[]'::json) AS climate_by_state,
        coalesce((
          SELECT json_agg(row_to_json(m) ORDER BY m.month)
          FROM (
            SELECT
              to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
              count(*)::int AS farms,
              coalesce(sum(total_area), 0)::float8 AS hectares
            FROM f
            GROUP BY date_trunc('month', created_at)
          ) m
        ), '[]'::json) AS farms_by_month,
        coalesce((
          SELECT json_agg(row_to_json(t))
          FROM (
            SELECT
              city,
              state,
              count(*)::int AS farms,
              coalesce(sum(total_area), 0)::float8 AS hectares
            FROM f
            GROUP BY city, state
            ORDER BY count(*) DESC
            LIMIT 10
          ) t
        ), '[]'::json) AS top_cities
            `
            : sql`
        '[]'::json AS climate_by_state,
        '[]'::json AS farms_by_month,
        '[]'::json AS top_cities
            `
        }
    `);

    const row = asRows(result)[0] ?? {};
    return {
      totals: {
        totalFarms: Number(row.total_farms ?? 0),
        totalHectares: Number(row.total_hectares ?? 0),
        arableHectares: Number(row.arable_hectares ?? 0),
        vegetationHectares: Number(row.vegetation_hectares ?? 0),
        climateAvg: nullableAvg(row.climate_avg as string | number | null),
        climateCount: Number(row.climate_count ?? 0),
      },
      byState: this.parseJsonArray(row.by_state).map((item) => ({
        state: String(item.state),
        count: Number(item.count),
        hectares: Number(item.hectares ?? 0),
      })),
      byCar: this.parseJsonArray(row.by_car).map((item) => ({
        status: (item.status as string | null) ?? null,
        count: Number(item.count),
      })),
      climateByState: this.parseJsonArray(row.climate_by_state).map((item) => ({
        state: String(item.state),
        averageScore: nullableAvg(item.averageScore as string | number | null),
        farmsWithScore: Number(item.farmsWithScore ?? 0),
      })),
      farmsByMonth: this.parseJsonArray(row.farms_by_month).map((item) => ({
        month: String(item.month),
        farms: Number(item.farms),
        hectares: Number(item.hectares ?? 0),
      })),
      topCities: this.parseJsonArray(row.top_cities).map((item) => ({
        city: String(item.city),
        state: String(item.state),
        farms: Number(item.farms),
        hectares: Number(item.hectares ?? 0),
      })),
    };
  }

  private async queryCropsPack(
    filters: DashboardFilters,
    mode: 'full' | 'summary' | 'analytics',
  ): Promise<{
    byCrop: { crop: string; count: number }[];
    climateByCrop: {
      crop: string;
      averageScore: number | null;
      farmsWithScore: number;
    }[];
    cropsByYear: { year: string; crop: string; count: number }[];
  }> {
    const farmWhere = this.buildFarmWhere(filters);
    const wantByCrop = mode === 'full' || mode === 'summary';
    const wantAnalytics = mode === 'full' || mode === 'analytics';

    trackDbRoundTrip();
    const result = await this.db.execute(sql`
      WITH f AS (
        SELECT id, climate_risk_score
        FROM ${farms}
        WHERE ${farmWhere}
      ),
      active_crops AS (
        SELECT
          fc.crop_name,
          fc.id AS crop_row_id,
          h.year,
          f.id AS farm_id,
          f.climate_risk_score
        FROM ${farmCrops} fc
        INNER JOIN ${harvests} h ON fc.harvest_id = h.id
        INNER JOIN f ON h.farm_id = f.id
        WHERE h.status = 'ACTIVE'
      )
      SELECT
        ${
          wantByCrop
            ? sql`
        coalesce((
          SELECT json_agg(row_to_json(c) ORDER BY c.crop)
          FROM (
            SELECT crop_name AS crop, count(*)::int AS count
            FROM active_crops
            GROUP BY crop_name
          ) c
        ), '[]'::json) AS by_crop
            `
            : sql`'[]'::json AS by_crop`
        },
        ${
          wantAnalytics
            ? sql`
        coalesce((
          SELECT json_agg(row_to_json(cc) ORDER BY cc.crop)
          FROM (
            SELECT
              crop_name AS crop,
              avg(climate_risk_score)::float8 AS "averageScore",
              count(DISTINCT farm_id)::int AS "farmsWithScore"
            FROM active_crops
            WHERE climate_risk_score IS NOT NULL
            GROUP BY crop_name
          ) cc
        ), '[]'::json) AS climate_by_crop,
        coalesce((
          SELECT json_agg(row_to_json(y) ORDER BY y.year, y.crop)
          FROM (
            SELECT year, crop_name AS crop, count(*)::int AS count
            FROM active_crops
            GROUP BY year, crop_name
          ) y
        ), '[]'::json) AS crops_by_year
            `
            : sql`
        '[]'::json AS climate_by_crop,
        '[]'::json AS crops_by_year
            `
        }
    `);

    const row = asRows(result)[0] ?? {};
    return {
      byCrop: this.parseJsonArray(row.by_crop).map((item) => ({
        crop: String(item.crop),
        count: Number(item.count),
      })),
      climateByCrop: this.parseJsonArray(row.climate_by_crop).map((item) => ({
        crop: String(item.crop),
        averageScore: nullableAvg(item.averageScore as string | number | null),
        farmsWithScore: Number(item.farmsWithScore ?? 0),
      })),
      cropsByYear: this.parseJsonArray(row.crops_by_year).map((item) => ({
        year: String(item.year),
        crop: String(item.crop),
        count: Number(item.count),
      })),
    };
  }

  private async queryEsg(
    filters: DashboardFilters,
  ): Promise<{ status: string; count: number }[]> {
    const farmWhere = this.buildFarmWhere(filters);
    trackDbRoundTrip();
    const result = await this.db.execute(sql`
      WITH f AS (
        SELECT producer_id
        FROM ${farms}
        WHERE ${farmWhere}
      )
      SELECT
        p.esg_status AS status,
        count(DISTINCT p.id)::int AS count
      FROM f
      INNER JOIN ${producers} p ON f.producer_id = p.id
      WHERE p.deleted_at IS NULL
      GROUP BY p.esg_status
    `);

    return asRows(result).map((row) => ({
      status: String(row.status),
      count: Number(row.count),
    }));
  }

  private assembleStats(
    farmsPack: Awaited<ReturnType<DrizzleDashboardRepository['queryFarmsPack']>>,
    cropsPack: Awaited<ReturnType<DrizzleDashboardRepository['queryCropsPack']>>,
    esgRows: { status: string; count: number }[],
  ): DashboardStats {
    const { totals } = farmsPack;
    const totalFarms = totals.totalFarms;
    const totalHectares = totals.totalHectares;
    const arableHectares = totals.arableHectares;
    const vegetationHectares = totals.vegetationHectares;
    const landTotal = arableHectares + vegetationHectares;

    const cropTotal = cropsPack.byCrop.reduce((acc, row) => acc + row.count, 0);

    const byCarStatus = farmsPack.byCar.map((row) => {
      const carCount = row.count;
      return {
        status: row.status ?? 'Sem CAR',
        count: carCount,
        percentage: percentage(carCount, totalFarms),
      };
    });

    const esgProducerTotal = esgRows.reduce((acc, row) => acc + row.count, 0);
    const byEsgStatus = esgRows.map((row) => ({
      status: row.status,
      count: row.count,
      percentage: percentage(row.count, esgProducerTotal),
    }));

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
      byState: farmsPack.byState.map((row) => ({
        state: row.state,
        count: row.count,
        hectares: row.hectares,
        percentage: percentage(row.hectares, totalHectares),
      })),
      byCrop: cropsPack.byCrop.map((row) => ({
        crop: row.crop,
        count: row.count,
        percentage: percentage(row.count, cropTotal),
      })),
      byLandUse: {
        arableHectares,
        vegetationHectares,
        arablePercentage: percentage(arableHectares, landTotal),
        vegetationPercentage: percentage(vegetationHectares, landTotal),
      },
      regionalClimateRisk: {
        averageScore: totals.climateAvg,
        farmsWithScore: totals.climateCount,
      },
      byCarStatus,
      byEsgStatus,
      climateRiskByState: farmsPack.climateByState,
      climateRiskByCrop: cropsPack.climateByCrop,
      cropsByYear: cropsPack.cropsByYear,
      farmsByMonth: farmsPack.farmsByMonth,
      topCities: farmsPack.topCities,
    };
  }

  private parseJsonArray(value: unknown): Record<string, unknown>[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        return Array.isArray(parsed)
          ? (parsed as Record<string, unknown>[])
          : [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value as Record<string, unknown>[];
    }
    return [];
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
