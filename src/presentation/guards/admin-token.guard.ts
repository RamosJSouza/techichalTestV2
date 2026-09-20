import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../../config/env.schema.js';

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
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Admin-Token.');
    }
    return true;
  }
}
