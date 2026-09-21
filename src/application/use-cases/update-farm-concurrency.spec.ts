import { ConflictException } from '../../domain/exceptions/conflict.exception.js';
import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  buildUpdateFarm,
  defaultBrazil,
} from '../../testing/use-case-factories.js';

describe('UpdateFarmUseCase concurrency', () => {
  const crypto = testCrypto();

  it('segundo writer com expectedUpdatedAt obsoleto recebe ConflictException', async () => {
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
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
    });

    const staleExpected = new Date(farm.updatedAt.getTime());

    await buildUpdateFarm(farmRepo).execute(farm.id, { name: 'Nome A' });

    const current = await farmRepo.findById(farm.id);
    expect(current).not.toBeNull();

    await expect(
      farmRepo.update(current!, { expectedUpdatedAt: staleExpected }),
    ).rejects.toBeInstanceOf(ConflictException);

    const persisted = await farmRepo.findById(farm.id);
    expect(persisted?.name).toBe('Nome A');
  });

  it('PUT sem harvests não apaga safras existentes (harvestsChanged default false)', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();
    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({ name: 'João', document: '390.533.447-05' });

    const farm = await buildCreateFarm(farmRepo, producerRepo).execute({
      producerId: producer.id,
      name: 'Com Safra',
      city: 'Campinas',
      state: 'SP',
      totalArea: 100,
      arableArea: 40,
      vegetationArea: 20,
      harvests: [{ year: '2025', crops: ['Soja'] }],
    });

    const updated = await buildUpdateFarm(farmRepo).execute(farm.id, {
      name: 'Renomeada',
    });

    expect(updated.name).toBe('Renomeada');
    expect(updated.harvests).toHaveLength(1);
    expect(updated.harvests[0]?.crops.map((c) => c.name)).toEqual(['Soja']);
  });
});
