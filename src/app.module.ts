import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { trace } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { parseEnv } from './config/env.schema.js';
import { StaticFrontendModule } from './infrastructure/static/static-frontend.module.js';
import { GlobalExceptionFilter } from './presentation/filters/global-exception.filter.js';
import { HttpMetricsInterceptor } from './presentation/interceptors/http-metrics.interceptor.js';
import { ZodValidationPipe } from './presentation/pipes/zod-validation.pipe.js';
import { PresentationModule } from './presentation/presentation.module.js';

function resolveIncomingRequestId(req: IncomingMessage): string {
  const raw = req.headers['x-request-id'];
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim().slice(0, 128);
  }
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].trim()) {
    return raw[0].trim().slice(0, 128);
  }
  return randomUUID();
}

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
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const id = resolveIncomingRequestId(req);
          res.setHeader('X-Request-Id', id);
          return id;
        },
        customProps: (req: IncomingMessage & { id?: string }) => ({
          requestId: req.id,
        }),
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
            'req.headers["x-admin-token"]',
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
