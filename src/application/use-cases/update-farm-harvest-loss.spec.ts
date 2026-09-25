/**
 * Edição com uma safra no corpo preserva as safras omitidas (merge por ano).
 */
import { InvalidDomainValueException } from '../../domain/exceptions/invalid-domain-value.exception.js';
import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  buildUpdateFarm,
  defaultBrazil,
} from '../../testing/use-case-factories.js';

describe('UpdateFarmUseCase — merge de safras', () => {
  const crypto = testCrypto();

  it('preserva a 2ª safra quando o corpo traz só a primeira', async () => {
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
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });
    expect(farm.harvests).toHaveLength(2);

    const firstId = farm.harvests[0]?.id;
    const updated = await buildUpdateFarm(farmRepo).execute(farm.id, {
      harvests: [{ year: '2025/2026', crops: ['Soja', 'Milho'] }],
    });
    expect(updated.harvests[0]?.id).toBe(firstId);
    expect(updated.harvests).toHaveLength(2);
    expect(updated.harvests[0]?.year).toBe('2025/2026');
    expect(updated.harvests[0]?.crops.map((c) => c.name)).toEqual([
      'Soja',
      'Milho',
    ]);
    expect(updated.harvests[1]?.year).toBe('2026/2027');
    expect(updated.harvests[1]?.crops.map((c) => c.name)).toEqual(['Café']);
  });

  it('removedYears apaga só o ano citado', async () => {
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
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });

    const updated = await buildUpdateFarm(farmRepo).execute(farm.id, {
      harvests: [{ year: '2025/2026', crops: ['Soja'] }],
      removedYears: ['2026/2027'],
    });

    expect(updated.harvests).toHaveLength(1);
    expect(updated.harvests[0]?.year).toBe('2025/2026');
  });

  it('rejeita o mesmo ano em harvests e removedYears sem gravar', async () => {
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
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });

    await expect(
      buildUpdateFarm(farmRepo).execute(farm.id, {
        harvests: [{ year: '2026/2027', crops: ['Milho'] }],
        removedYears: ['2026/2027'],
      }),
    ).rejects.toBeInstanceOf(InvalidDomainValueException);

    const stored = await farmRepo.findById(farm.id);
    expect(stored?.harvests).toHaveLength(2);
    expect(stored?.harvests[1]?.crops.map((crop) => crop.name)).toEqual([
      'Café',
    ]);
  });
});
