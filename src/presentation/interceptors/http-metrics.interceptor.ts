import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';
import { normalizeHttpRoute } from '../../infrastructure/observability/normalize-http-route.js';

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
    const method = req.method;
    const started = process.hrtime.bigint();

    const record = (statusCode: number): void => {
      const durationSeconds =
        Number(process.hrtime.bigint() - started) / 1e9;
      this.metrics.recordHttp(method, route, statusCode, durationSeconds);
    };

    return next.handle().pipe(
      tap({
        next: () => {
          record(res.statusCode);
        },
        error: (err: { status?: number; getStatus?: () => number }) => {
          const status =
            typeof err?.getStatus === 'function'
              ? err.getStatus()
              : (err?.status ?? 500);
          record(status);
        },
      }),
    );
  }
}
