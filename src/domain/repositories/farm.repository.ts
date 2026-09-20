import { Farm } from '../entities/farm.js';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');

export interface FarmUpdateOptions {
  /** Indica se as safras mudaram (pula delete+insert quando false). Default: true. */
  harvestsChanged?: boolean;
}

export interface IFarmRepository {
  save(farm: Farm): Promise<Farm>;
  update(farm: Farm, opts?: FarmUpdateOptions): Promise<Farm>;
  findById(id: string): Promise<Farm | null>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  findPendingTerritorialIds(limit: number): Promise<string[]>;
}
