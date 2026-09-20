import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { trace } from '@opentelemetry/api';
import { LoggerModule } from 'nestjs-pino';
import { parseEnv } from './config/env.schema.js';
import { StaticFrontendModule } from './infrastructure/static/static-frontend.module.js';
import { GlobalExceptionFilter } from './presentation/filters/global-exception.filter.js';
import { HttpMetricsInterceptor } from './presentation/interceptors/http-metrics.interceptor.js';
import { ZodValidationPipe } from './presentation/pipes/zod-validation.pipe.js';
import { PresentationModule } from './presentation/presentation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => parseEnv(config),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        mixin: () => {
          const span = trace.getActiveSpan();
          if (!span) {
            return {};
          }
          const context = span.spanContext();
          return {
            trace_id: context.traceId,
            span_id: context.spanId,
          };
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.document',
            'req.body.password',
            'req.query.document',
            'res.body.document',
            '*.document',
          ],
          remove: true,
        },
      },
    }),
    PresentationModule,
    StaticFrontendModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class AppModule {}
