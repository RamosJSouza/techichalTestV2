import { Farm } from '../entities/farm.js';

export const FARM_REPOSITORY = Symbol('FARM_REPOSITORY');

export interface IFarmRepository {
  save(farm: Farm): Promise<Farm>;
  findById(id: string): Promise<Farm | null>;
  findByProducerId(producerId: string): Promise<Farm[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
  softDeleteByProducerId(producerId: string, deletedAt: Date): Promise<void>;
}
