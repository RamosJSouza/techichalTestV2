import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigPort } from '../../../application/services/app-config.port.js';
import { isEsgCarEnabled, type Env } from '../../../config/env.schema.js';

@Injectable()
export class NestAppConfigAdapter implements AppConfigPort {
  public constructor(private readonly config: ConfigService<Env, true>) {}

  public isEsgStrictMode(): boolean {
    return false;
  }

  public isEsgCarEnabled(): boolean {
    return isEsgCarEnabled({
      ESG_CAR_ENABLED: this.config.get('ESG_CAR_ENABLED', { infer: true }),
    });
  }
}
