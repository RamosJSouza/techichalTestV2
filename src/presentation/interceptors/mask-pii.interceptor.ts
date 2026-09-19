import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';

function maskDocument(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return CpfCnpj.create(value).masked();
  } catch {
    return value;
  }
}

function maskObject(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => maskObject(item));
  }

  if (payload !== null && typeof payload === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'document') {
        result[key] = maskDocument(value);
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
  public intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => maskObject(data)));
  }
}
