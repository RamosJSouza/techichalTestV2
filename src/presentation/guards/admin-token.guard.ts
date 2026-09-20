import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { Env } from '../../config/env.schema.js';

/** Compara tokens via SHA-256 + timingSafeEqual (comprimentos iguais). */
export function adminTokensEqual(
  provided: string,
  expected: string,
): boolean {
  const a = createHash('sha256').update(provided, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

@Injectable()
export class AdminTokenGuard implements CanActivate {
  public constructor(
    private readonly config: ConfigService<Env, true>,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get('ADMIN_API_TOKEN', { infer: true });
    if (!expected || expected.length < 8) {
      throw new UnauthorizedException(
        'Admin revalidation is not configured (ADMIN_API_TOKEN).',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.header('x-admin-token');
    if (!provided || !adminTokensEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid or missing X-Admin-Token.');
    }
    return true;
  }
}
