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
  @ApiOkResponse({
    description:
      'Shape completo (summary+analytics+ESG). Residual para clientes legados — preferir /summary.',
  })
  public async stats(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardStats.execute(query);
  }

  @Get('summary')
  @ApiOkResponse({
    description: 'KPIs, byState/byCrop/byLandUse/CAR/ESG.',
  })
  public async summary(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardSummary.execute(query);
  }

  @Get('analytics')
  @ApiOkResponse({
    description:
      'Séries (cropsByYear, farmsByMonth), topCities, risco climático por estado/cultura.',
  })
  public async analytics(@Query() query: DashboardStatsQueryDto) {
    return this.getDashboardAnalytics.execute(query);
  }
}
