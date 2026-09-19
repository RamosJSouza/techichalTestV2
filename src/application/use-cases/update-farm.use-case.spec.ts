import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  buildUpdateFarm,
  defaultBrazil,
} from '../../testing/use-case-factories.js';

describe('UpdateFarmUseCase', () => {
  const crypto = testCrypto();

  async function seedFarm(): Promise<{
    farmId: string;
    farmRepo: InMemoryFarmRepository;
  }> {
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

    return { farmId: farm.id, farmRepo };
  }

  it('atualiza nome e áreas', async () => {
    const { farmId, farmRepo } = await seedFarm();
    const updated = await buildUpdateFarm(farmRepo).execute(farmId, {
      name: 'Nova',
      totalArea: 800,
      arableArea: 500,
      vegetationArea: 200,
    });

    expect(updated.name).toBe('Nova');
    expect(updated.area.totalArea).toBe(800);
  });

  it('substitui safras e culturas', async () => {
    const { farmId, farmRepo } = await seedFarm();
    const updated = await buildUpdateFarm(farmRepo).execute(farmId, {
      harvests: [{ year: '2026/2027', crops: ['Milho', 'Café'] }],
    });

    expect(updated.harvests).toHaveLength(1);
    expect(updated.harvests[0]?.year).toBe('2026/2027');
    expect(updated.harvests[0]?.crops.map((c) => c.name)).toEqual([
      'Milho',
      'Café',
    ]);
  });

  it('rejeita fazenda inexistente', async () => {
    const farmRepo = new InMemoryFarmRepository();
    await expect(
      buildUpdateFarm(farmRepo).execute(
        '00000000-0000-4000-8000-000000000000',
        { name: 'X' },
      ),
    ).rejects.toThrow(/não encontrada/);
  });
});
