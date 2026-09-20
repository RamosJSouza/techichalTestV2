import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Inject,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import type { Response } from 'express';
import { BRAZIL_DATA_SERVICE } from '../../application/services/brazil-data.service.interface.js';
import { BrasilApiAdapter } from '../../infrastructure/adapters/brasil-api/brasil-api.adapter.js';
import type { DrizzleDb } from '../../infrastructure/database/database.module.js';
import { DRIZZLE } from '../../infrastructure/database/database.tokens.js';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  public constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly metrics: MetricsService,
    @Inject(BRAZIL_DATA_SERVICE)
    private readonly brazilData: BrasilApiAdapter,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Alias de liveness (compatibilidade)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
    },
  })
  public legacyHealth(): { status: string } {
    return this.live();
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Liveness — processo vivo' })
  public live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness — dependências (Postgres)' })
  public async ready(): Promise<{ status: string; database: string }> {
    try {
      await this.db.execute(sql`SELECT 1`);
      this.metrics.setDbUp(true);
      return { status: 'ok', database: 'up' };
    } catch {
      this.metrics.setDbUp(false);
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'down',
      });
    }
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Métricas Prometheus (HTTP, DB, circuit breakers)',
  })
  public async metricsEndpoint(@Res() res: Response): Promise<void> {
    const stats = this.brazilData.getCircuitStats();
    this.metrics.setCircuitOpen('cnpj', stats.cnpjOpen);
    this.metrics.setCircuitOpen('city', stats.cityOpen);
    this.metrics.setCircuitOpen('cities', stats.citiesOpen);
    const body = await this.metrics.scrape();
    res.status(HttpStatus.OK).send(body);
  }
}
