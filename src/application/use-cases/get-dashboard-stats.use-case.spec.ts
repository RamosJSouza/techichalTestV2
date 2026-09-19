import type {
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';
import { GetDashboardStatsUseCase } from './get-dashboard-stats.use-case.js';

describe('GetDashboardStatsUseCase', () => {
  it('delega ao repositório de dashboard', async () => {
    const stats: DashboardStats = {
      totalFarms: 2,
      totalHectares: 1500,
      byState: [
        { state: 'SP', count: 2, hectares: 1500, percentage: 100 },
      ],
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
    };

    const repo: IDashboardRepository = {
      getStats: async () => stats,
    };

    const result = await new GetDashboardStatsUseCase(repo).execute();
    expect(result.totalFarms).toBe(2);
    expect(result.byState[0]?.state).toBe('SP');
  });
});
