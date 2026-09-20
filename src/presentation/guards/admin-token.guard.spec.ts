import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import {
  AdminTokenGuard,
  adminTokensEqual,
} from './admin-token.guard.js';

describe('adminTokensEqual', () => {
  it('aceita tokens idênticos', () => {
    expect(adminTokensEqual('secret-token-ok', 'secret-token-ok')).toBe(true);
  });

  it('rejeita tokens diferentes (mesmo comprimento)', () => {
    expect(adminTokensEqual('secret-token-aa', 'secret-token-bb')).toBe(false);
  });

  it('rejeita tokens de comprimentos diferentes', () => {
    expect(adminTokensEqual('short', 'much-longer-token')).toBe(false);
  });
});

describe('AdminTokenGuard', () => {
  function makeGuard(token: string | undefined): AdminTokenGuard {
    const config = {
      get: () => token,
    } as unknown as ConfigService;
    return new AdminTokenGuard(config as ConfigService<never, true>);
  }

  function contextWithHeader(
    value: string | undefined,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          header: (name: string) =>
            name.toLowerCase() === 'x-admin-token' ? value : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('permite token válido', () => {
    const guard = makeGuard('local-admin-token-min-8');
    expect(guard.canActivate(contextWithHeader('local-admin-token-min-8'))).toBe(
      true,
    );
  });

  it('rejeita token ausente', () => {
    const guard = makeGuard('local-admin-token-min-8');
    expect(() => guard.canActivate(contextWithHeader(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita token inválido', () => {
    const guard = makeGuard('local-admin-token-min-8');
    expect(() => guard.canActivate(contextWithHeader('wrong-token!!'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando ADMIN_API_TOKEN não configurado', () => {
    const guard = makeGuard(undefined);
    expect(() =>
      guard.canActivate(contextWithHeader('anything')),
    ).toThrow(UnauthorizedException);
  });
});
