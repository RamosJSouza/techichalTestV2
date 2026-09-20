import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { parseEnv } from '../src/config/env.schema.js';
import { GlobalExceptionFilter } from '../src/presentation/filters/global-exception.filter.js';
import { HttpMetricsInterceptor } from '../src/presentation/interceptors/http-metrics.interceptor.js';
import { ZodValidationPipe } from '../src/presentation/pipes/zod-validation.pipe.js';
import { PresentationModule } from '../src/presentation/presentation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => parseEnv(config),
    }),
    PresentationModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class E2eAppModule {}
