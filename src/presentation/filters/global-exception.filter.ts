import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import type { Response, Request } from 'express';
import { ZodError } from 'zod';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { DomainException } from '../../domain/exceptions/domain.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { SocioEnvironmentalBlockException } from '../../domain/exceptions/socio-environmental-block.exception.js';
import type { MetricsPort } from '../../application/services/metrics.port.js';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';

type RequestWithId = Request & { id?: string };

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  public constructor(
    @Inject(MetricsService) private readonly metrics: MetricsPort,
  ) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const errorId = randomUUID();
    const requestId = this.resolveRequestId(request);
    const traceId = this.resolveTraceId();
    const path = this.safeRequestPath(request);

    if (exception instanceof ZodError) {
      this.metrics.recordDomainError('VALIDATION_ERROR');
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Erro de validação',
        code: 'VALIDATION_ERROR',
        issues: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        errorId,
        requestId,
        traceId,
        timestamp: new Date().toISOString(),
        path,
      });
      return;
    }

    if (exception instanceof DomainException) {
      this.metrics.recordDomainError(exception.code);
      const status = this.mapDomainStatus(exception);
      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: exception.message,
        code: exception.code,
        errorId,
        requestId,
        traceId,
        timestamp: new Date().toISOString(),
        path,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        this.metrics.recordDomainError('INTERNAL_ERROR');
        this.logInternal(exception, errorId, requestId, traceId, path);
        response.status(status).json({
          statusCode: status,
          error: 'Internal Server Error',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          errorId,
          requestId,
          traceId,
          timestamp: new Date().toISOString(),
          path,
        });
        return;
      }

      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? exceptionResponse
          : { message: exception.message };
      const code =
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        typeof (body as { code?: unknown }).code === 'string'
          ? (body as { code: string }).code
          : 'other';
      this.metrics.recordDomainError(code);

      response.status(status).json({
        ...body,
        statusCode: status,
        errorId,
        requestId,
        traceId,
        timestamp: new Date().toISOString(),
        path,
      });
      return;
    }

    this.metrics.recordDomainError('INTERNAL_ERROR');
    this.logInternal(exception, errorId, requestId, traceId, path);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      errorId,
      requestId,
      traceId,
      timestamp: new Date().toISOString(),
      path,
    });
  }

  /** Pathname only — evita PII em query (?document=). */
  private safeRequestPath(request: RequestWithId): string {
    if (typeof request.path === 'string' && request.path.length > 0) {
      return request.path;
    }
    const raw = request.url ?? '';
    const q = raw.indexOf('?');
    return q >= 0 ? raw.slice(0, q) : raw;
  }

  private resolveRequestId(request: RequestWithId): string {
    if (typeof request.id === 'string' && request.id.length > 0) {
      return request.id;
    }
    const raw = request.headers['x-request-id'];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim().slice(0, 128);
    }
    return randomUUID();
  }

  private resolveTraceId(): string | null {
    const span = trace.getActiveSpan();
    if (!span) {
      return null;
    }
    return span.spanContext().traceId || null;
  }

  private logInternal(
    exception: unknown,
    errorId: string,
    requestId: string,
    traceId: string | null,
    path: string,
  ): void {
    const detail =
      exception instanceof Error
        ? {
            name: exception.name,
            message: exception.message,
            stack: exception.stack,
          }
        : { detail: String(exception) };
    this.logger.error(
      { errorId, requestId, traceId, path, ...detail },
      'Unhandled error',
    );
  }

  private mapDomainStatus(exception: DomainException): number {
    if (exception instanceof NotFoundException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof ConflictException) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof SocioEnvironmentalBlockException) {
      return HttpStatus.FORBIDDEN;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
