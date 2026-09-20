import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';

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
    const route = req.route?.path ?? req.path ?? 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          this.metrics.recordHttp(req.method, route, res.statusCode);
        },
        error: (err: { status?: number; getStatus?: () => number }) => {
          const status =
            typeof err?.getStatus === 'function'
              ? err.getStatus()
              : (err?.status ?? 500);
          this.metrics.recordHttp(req.method, route, status);
        },
      }),
    );
  }
}
