import type {
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';

export class GetDashboardStatsUseCase {
  public constructor(
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  public async execute(): Promise<DashboardStats> {
    return this.dashboardRepository.getStats();
  }
}
