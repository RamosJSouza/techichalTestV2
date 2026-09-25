import {
  farmAreasSchema,
  wizardStep0Schema,
} from './producer.schemas';

describe('farmAreasSchema', () => {
  it('aceita áreas válidas', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
    });
    expect(result.success).toBe(true);
  });

  it('aceita safra com zero culturas', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      harvests: [{ year: '2025/2026', crops: [] }],
    });
    expect(result.success).toBe(true);
  });

  it('rejeita cultura com nome vazio', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      harvests: [{ year: '2025/2026', crops: [''] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejeita quando agricultável + vegetação > total', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Inválida',
      city: 'Campinas',
      state: 'SP',
      totalArea: 100,
      arableArea: 80,
      vegetationArea: 30,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/≤ área total/);
    }
  });

  it('rejeita farm:{} com mensagens amigáveis (não jargão undefined genérico só)', () => {
    const result = farmAreasSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => /obrigat/i.test(m))).toBe(true);
    }
  });

  it('aceita carNumber null', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 100,
      arableArea: 50,
      vegetationArea: 20,
      carNumber: null,
    });
    expect(result.success).toBe(true);
  });

  it('coerce string numérica em área', () => {
    const result = farmAreasSchema.safeParse({
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: '100',
      arableArea: '50',
      vegetationArea: '20',
    });
    expect(result.success).toBe(true);
  });
});

describe('wizardStep0Schema', () => {
  it('aceita produtor válido mesmo com farm incompleto no objeto', () => {
    const result = wizardStep0Schema.safeParse({
      name: 'João',
      document: '52998224725',
      farm: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejeita CPF com dígito verificador inválido', () => {
    const result = wizardStep0Schema.safeParse({
      name: 'João',
      document: '123.456.789-00',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('CPF ou CNPJ inválido');
    }
  });

  it('rejeita nome vazio com mensagem em PT', () => {
    const result = wizardStep0Schema.safeParse({
      name: '',
      document: '52998224725',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/Nome obrigatório/i);
    }
  });
});
