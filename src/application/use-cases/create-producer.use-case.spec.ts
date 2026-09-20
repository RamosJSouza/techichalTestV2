import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { testCrypto, testLogger } from '../../testing/test-helpers.js';
import {
  buildCreateProducer,
  defaultBrazil,
} from '../../testing/use-case-factories.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { DeleteProducerUseCase } from './delete-producer.use-case.js';

describe('Producer use cases', () => {
  const crypto = testCrypto();

  let repository: InMemoryProducerRepository;
  let createProducer: ReturnType<typeof buildCreateProducer>;
  let deleteProducer: DeleteProducerUseCase;

  beforeEach(() => {
    repository = new InMemoryProducerRepository(crypto);
    createProducer = buildCreateProducer(repository, defaultBrazil, crypto);
    deleteProducer = new DeleteProducerUseCase(repository, testLogger());
  });

  it('cria produtor com CPF válido', async () => {
    const producer = await createProducer.execute({
      name: 'João Silva',
      document: '529.982.247-25',
    });

    expect(producer.name).toBe('João Silva');
    expect(producer.document.value).toBe('52998224725');
    expect(producer.esgStatus).toBe('APPROVED');
    expect(producer.documentValidationStatus).toBe('VALIDATED');
  });

  it('soft delete remove da listagem', async () => {
    const producer = await createProducer.execute({
      name: 'João Silva',
      document: '529.982.247-25',
    });

    await deleteProducer.execute(producer.id);
    expect(await repository.findAll()).toHaveLength(0);
  });

  it('rejeita CNPJ inativo quando BrasilAPI responde', async () => {
    const inactiveBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'VALIDATED',
        data: {
          cnpj: '11222333000181',
          razaoSocial: 'Empresa X',
          situacaoCadastral: 'BAIXADA',
          isActive: false,
        },
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
    };

    await expect(
      buildCreateProducer(repository, inactiveBrazil, crypto).execute({
        name: 'Empresa X',
        document: '11.222.333/0001-81',
      }),
    ).rejects.toThrow(/ATIVA/);
  });

  it('rejeita CNPJ quando BrasilAPI retorna REJECTED (404)', async () => {
    const rejectedBrazil: BrazilDataServiceInterface = {
      getCnpjData: async () => ({
        outcome: 'REJECTED',
        reason: 'CNPJ não encontrado na Receita Federal.',
      }),
      isCityInState: async () => ({ outcome: 'VALIDATED', data: true }),
      listCitiesByState: async () => ({ outcome: 'VALIDATED', data: [] }),
    };

    await expect(
      buildCreateProducer(repository, rejectedBrazil, crypto).execute({
        name: 'Empresa X',
        document: '11.222.333/0001-81',
      }),
    ).rejects.toThrow(/não encontrado|ATIVA/i);
  });

  it('marca APPROVED ESG (validação local determinística, sem SERPRO)', async () => {
    const producer = await createProducer.execute({
      name: 'Risco',
      document: '100.000.002-80',
    });
    expect(producer.esgStatus).toBe('APPROVED');
  });

  it('rejeita documento duplicado (conflict)', async () => {
    await createProducer.execute({
      name: 'Primeiro',
      document: '529.982.247-25',
    });
    await expect(
      createProducer.execute({
        name: 'Segundo',
        document: '529.982.247-25',
      }),
    ).rejects.toThrow(/existe|Já existe|documento/i);
  });

  it('persiste PENDING_EXTERNAL_VALIDATION quando BrasilAPI indisponível (CNPJ)', async () => {
    const offline: BrazilDataServiceInterface = {
      getCnpjData: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
      isCityInState: async () => ({ outcome: 'PENDING_EXTERNAL_VALIDATION' }),
      listCitiesByState: async () => ({
        outcome: 'PENDING_EXTERNAL_VALIDATION',
      }),
    };
    const producer = await buildCreateProducer(
      repository,
      offline,
      crypto,
    ).execute({
      name: 'Offline',
      document: '11.222.333/0001-81',
    });
    expect(producer.documentValidationStatus).toBe(
      'PENDING_EXTERNAL_VALIDATION',
    );
    expect(producer.esgStatus).toBe('WARNING');
  });
});
