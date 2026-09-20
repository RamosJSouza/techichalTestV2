import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { randomUUID } from 'node:crypto';
import type { Response, Request } from 'express';
import { ZodError } from 'zod';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { DomainException } from '../../domain/exceptions/domain.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { SocioEnvironmentalBlockException } from '../../domain/exceptions/socio-environmental-block.exception.js';
import { MetricsService } from '../../infrastructure/observability/metrics.service.js';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  public constructor(
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const errorId = randomUUID();
    const traceId = this.resolveTraceId();

    if (exception instanceof ZodError) {
      this.metrics?.recordDomainError('VALIDATION_ERROR');
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
        traceId,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof DomainException) {
      this.metrics?.recordDomainError(exception.code);
      const status = this.mapDomainStatus(exception);
      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: exception.message,
        code: exception.code,
        errorId,
        traceId,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        this.metrics?.recordDomainError('INTERNAL_ERROR');
        this.logInternal(exception, errorId, traceId, request.url);
        response.status(status).json({
          statusCode: status,
          error: 'Internal Server Error',
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          errorId,
          traceId,
          timestamp: new Date().toISOString(),
          path: request.url,
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
      this.metrics?.recordDomainError(code);

      response.status(status).json({
        ...body,
        statusCode: status,
        errorId,
        traceId,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    this.metrics?.recordDomainError('INTERNAL_ERROR');
    this.logInternal(exception, errorId, traceId, request.url);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      errorId,
      traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
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
    traceId: string | null,
    path: string,
  ): void {
    const detail =
      exception instanceof Error
        ? { name: exception.name, message: exception.message, stack: exception.stack }
        : { detail: String(exception) };
    this.logger.error({ errorId, traceId, path, ...detail }, 'Unhandled error');
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
