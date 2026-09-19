import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ZodError } from 'zod';
import { DomainException } from '../../domain/exceptions/domain.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { ConflictException } from '../../domain/exceptions/conflict.exception.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Erro de validação',
        code: 'VALIDATION_ERROR',
        issues: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof DomainException) {
      const status = this.mapDomainStatus(exception);
      response.status(status).json({
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message: exception.message,
        code: exception.code,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const body =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? exceptionResponse
          : { message: exception.message };

      response.status(status).json({
        ...body,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message,
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapDomainStatus(exception: DomainException): number {
    if (exception instanceof NotFoundException) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof ConflictException) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.BAD_REQUEST;
  }
}
