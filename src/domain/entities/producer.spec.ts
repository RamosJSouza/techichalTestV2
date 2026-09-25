import { InvalidDomainValueException } from '../exceptions/invalid-domain-value.exception.js';
import { InvalidFarmAreaException } from '../exceptions/invalid-farm-area.exception.js';
import { Farm, Harvest } from './farm.js';
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

  it('mergeHarvests atualiza o ano enviado, preserva o id e o ano omitido', () => {
    const farm = Farm.create({
      producerId: '00000000-0000-4000-8000-000000000001',
      name: 'Fazenda',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });
    const firstId = farm.harvests[0]?.id;
    const secondId = farm.harvests[1]?.id;

    farm.mergeHarvests([{ year: ' 2025/2026 ', crops: ['Soja', 'Milho'] }]);

    expect(farm.harvests).toHaveLength(2);
    expect(farm.harvests[0]?.id).toBe(firstId);
    expect(farm.harvests[0]?.year).toBe('2025/2026');
    expect(farm.harvests[0]?.crops.map((crop) => crop.name)).toEqual([
      'Soja',
      'Milho',
    ]);
    expect(farm.harvests[1]?.id).toBe(secondId);
    expect(farm.harvests[1]?.crops.map((crop) => crop.name)).toEqual(['Café']);
  });

  it('mergeHarvests acrescenta ano novo e lista vazia não apaga safras', () => {
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

    farm.mergeHarvests([]);
    expect(farm.harvests).toHaveLength(1);

    farm.mergeHarvests([{ year: '2026/2027', crops: ['Café'] }]);
    expect(farm.harvests.map((harvest) => harvest.year)).toEqual([
      '2025/2026',
      '2026/2027',
    ]);
  });

  it('mergeHarvests rejeita ano duplicado no mesmo pedido', () => {
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

    expect(() =>
      farm.mergeHarvests([
        { year: '2026/2027', crops: ['Milho'] },
        { year: '2026/2027', crops: ['Café'] },
      ]),
    ).toThrow(InvalidDomainValueException);
    expect(farm.harvests).toHaveLength(1);
  });

  it('removeHarvestYears tira o ano citado e ignora ano ausente', () => {
    const farm = Farm.create({
      producerId: '00000000-0000-4000-8000-000000000001',
      name: 'Fazenda',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      harvests: [
        { year: '2025/2026', crops: ['Soja'] },
        { year: '2026/2027', crops: ['Café'] },
      ],
    });
    const keptId = farm.harvests[0]?.id;

    farm.removeHarvestYears([' 2026/2027 ', '1999']);

    expect(farm.harvests).toHaveLength(1);
    expect(farm.harvests[0]?.id).toBe(keptId);
    expect(farm.harvests[0]?.year).toBe('2025/2026');
  });
});
