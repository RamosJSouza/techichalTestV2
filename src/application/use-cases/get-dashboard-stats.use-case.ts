import type {
  DashboardFilters,
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';

export class GetDashboardStatsUseCase {
  public constructor(
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  public async execute(
    filters: DashboardFilters = {},
  ): Promise<DashboardStats> {
    return this.dashboardRepository.getStats(filters);
  }
}
