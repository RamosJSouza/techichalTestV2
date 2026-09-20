import { Injectable } from '@nestjs/common';
import type { AppConfigPort } from '../../../application/services/app-config.port.js';

@Injectable()
export class NestAppConfigAdapter implements AppConfigPort {
  public isEsgStrictMode(): boolean {
    return false;
  }
}
