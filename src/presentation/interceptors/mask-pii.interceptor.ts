import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import { MASK_PII_KEY } from '../decorators/mask-pii.decorator.js';

function maskObject(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => maskObject(item));
  }

  if (payload !== null && typeof payload === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'document' && typeof value === 'string') {
        // Idempotente: se já mascarado no mapper, não reprocessar
        result[key] = value.includes('*')
          ? value
          : CpfCnpj.maskDigits(value.replace(/\D/g, ''));
      } else {
        result[key] = maskObject(value);
      }
    }
    return result;
  }

  return payload;
}

@Injectable()
export class MaskPiiInterceptor implements NestInterceptor {
  public constructor(private readonly reflector: Reflector) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const shouldMask =
      this.reflector.getAllAndOverride<boolean>(MASK_PII_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;

    if (!shouldMask) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => maskObject(data)));
  }
}
