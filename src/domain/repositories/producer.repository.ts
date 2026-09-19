import { Producer } from '../entities/producer.js';

export const PRODUCER_REPOSITORY = Symbol('PRODUCER_REPOSITORY');

export interface IProducerRepository {
  save(producer: Producer): Promise<Producer>;
  update(producer: Producer): Promise<Producer>;
  findById(id: string): Promise<Producer | null>;
  findByDocumentHash(documentHash: string): Promise<Producer | null>;
  findAll(): Promise<Producer[]>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
}
