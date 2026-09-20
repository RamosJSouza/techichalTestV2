import type { BrazilDataServiceInterface } from '../application/services/brazil-data.service.interface.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { UpdateFarmUseCase } from '../application/use-cases/update-farm.use-case.js';
import type { IFarmRepository } from '../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../domain/repositories/producer.repository.js';
import type { CryptoService } from '../infrastructure/crypto/crypto.service.js';
import {
  testConfig,
  testCrypto,
  testLogger,
} from './test-helpers.js';

export const defaultBrazil: BrazilDataServiceInterface = {
  getCnpjData: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
  isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
  listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
};

export function buildCreateProducer(
  repository: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  crypto: CryptoService = testCrypto(),
): CreateProducerUseCase {
  return new CreateProducerUseCase(
    repository,
    brazil,
    crypto,
    testConfig(),
    testLogger(),
  );
}

export function buildCreateFarm(
  farmRepo: IFarmRepository,
  producerRepo: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
): CreateFarmUseCase {
  return new CreateFarmUseCase(
    farmRepo,
    producerRepo,
    brazil,
    testConfig(),
    testLogger(),
  );
}

export function buildUpdateFarm(
  farmRepo: IFarmRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
): UpdateFarmUseCase {
  return new UpdateFarmUseCase(farmRepo, brazil, testLogger());
}
