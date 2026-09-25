import type { BrazilDataServiceInterface } from '../application/services/brazil-data.service.interface.js';
import type { ExternalValidationAuditPort } from '../application/services/external-validation-audit.port.js';
import type { TransactionPort } from '../application/services/transaction.port.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { UpdateFarmUseCase } from '../application/use-cases/update-farm.use-case.js';
import type { IFarmRepository } from '../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../domain/repositories/producer.repository.js';
import type { CryptoService } from '../infrastructure/crypto/crypto.service.js';
import type { AppConfigPort } from '../application/services/app-config.port.js';
import { testConfig, testCrypto, testLogger } from './test-helpers.js';

export const defaultBrazil: BrazilDataServiceInterface = {
  getCnpjData: async () => ({
    outcome: 'PENDING_EXTERNAL_VALIDATION',
    reason: 'timeout_or_network',
  }),
  isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
  listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
  getCircuitStats: () => ({
    cnpjOpen: false,
    cityOpen: false,
    citiesOpen: false,
  }),
};

export function noopAudit(): ExternalValidationAuditPort {
  return {
    append: async () => undefined,
  };
}

export function noopTx(): TransactionPort {
  return {
    run: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  };
}

export function buildCreateProducer(
  repository: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  crypto: CryptoService = testCrypto(),
  audit: ExternalValidationAuditPort = noopAudit(),
  tx: TransactionPort = noopTx(),
  config: AppConfigPort = testConfig(),
): CreateProducerUseCase {
  return new CreateProducerUseCase(
    repository,
    brazil,
    crypto,
    config,
    testLogger(),
    audit,
    tx,
  );
}

export function buildCreateFarm(
  farmRepo: IFarmRepository,
  producerRepo: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  audit: ExternalValidationAuditPort = noopAudit(),
  tx: TransactionPort = noopTx(),
  config: AppConfigPort = testConfig(),
): CreateFarmUseCase {
  return new CreateFarmUseCase(
    farmRepo,
    producerRepo,
    brazil,
    config,
    testLogger(),
    audit,
    tx,
  );
}

export function buildUpdateFarm(
  farmRepo: IFarmRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  audit: ExternalValidationAuditPort = noopAudit(),
  tx: TransactionPort = noopTx(),
): UpdateFarmUseCase {
  return new UpdateFarmUseCase(
    farmRepo,
    brazil,
    testLogger(),
    audit,
    tx,
    testConfig(),
  );
}
