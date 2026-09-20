import type {
  DashboardFilters,
  DashboardSummary,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';

export class GetDashboardSummaryUseCase {
  public constructor(
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  public async execute(
    filters: DashboardFilters = {},
  ): Promise<DashboardSummary> {
    return this.dashboardRepository.getSummary(filters);
  }
}
