import { Producer } from '../../domain/entities/producer.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { CreateProducerUseCase } from './create-producer.use-case.js';
import { DeleteProducerUseCase } from './delete-producer.use-case.js';

class InMemoryProducerRepository implements IProducerRepository {
  private readonly items = new Map<string, Producer>();

  public constructor(private readonly crypto: CryptoService) {}

  public async save(producer: Producer): Promise<Producer> {
    this.items.set(producer.id, producer);
    return producer;
  }

  public async update(producer: Producer): Promise<Producer> {
    this.items.set(producer.id, producer);
    return producer;
  }

  public async findById(id: string): Promise<Producer | null> {
    const producer = this.items.get(id);
    if (!producer || producer.isDeleted) {
      return null;
    }
    return producer;
  }

  public async findByDocumentHash(
    documentHash: string,
  ): Promise<Producer | null> {
    for (const producer of this.items.values()) {
      if (
        !producer.isDeleted &&
        this.crypto.blindIndex(producer.document.value) === documentHash
      ) {
        return producer;
      }
    }
    return null;
  }

  public async findAll(): Promise<Producer[]> {
    return [...this.items.values()].filter((p) => !p.isDeleted);
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    const producer = this.items.get(id);
    if (producer) {
      producer.softDelete(deletedAt);
    }
  }
}

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
    const listed = await repository.findAll();
    expect(listed).toHaveLength(0);
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

    const useCase = new CreateProducerUseCase(
      repository,
      inactiveBrazil,
      crypto,
    );

    await expect(
      useCase.execute({
        name: 'Empresa X',
        document: '11.222.333/0001-81',
      }),
    ).rejects.toThrow(/ATIVA/);
  });
});
