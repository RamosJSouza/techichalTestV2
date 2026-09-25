import { CanActivate, Inject, Injectable } from '@nestjs/common';
import {
  APP_CONFIG_PORT,
  type AppConfigPort,
} from '../../application/services/app-config.port.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';

@Injectable()
export class EsgCarFeatureGuard implements CanActivate {
  public constructor(
    @Inject(APP_CONFIG_PORT) private readonly config: AppConfigPort,
  ) {}

  public canActivate(): boolean {
    if (this.config.isEsgCarEnabled()) {
      return true;
    }
    throw new NotFoundException('Recurso indisponível.');
  }
}
