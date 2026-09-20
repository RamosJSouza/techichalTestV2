import type { DashboardFilters } from '../../domain/repositories/dashboard.repository.js';
import { DrizzleDashboardRepository } from './drizzle-dashboard.repository.js';

describe('DrizzleDashboardRepository', () => {
  function mockDb(handlers: {
    farms?: Record<string, unknown>;
    crops?: Record<string, unknown>;
    esg?: Record<string, unknown>[];
  }) {
    let call = 0;
    return {
      execute: async () => {
        call += 1;
        if (call === 1) {
          return [
            handlers.farms ?? {
              total_farms: 2,
              total_hectares: 1500,
              arable_hectares: 900,
              vegetation_hectares: 400,
              climate_avg: 12.5,
              climate_count: 2,
              by_state: [{ state: 'SP', count: 2, hectares: 1500 }],
              by_car: [{ status: 'ACTIVE', count: 1 }],
              climate_by_state: [
                { state: 'SP', averageScore: 12.5, farmsWithScore: 2 },
              ],
              farms_by_month: [{ month: '2025-01', farms: 2, hectares: 1500 }],
              top_cities: [
                {
                  city: 'Ribeirão Preto',
                  state: 'SP',
                  farms: 2,
                  hectares: 1500,
                },
              ],
            },
          ];
        }
        if (call === 2) {
          return [
            handlers.crops ?? {
              by_crop: [{ crop: 'Soja', count: 1 }],
              climate_by_crop: [
                { crop: 'Soja', averageScore: 12.5, farmsWithScore: 1 },
              ],
              crops_by_year: [{ year: '2025/2026', crop: 'Soja', count: 1 }],
            },
          ];
        }
        return handlers.esg ?? [{ status: 'APPROVED', count: 1 }];
      },
      select: () => {
        const chain = {
          from: () => chain,
          innerJoin: () => chain,
          where: () => Promise.resolve([]),
        };
        return chain;
      },
    };
  }

  it('executa getStats e devolve shape completo', async () => {
    const repo = new DrizzleDashboardRepository(mockDb({}) as never);
    const stats = await repo.getStats();

    expect(stats.totalFarms).toBe(2);
    expect(stats.totalHectares).toBe(1500);
    expect(stats.averageFarmSize).toBe(750);
    expect(stats.carComplianceRate).toBe(50);
    expect(stats.esgComplianceRate).toBe(100);
    expect(stats.byState).toHaveLength(1);
    expect(stats.byCrop[0]?.crop).toBe('Soja');
    expect(stats.byCarStatus[0]?.status).toBe('ACTIVE');
    expect(stats.byEsgStatus[0]?.status).toBe('APPROVED');
    expect(stats.climateRiskByState[0]?.state).toBe('SP');
    expect(stats.climateRiskByCrop[0]?.crop).toBe('Soja');
    expect(stats.cropsByYear[0]?.year).toBe('2025/2026');
    expect(stats.farmsByMonth[0]?.month).toBe('2025-01');
    expect(stats.topCities[0]?.city).toBe('Ribeirão Preto');
  });

  it('snapshot das chaves do DashboardStats após getStats', async () => {
    const repo = new DrizzleDashboardRepository(
      mockDb({
        farms: {
          total_farms: 0,
          total_hectares: 0,
          arable_hectares: 0,
          vegetation_hectares: 0,
          climate_avg: null,
          climate_count: 0,
          by_state: [],
          by_car: [],
          climate_by_state: [],
          farms_by_month: [],
          top_cities: [],
        },
        crops: { by_crop: [], climate_by_crop: [], crops_by_year: [] },
        esg: [],
      }) as never,
    );
    const stats = await repo.getStats();
    expect(Object.keys(stats).sort()).toEqual(
      [
        'averageFarmSize',
        'byCarStatus',
        'byCrop',
        'byEsgStatus',
        'byLandUse',
        'byState',
        'carComplianceRate',
        'climateRiskByCrop',
        'climateRiskByState',
        'cropsByYear',
        'esgComplianceRate',
        'farmsByMonth',
        'regionalClimateRisk',
        'topCities',
        'totalFarms',
        'totalHectares',
      ].sort(),
    );
  });

  it('aceita filtros sem lançar', async () => {
    const repo = new DrizzleDashboardRepository(
      mockDb({
        farms: {
          total_farms: 0,
          total_hectares: 0,
          arable_hectares: 0,
          vegetation_hectares: 0,
          climate_avg: null,
          climate_count: 0,
          by_state: [],
          by_car: [],
          climate_by_state: [],
          farms_by_month: [],
          top_cities: [],
        },
        crops: { by_crop: [], climate_by_crop: [], crops_by_year: [] },
        esg: [],
      }) as never,
    );
    const filters: DashboardFilters = {
      state: 'SP',
      crop: 'Soja',
      harvestYear: '2025/2026',
      esgStatus: 'APPROVED',
      carStatus: 'ACTIVE',
      minClimateRisk: 0,
      maxClimateRisk: 50,
    };
    const stats = await repo.getStats(filters);
    expect(stats.totalFarms).toBe(0);
    expect(stats.byState).toEqual([]);
    expect(stats.byCarStatus).toEqual([]);
  });

  it('getSummary e getAnalytics devolvem subconjuntos', async () => {
    const summary = await new DrizzleDashboardRepository(
      mockDb({}) as never,
    ).getSummary();
    expect(summary.totalFarms).toBe(2);
    expect(summary).not.toHaveProperty('topCities');
    const analytics = await new DrizzleDashboardRepository(
      mockDb({}) as never,
    ).getAnalytics();
    expect(analytics.topCities[0]?.city).toBe('Ribeirão Preto');
    expect(analytics).not.toHaveProperty('totalFarms');
  });
});
