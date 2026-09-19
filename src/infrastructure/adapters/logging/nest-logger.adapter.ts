import { Injectable, Logger } from '@nestjs/common';
import type { LoggerPort } from '../../../application/services/logger.port.js';

@Injectable()
export class NestLoggerAdapter implements LoggerPort {
  private readonly logger = new Logger('Application');

  public log(message: string): void {
    this.logger.log(message);
  }

  public warn(message: string): void {
    this.logger.warn(message);
  }

  public error(message: string): void {
    this.logger.error(message);
  }
}
