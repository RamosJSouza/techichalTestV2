import { Producer } from '../../domain/entities/producer.js';
import type {
  IProducerRepository,
  ProducerListItem,
  ProducerListQuery,
  ProducerListResult,
} from '../../domain/repositories/producer.repository.js';
import { CryptoService } from '../../infrastructure/crypto/crypto.service.js';

function toListItem(producer: Producer): ProducerListItem {
  const states = [
    ...new Set(producer.farms.map((farm) => farm.state)),
  ].sort();
  return {
    id: producer.id,
    name: producer.name,
    documentDigits: producer.document.value,
    esgStatus: producer.esgStatus,
    esgCheckedAt: producer.esgCheckedAt,
    documentValidationStatus: producer.documentValidationStatus,
    farmsCount: producer.farms.length,
    farmStates: states,
    totalAreaHa: producer.farms.reduce(
      (acc, farm) => acc + farm.area.totalArea,
      0,
    ),
    arableAreaHa: producer.farms.reduce(
      (acc, farm) => acc + farm.area.arableArea,
      0,
    ),
    vegetationAreaHa: producer.farms.reduce(
      (acc, farm) => acc + farm.area.vegetationArea,
      0,
    ),
  };
}

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

  public async findMany(query: ProducerListQuery): Promise<ProducerListResult> {
    let items = await this.findAll();
    if (query.name) {
      const needle = query.name.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(needle));
    }
    items.sort((a, b) => {
      const av = query.sortBy === 'name' ? a.name : a.createdAt.toISOString();
      const bv = query.sortBy === 'name' ? b.name : b.createdAt.toISOString();
      const cmp = av < bv ? -1 : av > bv ? 1 : a.id.localeCompare(b.id);
      return query.sortOrder === 'asc' ? cmp : -cmp;
    });
    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    return {
      items: items.slice(start, start + query.pageSize).map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    this.items.get(id)?.softDelete(deletedAt);
  }
}
