import { Farm } from '../entities/farm.js';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');

export interface FarmUpdateOptions {
  /**
   * Quando true, substitui safras/culturas (delete+insert atômico).
   * Default: false (não toca harvests — seguro sob concorrência / revalidação).
   */
  harvestsChanged?: boolean;
  /**
   * Optimistic lock: exige que `farms.updated_at` ainda seja este valor
   * (capturado antes das mutações de domínio). Ausente = sem checagem.
   */
  expectedUpdatedAt?: Date;
}

export interface IFarmRepository {
  save(farm: Farm): Promise<Farm>;
  update(farm: Farm, opts?: FarmUpdateOptions): Promise<Farm>;
  findById(id: string): Promise<Farm | null>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  findPendingTerritorialIds(limit: number): Promise<string[]>;
}
