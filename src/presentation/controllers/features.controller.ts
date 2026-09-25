import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  APP_CONFIG_PORT,
  type AppConfigPort,
} from '../../application/services/app-config.port.js';

@ApiTags('features')
@Controller('features')
export class FeaturesController {
  public constructor(
    @Inject(APP_CONFIG_PORT) private readonly config: AppConfigPort,
  ) {}

  @Get()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { esgCarEnabled: { type: 'boolean', example: false } },
    },
  })
  public getFeatures(): { esgCarEnabled: boolean } {
    return { esgCarEnabled: this.config.isEsgCarEnabled() };
  }
}
