import { Producer } from '../../domain/entities/producer.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';

export class InMemoryProducerRepository implements IProducerRepository {
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
    return [...this.items.values()].filter((producer) => !producer.isDeleted);
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    this.items.get(id)?.softDelete(deletedAt);
  }
}
