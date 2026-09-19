import { Farm, Harvest } from './farm.js';
import { InvalidFarmAreaException } from '../exceptions/invalid-farm-area.exception.js';
import { Producer } from './producer.js';

describe('Producer and Farm entities', () => {
  it('cria produtor com documento válido', () => {
    const producer = Producer.create({
      name: 'João Silva',
      document: '529.982.247-25',
    });

    expect(producer.id).toBeDefined();
    expect(producer.document.value).toBe('52998224725');
    expect(producer.isDeleted).toBe(false);
  });

  it('rejeita fazenda com área inválida', () => {
    expect(() =>
      Farm.create({
        producerId: 'p1',
        name: 'Fazenda X',
        city: 'Ribeirão Preto',
        state: 'SP',
        totalArea: 100,
        arableArea: 80,
        vegetationArea: 30,
      }),
    ).toThrow(InvalidFarmAreaException);
  });

  it('Harvest.create inicia como ACTIVE e archive() muda para ARCHIVED', () => {
    const harvest = Harvest.create('2025/2026', ['Soja']);
    expect(harvest.status).toBe('ACTIVE');
    harvest.archive();
    expect(harvest.status).toBe('ARCHIVED');
  });

  it('soft delete do produtor soft-deleta fazendas', () => {
    const producer = Producer.create({
      name: 'Maria',
      document: '529.982.247-25',
    });
    const farm = Farm.create({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'sp',
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
      harvests: [{ year: '2025/2026', crops: ['Soja'] }],
    });
    producer.addFarm(farm);

    expect(farm.harvests[0]?.status).toBe('ACTIVE');

    producer.softDelete();

    expect(producer.isDeleted).toBe(true);
    expect(farm.isDeleted).toBe(true);
  });

  it('replaceHarvests substitui safras da fazenda', () => {
    const farm = Farm.create({
      producerId: '00000000-0000-4000-8000-000000000001',
      name: 'Fazenda',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      harvests: [{ year: '2025/2026', crops: ['Soja'] }],
    });

    farm.replaceHarvests([{ year: '2026/2027', crops: ['Milho'] }]);

    expect(farm.harvests).toHaveLength(1);
    expect(farm.harvests[0]?.year).toBe('2026/2027');
    expect(farm.harvests[0]?.crops.map((c) => c.name)).toEqual(['Milho']);
  });
});
