import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import {
  getRequestHeapDeltaMb,
  getRequestQueryCount,
  isBenchInstrumentEnabled,
} from '../../infrastructure/database/request-query-context.js';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';
import {
  normalizeHttpMethod,
  normalizeHttpRoute,
} from '../../infrastructure/observability/normalize-http-route.js';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  public constructor(private readonly metrics: MetricsService) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const route = normalizeHttpRoute(req);
    const method = normalizeHttpMethod(req.method);
    const started = process.hrtime.bigint();
    const bench = isBenchInstrumentEnabled();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationSeconds =
            Number(process.hrtime.bigint() - started) / 1e9;
          this.metrics.recordHttp(
            method,
            route,
            res.statusCode,
            durationSeconds,
          );
          if (bench && !res.headersSent) {
            res.setHeader('X-Db-Queries', String(getRequestQueryCount()));
            res.setHeader('X-Heap-Delta-Mb', String(getRequestHeapDeltaMb()));
          }
        },
        error: (err: { status?: number; getStatus?: () => number }) => {
          const status =
            typeof err?.getStatus === 'function'
              ? err.getStatus()
              : (err?.status ?? 500);
          const durationSeconds =
            Number(process.hrtime.bigint() - started) / 1e9;
          this.metrics.recordHttp(method, route, status, durationSeconds);
          if (bench && !res.headersSent) {
            res.setHeader('X-Db-Queries', String(getRequestQueryCount()));
            res.setHeader('X-Heap-Delta-Mb', String(getRequestHeapDeltaMb()));
          }
        },
      }),
    );
  }
}
