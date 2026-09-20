import { Producer } from '../entities/producer.js';

export const PRODUCER_REPOSITORY = Symbol('PRODUCER_REPOSITORY');

export type ProducerSortBy = 'createdAt' | 'name';
export type ProducerSortOrder = 'asc' | 'desc';

export interface ProducerListQuery {
  page: number;
  pageSize: number;
  sortBy: ProducerSortBy;
  sortOrder: ProducerSortOrder;
  name?: string;
}

export interface ProducerListResult {
  items: Producer[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IProducerRepository {
  save(producer: Producer): Promise<Producer>;
  update(producer: Producer): Promise<Producer>;
  findById(id: string): Promise<Producer | null>;
  findByDocumentHash(documentHash: string): Promise<Producer | null>;
  findAll(): Promise<Producer[]>;
  findMany(query: ProducerListQuery): Promise<ProducerListResult>;
  softDelete(id: string, deletedAt: Date): Promise<void>;
}
