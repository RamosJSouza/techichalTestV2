import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto, testLogger } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  defaultBrazil,
} from '../../testing/use-case-factories.js';
import { DeleteFarmUseCase } from './delete-farm.use-case.js';

describe('DeleteFarmUseCase', () => {
  const crypto = testCrypto();

  it('remove fazenda logicamente', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();
    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({ name: 'João', document: '529.982.247-25' });

    const farm = await buildCreateFarm(farmRepo, producerRepo).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
    });

    await new DeleteFarmUseCase(farmRepo, testLogger()).execute(farm.id);
    expect(await farmRepo.findById(farm.id)).toBeNull();
  });
});
