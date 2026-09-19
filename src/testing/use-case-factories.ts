import type { BrazilDataServiceInterface } from '../application/services/brazil-data.service.interface.js';
import { CreateFarmUseCase } from '../application/use-cases/create-farm.use-case.js';
import { CreateProducerUseCase } from '../application/use-cases/create-producer.use-case.js';
import { UpdateFarmUseCase } from '../application/use-cases/update-farm.use-case.js';
import type { IFarmRepository } from '../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../domain/repositories/producer.repository.js';
import type { CryptoService } from '../infrastructure/crypto/crypto.service.js';
import {
  testAgTechMocks,
  testConfig,
  testCrypto,
  testLogger,
} from './test-helpers.js';

export const defaultBrazil: BrazilDataServiceInterface = {
  getCnpjData: async () => null,
  isCityInState: async () => true,
};

export function buildCreateProducer(
  repository: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  crypto: CryptoService = testCrypto(),
  configOverrides: Parameters<typeof testConfig>[0] = {},
): CreateProducerUseCase {
  const mocks = testAgTechMocks();
  return new CreateProducerUseCase(
    repository,
    brazil,
    crypto,
    mocks.socio,
    mocks.car,
    mocks.proagro,
    testConfig(configOverrides),
    testLogger(),
  );
}

export function buildCreateFarm(
  farmRepo: IFarmRepository,
  producerRepo: IProducerRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
  configOverrides: Parameters<typeof testConfig>[0] = {},
): CreateFarmUseCase {
  const mocks = testAgTechMocks();
  return new CreateFarmUseCase(
    farmRepo,
    producerRepo,
    brazil,
    mocks.socio,
    mocks.car,
    mocks.proagro,
    testConfig(configOverrides),
    testLogger(),
  );
}

export function buildUpdateFarm(
  farmRepo: IFarmRepository,
  brazil: BrazilDataServiceInterface = defaultBrazil,
): UpdateFarmUseCase {
  const mocks = testAgTechMocks();
  return new UpdateFarmUseCase(
    farmRepo,
    brazil,
    mocks.car,
    mocks.proagro,
    testLogger(),
  );
}
