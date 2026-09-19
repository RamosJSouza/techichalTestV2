import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testAgTechMocks, testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
} from '../../testing/use-case-factories.js';
import { ValidateFarmCarUseCase } from './validate-farm-car.use-case.js';

describe('ValidateFarmCarUseCase', () => {
  it('valida CAR da fazenda', async () => {
    const crypto = testCrypto();
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();
    const producer = await buildCreateProducer(producerRepo).execute({
      name: 'João',
      document: '529.982.247-25',
    });
    const farm = await buildCreateFarm(farmRepo, producerRepo).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
      carNumber: 'SP-3550308-E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4',
    });

    const result = await new ValidateFarmCarUseCase(
      farmRepo,
      testAgTechMocks().car,
    ).execute(farm.id);

    expect(result.status).toBe('ACTIVE');
    expect(result.carNumber).toContain('SP-');
  });
});
