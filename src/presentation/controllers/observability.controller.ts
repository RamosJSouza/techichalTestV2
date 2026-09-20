import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';
import { clientTimingSchema } from '../schemas/observability.schemas.js';

class ClientTimingDto extends createZodDto(clientTimingSchema) {}

@ApiTags('observability')
@Controller('observability')
export class ObservabilityController {
  public constructor(private readonly metrics: MetricsService) {}

  @Post('client-timings')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Timing allowlisted registrado (204)' })
  public recordClientTiming(@Body() body: ClientTimingDto): void {
    this.metrics.recordClientTiming(body.event, body.durationSeconds);
  }
}
