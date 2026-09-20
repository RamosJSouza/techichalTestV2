import { InMemoryFarmRepository } from '../../testing/in-memory-farm.repository.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto } from '../../testing/test-helpers.js';
import {
  buildCreateFarm,
  buildCreateProducer,
  defaultBrazil,
} from '../../testing/use-case-factories.js';

describe('CreateFarmUseCase', () => {
  const crypto = testCrypto();

  it('cria fazenda com validação territorial ok', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();

    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const farm = await buildCreateFarm(
      farmRepo,
      producerRepo,
      defaultBrazil,
    ).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
      harvests: [{ year: '2025/2026', crops: ['Soja', 'Milho'] }],
      carNumber: 'SP-3550308-E9D8C7B6A5F4E3D2C1B0A9F8E7D6C5B4',
    });

    expect(farm.state).toBe('SP');
    expect(farm.harvests).toHaveLength(1);
    expect(farm.carStatus).toBe('ACTIVE');
    expect(farm.climateRiskScore).not.toBeNull();
    expect(farm.territorialValidationStatus).toBe('VALIDATED');
  });

  it('persiste PENDING territorial quando BrasilAPI indisponível', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();

    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const farm = await buildCreateFarm(farmRepo, producerRepo, {
      getCnpjData: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
      isCityInState: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
      listCitiesByState: async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
      }),
    }).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
    });

    expect(farm.territorialValidationStatus).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
  });

  it('rejeita cidade fora do estado', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();

    const producer = await buildCreateProducer(
      producerRepo,
      defaultBrazil,
      crypto,
    ).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    await expect(
      buildCreateFarm(farmRepo, producerRepo, {
        getCnpjData: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
        isCityInState: async () => ({ outcome: 'VALIDATED', data: false }),
        listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
      }).execute({
        producerId: producer.id,
        name: 'Fazenda',
        city: 'Campinas',
        state: 'RJ',
        totalArea: 100,
        arableArea: 50,
        vegetationArea: 20,
      }),
    ).rejects.toThrow(/não pertence/);
  });
});
