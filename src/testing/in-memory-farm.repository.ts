import { Farm } from '../domain/entities/farm.js';
import type {
  FarmUpdateOptions,
  IFarmRepository,
} from '../domain/repositories/farm.repository.js';

export class InMemoryFarmRepository implements IFarmRepository {
  public readonly items: Farm[] = [];

  public async save(farm: Farm): Promise<Farm> {
    this.items.push(farm);
    return farm;
  }

  public async update(
    farm: Farm,
    _opts?: FarmUpdateOptions,
  ): Promise<Farm> {
    const index = this.items.findIndex((item) => item.id === farm.id);
    if (index >= 0) {
      this.items[index] = farm;
    }
    return farm;
  }

  public async findById(id: string): Promise<Farm | null> {
    return this.items.find((farm) => farm.id === id && !farm.isDeleted) ?? null;
  }

  public async softDelete(id: string, deletedAt: Date): Promise<void> {
    this.items.find((farm) => farm.id === id)?.softDelete(deletedAt);
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
