import {
  createProducerSchema,
  listProducersQuerySchema,
} from './producer.schemas.js';

describe('producer.schemas (OWASP caps)', () => {
  it('rejeita mais de 20 farms', () => {
    const farms = Array.from({ length: 21 }, (_, i) => ({
      name: `Fazenda ${i}`,
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
    }));
    const result = createProducerSchema.safeParse({
      name: 'Produtor',
      document: '52998224725',
      farms,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita mais de 10 harvests por farm', () => {
    const harvests = Array.from({ length: 11 }, (_, i) => ({
      year: `202${i}`,
      crops: ['Soja'],
    }));
    const result = createProducerSchema.safeParse({
      name: 'Produtor',
      document: '52998224725',
      farms: [
        {
          name: 'Fazenda',
          city: 'Ribeirão Preto',
          state: 'SP',
          totalArea: 100,
          arableArea: 50,
          vegetationArea: 20,
          harvests,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejeita mais de 20 crops por harvest', () => {
    const crops = Array.from({ length: 21 }, (_, i) => `Crop${i}`);
    const result = createProducerSchema.safeParse({
      name: 'Produtor',
      document: '52998224725',
      farms: [
        {
          name: 'Fazenda',
          city: 'Ribeirão Preto',
          state: 'SP',
          totalArea: 100,
          arableArea: 50,
          vegetationArea: 20,
          harvests: [{ year: '2025', crops }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejeita page acima do teto', () => {
    const result = listProducersQuerySchema.safeParse({ page: 10_001 });
    expect(result.success).toBe(false);
  });

  it('aceita page no limite', () => {
    const result = listProducersQuerySchema.safeParse({ page: 10_000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(10_000);
    }
  });
});
