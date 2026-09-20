import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetDashboardAnalyticsUseCase } from '../../application/use-cases/get-dashboard-analytics.use-case.js';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case.js';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case.js';
import { DashboardStatsQueryDto } from '../dtos/dashboard.dto.js';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  public constructor(
    private readonly getDashboardStats: GetDashboardStatsUseCase,
    private readonly getDashboardSummary: GetDashboardSummaryUseCase,
    private readonly getDashboardAnalytics: GetDashboardAnalyticsUseCase,
  ) {}

  @Get('stats')
  @ApiOkResponse({ description: 'Métricas agregadas completas do dashboard' })
  public async stats(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardStats.execute(query);
  }

  @Get('summary')
  @ApiOkResponse({
    description: 'KPIs e distribuições principais (first paint)',
  })
  public async summary(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardSummary.execute(query);
  }

  @Get('analytics')
  @ApiOkResponse({
    description: 'Séries temporais, ranking e risco detalhado',
  })
  public async analytics(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardAnalytics.execute(query);
  }
}
