import type {
  DashboardAnalytics,
  DashboardFilters,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';

export class GetDashboardAnalyticsUseCase {
  public constructor(
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  public async execute(
    filters: DashboardFilters = {},
  ): Promise<DashboardAnalytics> {
    return this.dashboardRepository.getAnalytics(filters);
  }
}
