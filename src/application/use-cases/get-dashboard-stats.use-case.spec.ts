import type {
  DashboardFilters,
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case.js';

function emptyStats(): DashboardStats {
  return {
    totalFarms: 0,
    totalHectares: 0,
    averageFarmSize: 0,
    carComplianceRate: 0,
    esgComplianceRate: 0,
    byState: [],
    byCrop: [],
    byLandUse: {
      arableHectares: 0,
      vegetationHectares: 0,
      arablePercentage: 0,
      vegetationPercentage: 0,
    },
    regionalClimateRisk: { averageScore: null, farmsWithScore: 0 },
    byCarStatus: [],
    byEsgStatus: [],
    climateRiskByState: [],
    climateRiskByCrop: [],
    cropsByYear: [],
    farmsByMonth: [],
    topCities: [],
  };
}

function emptyRepo(
  overrides: Partial<IDashboardRepository> = {},
): IDashboardRepository {
  return {
    getStats: async () => emptyStats(),
    getSummary: async () => {
      const s = emptyStats();
      return {
        totalFarms: s.totalFarms,
        totalHectares: s.totalHectares,
        averageFarmSize: s.averageFarmSize,
        carComplianceRate: s.carComplianceRate,
        esgComplianceRate: s.esgComplianceRate,
        byState: s.byState,
        byCrop: s.byCrop,
        byLandUse: s.byLandUse,
        regionalClimateRisk: s.regionalClimateRisk,
        byCarStatus: s.byCarStatus,
        byEsgStatus: s.byEsgStatus,
      };
    },
    getAnalytics: async () => ({
      climateRiskByState: [],
      climateRiskByCrop: [],
      cropsByYear: [],
      farmsByMonth: [],
      topCities: [],
    }),
    ...overrides,
  };
}

describe('GetDashboardStatsUseCase', () => {
  it('delega ao repositório', async () => {
    const stats = emptyStats();
    stats.totalFarms = 3;
    const repo = emptyRepo({ getStats: async () => stats });
    const result = await new GetDashboardStatsUseCase(repo).execute();
    expect(result.totalFarms).toBe(3);
  });

  it('repassa filtros', async () => {
    const received: DashboardFilters[] = [];
    const repo = emptyRepo({
      getStats: async (filters) => {
        received.push(filters ?? {});
        return emptyStats();
      },
    });
    const filters: DashboardFilters = {
      state: 'SP',
      esgStatus: 'APPROVED',
    };
    await new GetDashboardStatsUseCase(repo).execute(filters);
    expect(received).toEqual([filters]);
  });
});
