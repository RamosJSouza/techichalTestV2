import type { AppConfigPort } from '../application/services/app-config.port.js';
import type { LoggerPort } from '../application/services/logger.port.js';
import { CryptoService } from '../infrastructure/crypto/crypto.service.js';

export function testCrypto(): CryptoService {
  return new CryptoService(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'change-me-pepper-secret-min-16',
  );
}

export function testLogger(): LoggerPort {
  return {
    log: (): void => undefined,
    warn: (): void => undefined,
    error: (): void => undefined,
  };
}

export function testConfig(
  overrides: { esgStrictMode?: boolean } = {},
): AppConfigPort {
  return {
    isEsgStrictMode: (): boolean => overrides.esgStrictMode ?? false,
  };
}
