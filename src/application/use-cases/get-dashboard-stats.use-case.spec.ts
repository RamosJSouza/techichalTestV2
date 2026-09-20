import type {
  DashboardFilters,
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case.js';

function emptyStats(): DashboardStats {
  return {
    totalFarms: 2,
    totalHectares: 1500,
    averageFarmSize: 750,
    carComplianceRate: 50,
    esgComplianceRate: 100,
    byState: [{ state: 'SP', count: 2, hectares: 1500, percentage: 100 }],
    byCrop: [{ crop: 'Soja', count: 1, percentage: 100 }],
    byLandUse: {
      arableHectares: 900,
      vegetationHectares: 400,
      arablePercentage: 69.23,
      vegetationPercentage: 30.77,
    },
    regionalClimateRisk: {
      averageScore: 12.5,
      farmsWithScore: 2,
    },
    byCarStatus: [{ status: 'ACTIVE', count: 1, percentage: 50 }],
    byEsgStatus: [{ status: 'APPROVED', count: 2, percentage: 100 }],
    climateRiskByState: [
      { state: 'SP', averageScore: 12.5, farmsWithScore: 2 },
    ],
    climateRiskByCrop: [
      { crop: 'Soja', averageScore: 12.5, farmsWithScore: 1 },
    ],
    cropsByYear: [{ year: '2025/2026', crop: 'Soja', count: 1 }],
    farmsByMonth: [{ month: '2025-01', farms: 2, hectares: 1500 }],
    topCities: [
      { city: 'Ribeirão Preto', state: 'SP', farms: 2, hectares: 1500 },
    ],
  };
}

describe('GetDashboardStatsUseCase', () => {
  it('delega ao repositório de dashboard sem filtros', async () => {
    const stats = emptyStats();
    const repo: IDashboardRepository = {
      getStats: async () => stats,
    };

    const result = await new GetDashboardStatsUseCase(repo).execute();
    expect(result.totalFarms).toBe(2);
    expect(result.byState[0]?.state).toBe('SP');
    expect(result.averageFarmSize).toBe(750);
  });

  it('repassa filtros ao repositório', async () => {
    const received: DashboardFilters[] = [];
    const repo: IDashboardRepository = {
      getStats: async (filters) => {
        received.push(filters ?? {});
        return emptyStats();
      },
    };

    const filters: DashboardFilters = {
      state: 'SP',
      crop: 'Soja',
      esgStatus: 'APPROVED',
    };
    await new GetDashboardStatsUseCase(repo).execute(filters);
    expect(received).toEqual([filters]);
  });
});
