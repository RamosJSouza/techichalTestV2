import { createHash } from 'node:crypto';
import type { AppConfigPort } from '../application/services/app-config.port.js';
import type { CarValidationServiceInterface } from '../application/services/car-validation.service.interface.js';
import type { LoggerPort } from '../application/services/logger.port.js';
import type { ProagroServiceInterface } from '../application/services/proagro.service.interface.js';
import type { SocioEnvironmentalServiceInterface } from '../application/services/socio-environmental.service.interface.js';
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

export function testAgTechMocks(): {
  socio: SocioEnvironmentalServiceInterface;
  car: CarValidationServiceInterface;
  proagro: ProagroServiceInterface;
} {
  return {
    socio: {
      checkDocument: async (documentDigits: string) => {
        const restricted = documentDigits.endsWith('0');
        if (!restricted) {
          return {
            hasIbamaEmbargo: false,
            hasSlaveLaborFlag: false,
            details: [],
          };
        }
        return {
          hasIbamaEmbargo: true,
          hasSlaveLaborFlag: false,
          details: ['Mock: documento terminado em 0 simula embargo IBAMA'],
        };
      },
    },
    car: {
      validateCar: async (input) => {
        const matchesFarmAreas = input.vegetationArea >= input.totalArea * 0.2;
        return {
          status: matchesFarmAreas ? 'ACTIVE' : 'PENDING',
          appHectares: Number((input.totalArea * 0.1).toFixed(2)),
          legalReserveHectares: Number((input.totalArea * 0.2).toFixed(2)),
          matchesFarmAreas,
        };
      },
    },
    proagro: {
      calculateClimateRisk: async (input) => {
        const normalizedCity = input.city
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .trim();
        const key = [
          normalizedCity,
          input.state.toUpperCase(),
          ...[...input.crops].map((c) => c.toLowerCase()).sort(),
        ].join('|');
        const digest = createHash('sha256').update(key).digest();
        const raw = digest.readUInt16BE(0);
        return Number(((raw % 10001) / 100).toFixed(2));
      },
    },
  };
}
