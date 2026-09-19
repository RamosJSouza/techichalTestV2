import { Inject, Injectable } from '@nestjs/common';
import { DASHBOARD_REPOSITORY } from '../../domain/repositories/dashboard.repository.js';
import type {
  DashboardStats,
  IDashboardRepository,
} from '../../domain/repositories/dashboard.repository.js';

@Injectable()
export class GetDashboardStatsUseCase {
  public constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: IDashboardRepository,
  ) {}

  public async execute(): Promise<DashboardStats> {
    return this.dashboardRepository.getStats();
  }
}
