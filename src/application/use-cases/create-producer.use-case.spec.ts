import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { InMemoryProducerRepository } from '../../testing/in-memory-producer.repository.js';
import { CreateProducerUseCase } from './create-producer.use-case.js';
import { DeleteProducerUseCase } from './delete-producer.use-case.js';

describe('Producer use cases', () => {
  const crypto = new CryptoService(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'change-me-pepper-secret-min-16',
  );

  const brazilData: BrazilDataServiceInterface = {
    getCnpjData: async () => null,
    isCityInState: async () => true,
  };

  let repository: InMemoryProducerRepository;
  let createProducer: CreateProducerUseCase;
  let deleteProducer: DeleteProducerUseCase;

  beforeEach(() => {
    repository = new InMemoryProducerRepository(crypto);
    createProducer = new CreateProducerUseCase(
      repository,
      brazilData,
      crypto,
    );
    deleteProducer = new DeleteProducerUseCase(repository);
  });

  it('cria produtor com CPF válido', async () => {
    const producer = await createProducer.execute({
      name: 'João Silva',
      document: '529.982.247-25',
    });

    expect(producer.name).toBe('João Silva');
    expect(producer.document.value).toBe('52998224725');
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
        cnpj: '11222333000181',
        razaoSocial: 'Empresa X',
        situacaoCadastral: 'BAIXADA',
        isActive: false,
      }),
      isCityInState: async () => true,
    };

    await expect(
      new CreateProducerUseCase(repository, inactiveBrazil, crypto).execute({
        name: 'Empresa X',
        document: '11.222.333/0001-81',
      }),
    ).rejects.toThrow(/ATIVA/);
  });
});
