import { Farm } from '../../domain/entities/farm.js';
import { Producer } from '../../domain/entities/producer.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import { CreateFarmUseCase } from './create-farm.use-case.js';
import { CreateProducerUseCase } from './create-producer.use-case.js';

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
    this.items.get(id)?.softDelete(deletedAt);
  }
}

class InMemoryFarmRepository implements IFarmRepository {
  public readonly items: Farm[] = [];

  public async save(farm: Farm): Promise<Farm> {
    this.items.push(farm);
    return farm;
  }

  public async findById(id: string): Promise<Farm | null> {
    return this.items.find((f) => f.id === id && !f.isDeleted) ?? null;
  }

  public async findByProducerId(producerId: string): Promise<Farm[]> {
    return this.items.filter(
      (f) => f.producerId === producerId && !f.isDeleted,
    );
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    this.items.find((f) => f.id === id)?.softDelete(deletedAt);
  }

  public async softDeleteByProducerId(
    producerId: string,
    deletedAt: Date,
  ): Promise<void> {
    for (const farm of this.items) {
      if (farm.producerId === producerId && !farm.isDeleted) {
        farm.softDelete(deletedAt);
      }
    }
  }
}

describe('CreateFarmUseCase', () => {
  const crypto = new CryptoService(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'change-me-pepper-secret-min-16',
  );

  it('cria fazenda com validação territorial ok', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();
    const brazilData: BrazilDataServiceInterface = {
      getCnpjData: async () => null,
      isCityInState: async () => true,
    };

    const producer = await new CreateProducerUseCase(
      producerRepo,
      brazilData,
      crypto,
    ).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    const farm = await new CreateFarmUseCase(
      farmRepo,
      producerRepo,
      brazilData,
    ).execute({
      producerId: producer.id,
      name: 'Santa Maria',
      city: 'Ribeirão Preto',
      state: 'SP',
      totalArea: 1000,
      arableArea: 600,
      vegetationArea: 350,
      harvests: [{ year: '2025/2026', crops: ['Soja', 'Milho'] }],
    });

    expect(farm.state).toBe('SP');
    expect(farm.harvests).toHaveLength(1);
  });

  it('rejeita cidade fora do estado', async () => {
    const producerRepo = new InMemoryProducerRepository(crypto);
    const farmRepo = new InMemoryFarmRepository();
    const brazilData: BrazilDataServiceInterface = {
      getCnpjData: async () => null,
      isCityInState: async () => false,
    };

    const producer = await new CreateProducerUseCase(
      producerRepo,
      { getCnpjData: async () => null, isCityInState: async () => true },
      crypto,
    ).execute({
      name: 'João',
      document: '529.982.247-25',
    });

    await expect(
      new CreateFarmUseCase(farmRepo, producerRepo, brazilData).execute({
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
