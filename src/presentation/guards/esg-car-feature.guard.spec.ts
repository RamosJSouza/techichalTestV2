import type { AppConfigPort } from '../../application/services/app-config.port.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import { EsgCarFeatureGuard } from './esg-car-feature.guard.js';

describe('EsgCarFeatureGuard', () => {
  function makeGuard(enabled: boolean): EsgCarFeatureGuard {
    const config: AppConfigPort = {
      isEsgStrictMode: () => false,
      isEsgCarEnabled: () => enabled,
    };
    return new EsgCarFeatureGuard(config);
  }

  it('permite quando a flag está ligada', () => {
    expect(makeGuard(true).canActivate()).toBe(true);
  });

  it('responde como não encontrado quando a flag está desligada', () => {
    expect(() => makeGuard(false).canActivate()).toThrow(NotFoundException);
  });
});
