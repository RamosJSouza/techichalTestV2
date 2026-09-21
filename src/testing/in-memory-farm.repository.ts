import { Farm } from '../domain/entities/farm.js';
import { ConflictException } from '../domain/exceptions/conflict.exception.js';
import type {
  FarmUpdateOptions,
  IFarmRepository,
} from '../domain/repositories/farm.repository.js';

export class InMemoryFarmRepository implements IFarmRepository {
  public readonly items: Farm[] = [];
  /** Timestamp persistido (não a referência de domínio já mutada por touch()). */
  private readonly persistedUpdatedAtMs = new Map<string, number>();

  public async save(farm: Farm): Promise<Farm> {
    this.items.push(farm);
    this.persistedUpdatedAtMs.set(farm.id, farm.updatedAt.getTime());
    return farm;
  }

  public async update(
    farm: Farm,
    opts?: FarmUpdateOptions,
  ): Promise<Farm> {
    const index = this.items.findIndex((item) => item.id === farm.id);
    if (index < 0) {
      throw new ConflictException(
        'Fazenda foi alterada por outra requisição. Recarregue e tente novamente.',
      );
    }
    if (opts?.expectedUpdatedAt !== undefined) {
      const persisted = this.persistedUpdatedAtMs.get(farm.id);
      if (
        persisted === undefined ||
        persisted !== opts.expectedUpdatedAt.getTime()
      ) {
        throw new ConflictException(
          'Fazenda foi alterada por outra requisição. Recarregue e tente novamente.',
        );
      }
    }
    this.items[index] = farm;
    this.persistedUpdatedAtMs.set(farm.id, farm.updatedAt.getTime());
    return farm;
  }

  public async findById(id: string): Promise<Farm | null> {
    return this.items.find((farm) => farm.id === id && !farm.isDeleted) ?? null;
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    this.items.find((farm) => farm.id === id)?.softDelete(deletedAt);
    this.persistedUpdatedAtMs.set(id, deletedAt.getTime());
  }

  public async findPendingTerritorialIds(limit: number): Promise<string[]> {
    return this.items
      .filter(
        (f) =>
          !f.isDeleted &&
          f.territorialValidationStatus === 'PENDING_EXTERNAL_VALIDATION',
      )
      .sort(
        (a, b) =>
          (a.territorialValidationPendingAt?.getTime() ?? 0) -
          (b.territorialValidationPendingAt?.getTime() ?? 0),
      )
      .slice(0, limit)
      .map((f) => f.id);
  }
}
