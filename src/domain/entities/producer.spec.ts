import { Farm } from './farm.js';
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

    producer.softDelete();

    expect(producer.isDeleted).toBe(true);
    expect(farm.isDeleted).toBe(true);
  });
});
