import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case.js';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  public constructor(
    private readonly getDashboardStats: GetDashboardStatsUseCase,
  ) {}

  @Get('stats')
  @ApiOkResponse({ description: 'Métricas agregadas do dashboard' })
  public async stats() {
    return this.getDashboardStats.execute();
  }
}
